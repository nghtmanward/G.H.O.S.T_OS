const fs = require("fs");
const path = require("path");

class Persistence {
  constructor(filename = "ghost_memory.json") {
    // ---------------------------------------------------------
    // VERSIONING (Hybrid Semantic + Date)
    // ---------------------------------------------------------
    this.version = "1.1.0-2026.01.08"; // bumped for schema-aware upgrade
    this.schema = "ghost-state-v1";

    try {
      this.registry = require("../version_registry.json");
    } catch (e) {
      console.warn(
        "Persistence: version_registry.json missing or unreadable. Proceeding without registry validation."
      );
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
      console.warn(
        "Persistence: No 'Persistence' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `Persistence version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in Persistence");
    }
  }

  // ---------------------------------------------------------
  // SAVE (atomic, safe, schema-aware)
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
    } catch (err) {
      console.error("❌ Error saving ghost memory:", err);
    }
  }

  // ---------------------------------------------------------
  // LOAD (safe, corruption-proof, backward-compatible)
  // ---------------------------------------------------------
  load() {
    try {
      if (!fs.existsSync(this.filePath)) return null;

      const data = fs.readFileSync(this.filePath, "utf8");

      try {
        const parsed = JSON.parse(data);

        // CASE 1: New schema-wrapped format
        if (parsed && typeof parsed === "object" && parsed.state !== undefined) {
          return this.migrateIfNeeded(parsed);
        }

        // CASE 2: Legacy format (bare state object)
        // Wrap it on the fly so the rest of the system can treat it uniformly.
        return this.migrateIfNeeded({
          schema: "legacy-ghost-state",
          version: "legacy",
          timestamp: Date.now(),
          state: parsed
        });
      } catch (parseErr) {
        console.error("⚠️ Corrupted ghost memory file. Attempting recovery…");

        if (fs.existsSync(this.tempPath)) {
          try {
            const backup = fs.readFileSync(this.tempPath, "utf8");
            const parsedBackup = JSON.parse(backup);

            if (parsedBackup && typeof parsedBackup === "object") {
              if (parsedBackup.state !== undefined) {
                return this.migrateIfNeeded(parsedBackup);
              }

              return this.migrateIfNeeded({
                schema: "legacy-ghost-state",
                version: "legacy",
                timestamp: Date.now(),
                state: parsedBackup
              });
            }
          } catch {
            console.error("❌ Backup also corrupted.");
          }
        }

        return null;
      }
    } catch (err) {
      console.error("❌ Error loading ghost memory:", err);
      return null;
    }
  }

  // ---------------------------------------------------------
  // MIGRATION HOOK
  // ---------------------------------------------------------
  migrateIfNeeded(wrapper) {
    if (!wrapper || typeof wrapper !== "object") return null;

    // You can branch by wrapper.schema here if you add future schemas.
    // For now, we just return the state as-is.
    //
    // Example of future use:
    // if (wrapper.schema === "legacy-ghost-state") {
    //   // e.g., normalize episodicMemory structure
    //   // episodicMemory.ingestLegacyEpisodes(wrapper.state.episodes)
    // }

    return wrapper.state || null;
  }

  // ---------------------------------------------------------
  // SANITIZE STATE (remove undefined, functions, circular refs)
  // ---------------------------------------------------------
  _sanitize(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      console.warn(
        "⚠️ State contained unserializable data. Saving minimal fallback."
      );
      return {};
    }
  }
}

module.exports = Persistence;