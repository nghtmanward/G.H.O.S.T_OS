const fs = require("fs");
const path = require("path");

class Persistence {
  constructor(filename = "ghost_memory.json") {
    // ---------------------------------------------------------
    // VERSIONING
    // ---------------------------------------------------------
    this.version = "1.1.0-2026.01.08";
    this.schema = "ghost-state-v1";

    try {
      this.registry = require("./version_registry.js");
    } catch (e) {
      console.warn("Persistence: version_registry missing. Proceeding without validation.");
      this.registry = null;
    }

    this._validateVersion();

    // ---------------------------------------------------------
    // FILE PATHS
    // ---------------------------------------------------------
    this.filePath = path.join(process.cwd(), filename);
    this.tempPath = this.filePath + ".tmp";
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;
    const expected = this.registry["Persistence"];
    if (!expected) {
      console.warn("Persistence: No 'Persistence' entry in version_registry.");
      return;
    }
    if (expected !== this.version) {
      console.error(`Persistence version mismatch: expected ${expected}, got ${this.version}`);
      throw new Error("Version mismatch in Persistence");
    }
  }

  // ---------------------------------------------------------
  // SANITIZE — strip unserializable values
  // ---------------------------------------------------------
  _sanitize(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      console.warn("Persistence: Could not sanitize state.", e);
      return {};
    }
  }

  // ---------------------------------------------------------
  // SAVE — atomic write via temp file
  // ---------------------------------------------------------
  save(state) {
    try {
      const safeState = this._sanitize(state);
      const wrapped = {
        schema: this.schema,
        version: this.version,
        timestamp: Date.now(),
        state: safeState
      };

      fs.writeFileSync(
        this.tempPath,
        JSON.stringify(wrapped, null, 2),
        "utf8"
      );

      fs.renameSync(this.tempPath, this.filePath);
      console.log(`[Persistence] Saved. Episodic=${safeState.episodic?.length || 0}, Shards=${safeState.shards?.length || 0}`);
    } catch (err) {
      console.error("[Persistence] Save failed:", err);
    }
  }

  // ---------------------------------------------------------
  // LOAD — reads ghost_memory.json, falls back to .tmp
  // ---------------------------------------------------------
  load() {
    // Try main file first
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(raw);

        if (parsed && typeof parsed === "object") {
          const result = this.migrateIfNeeded(parsed);
          console.log(`[Persistence] Loaded. Episodic=${result?.episodic?.length || 0}, Shards=${result?.shards?.length || 0}`);
          return result;
        }
      } catch (err) {
        console.error("[Persistence] Main file corrupted, trying backup:", err);
      }
    }

    // Fall back to temp file
    if (fs.existsSync(this.tempPath)) {
      try {
        const raw = fs.readFileSync(this.tempPath, "utf8");
        const parsed = JSON.parse(raw);

        if (parsed && typeof parsed === "object") {
          console.warn("[Persistence] Loaded from backup .tmp file.");
          return this.migrateIfNeeded(parsed);
        }
      } catch (err) {
        console.error("[Persistence] Backup file also corrupted:", err);
      }
    }

    console.warn("[Persistence] No valid memory file found. Starting fresh.");
    return null;
  }

  // ---------------------------------------------------------
  // MIGRATE — handles legacy format and current schema
  // ---------------------------------------------------------
  migrateIfNeeded(parsed) {
    if (!parsed || typeof parsed !== "object") return null;

    // Current schema — state is nested under .state
    if (parsed.schema === this.schema && parsed.state) {
      return parsed.state;
    }

    // Legacy schema — either a wrapper with .state but no/old schema tag,
    // or a fully flat legacy object with no wrapper at all
    if (parsed.schema === "legacy-ghost-state" || !parsed.schema) {
      if (parsed.state && typeof parsed.state === "object") {
        return parsed.state;
      }
      console.warn("[Persistence] Migrating legacy memory format.");
      return parsed;
    }

    // Unknown schema — attempt to extract what we can
    console.warn("[Persistence] Unknown schema, attempting partial recovery.");
    return {
      episodic: parsed.episodic || parsed.state?.episodic || [],
      shards: parsed.shards || parsed.state?.shards || []
    };
  }
}

module.exports = Persistence;