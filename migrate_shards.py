"""
GHOSTRA Shard Migration Script
Migrates episodic-shard-v1 to ghostra-shard-v2

What this does:
  - Strips legacy-episodic entries (mnist_digit, etc.)
  - Deduplicates episodes by text
  - Collapses style dict to dominantStyle string
  - Strips traits array
  - Adds weight, decayRate, lastAccessed, type, id, sourceModel fields
  - Rewrites summary block
  - Backs up originals to memory/backup/ before touching anything

Usage:
  cd C:\\GHOST_OS
  python migrate_shards.py
"""

import os
import json
import shutil
import glob
from datetime import datetime

SHARD_DIR = r"C:\GHOST_OS\memory"
BACKUP_DIR = r"C:\GHOST_OS\memory\backup"
DRY_RUN = True  # Set True to preview without writing


def dominant_style(style_val):
    if isinstance(style_val, dict) and style_val:
        return max(style_val, key=style_val.get)
    if isinstance(style_val, str):
        return style_val
    return "poetic"


def is_noise(ep):
    text = ep.get("text", "").strip()
    if not text:
        return True
    if text.startswith("mnist_digit"):
        return True
    if ep.get("schema") == "legacy-episodic":
        return True
    if ep.get("version") == "legacy":
        return True
    return False


def migrate_episode(ep, index, shard_index):
    text = ep.get("text", "").strip()
    mood = ep.get("mood", "neutral")
    anomaly = round(float(ep.get("anomaly", 0)), 4)
    latent_mag = round(float(ep.get("latentMag", 0)), 4)
    timestamp = ep.get("timestamp", 0)
    style_raw = ep.get("style", {})
    dom_style = dominant_style(style_raw)

    return {
        "id": f"s{shard_index:03d}_ep{index:04d}",
        "text": text,
        "mood": mood,
        "anomaly": anomaly,
        "dominantStyle": dom_style,
        "latentMag": latent_mag,
        "timestamp": timestamp,
        "type": "cognitive",
        "weight": 1.0,
        "decayRate": 0.01,
        "lastAccessed": timestamp,
        "sourceModel": "bonsai"
    }


def migrate_shard(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    shard_index = data.get("index", 0)
    episodes_raw = data.get("episodes", [])

    # Filter noise
    clean = [ep for ep in episodes_raw if not is_noise(ep)]

    # Deduplicate by text
    seen = set()
    deduped = []
    for ep in clean:
        text = ep.get("text", "").strip()
        if text and text not in seen:
            seen.add(text)
            deduped.append(ep)

    # Migrate each episode
    migrated = []
    for i, ep in enumerate(deduped):
        migrated.append(migrate_episode(ep, i, shard_index))

    # Build summary
    avg_anomaly = (
        round(sum(e["anomaly"] for e in migrated) / len(migrated), 4)
        if migrated else 0.0
    )

    styles = [e["dominantStyle"] for e in migrated]
    dominant_mood = max(
        set(e["mood"] for e in migrated),
        key=lambda m: sum(1 for e in migrated if e["mood"] == m)
    ) if migrated else "neutral"

    dominant_sty = max(set(styles), key=styles.count) if styles else "poetic"

    timestamps = [e["timestamp"] for e in migrated if e["timestamp"]]
    timespan = (max(timestamps) - min(timestamps)) if len(timestamps) > 1 else 0

    new_shard = {
        "schema": "ghostra-shard-v2",
        "version": "2.0.0",
        "index": shard_index,
        "created": data.get("startTimestamp", 0),
        "updated": int(datetime.now().timestamp() * 1000),
        "count": len(migrated),
        "episodes": migrated,
        "summary": {
            "avgAnomaly": avg_anomaly,
            "dominantMood": dominant_mood,
            "dominantStyle": dominant_sty,
            "uniqueThoughts": len(migrated),
            "timespan": timespan
        },
        "semanticSummary": None,
        "provenanceHash": None
    }

    return new_shard


def main():
    print("=" * 60)
    print(" GHOSTRA Shard Migration v1 → v2")
    print(f" Shard dir : {SHARD_DIR}")
    print(f" Backup dir: {BACKUP_DIR}")
    print(f" Dry run   : {DRY_RUN}")
    print("=" * 60)

    shard_files = sorted(glob.glob(os.path.join(SHARD_DIR, "shard_*.json")))

    if not shard_files:
        print("No shard files found.")
        return

    print(f"\nFound {len(shard_files)} shard files.\n")

    # Create backup directory
    if not DRY_RUN:
        os.makedirs(BACKUP_DIR, exist_ok=True)

    total_before = 0
    total_after = 0
    total_noise = 0
    total_dupes = 0

    for filepath in shard_files:
        filename = os.path.basename(filepath)

        with open(filepath, "r", encoding="utf-8") as f:
            original = json.load(f)

        episodes_raw = original.get("episodes", [])
        before_count = len(episodes_raw)

        # Count noise
        noise = [ep for ep in episodes_raw if is_noise(ep)]
        clean = [ep for ep in episodes_raw if not is_noise(ep)]

        # Count dupes
        seen = set()
        deduped = []
        for ep in clean:
            text = ep.get("text", "").strip()
            if text and text not in seen:
                seen.add(text)
                deduped.append(ep)

        after_count = len(deduped)
        noise_count = len(noise)
        dupe_count = len(clean) - after_count

        total_before += before_count
        total_after += after_count
        total_noise += noise_count
        total_dupes += dupe_count

        print(f"  {filename}")
        print(f"    Before  : {before_count} episodes")
        print(f"    Noise   : {noise_count} removed")
        print(f"    Dupes   : {dupe_count} removed")
        print(f"    After   : {after_count} unique episodes")

        if not DRY_RUN:
            # Backup original
            backup_path = os.path.join(BACKUP_DIR, filename)
            shutil.copy2(filepath, backup_path)

            # Migrate and write
            new_shard = migrate_shard(filepath)
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(new_shard, f, indent=2, ensure_ascii=False)

            print(f"    ✓ Migrated and saved")
        else:
            print(f"    [DRY RUN] Would migrate")

        print()

    print("=" * 60)
    print(f" TOTAL BEFORE : {total_before} episodes")
    print(f" NOISE REMOVED: {total_noise}")
    print(f" DUPES REMOVED: {total_dupes}")
    print(f" TOTAL AFTER  : {total_after} unique episodes")
    print(f" REDUCTION    : {round((1 - total_after/total_before)*100, 1)}%" if total_before else "")
    print("=" * 60)

    if DRY_RUN:
        print("\n[DRY RUN] No files were modified.")
        print("Set DRY_RUN = False to apply migration.")
    else:
        print(f"\nBackups saved to: {BACKUP_DIR}")
        print("Migration complete.")


if __name__ == "__main__":
    main()