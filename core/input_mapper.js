class InputMapper {
  constructor() {
    // ---------------------------------------------------------
    // VERSIONING (Dynamic, registry-driven)
    // ---------------------------------------------------------
    try {
      this.registry = require("./version_registry.js");
      this.version = "1.0.0-2026.01.08";
    } catch (e) {
      console.warn(
        "InputMapper: version_registry.js missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
      this.version = "unknown";
    }

    this._validateVersion();

    // ---------------------------------------------------------
    // INTERNAL STATE
    // ---------------------------------------------------------
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseSpeed = 0;
    this.mouseDirectionChange = 0;
    this.keypressCount = 0;
    this.clickCount = 0;
    this.scrollIntensity = 0;
    this.idleTime = 0;
    this.focused = true;

    // Idle timer (safe)
    setInterval(() => {
      this.idleTime = Math.min(9999, this.idleTime + 0.1);
    }, 100);
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["InputMapper"];
    if (!expected) {
      console.warn(
        "InputMapper: No 'InputMapper' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `InputMapper version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in InputMapper");
    }
  }

  // ---------------------------------------------------------
  // SAFE HELPERS
  // ---------------------------------------------------------
  safeVal(v, fallback = 0) {
    return Number.isFinite(v) ? v : fallback;
  }

  // ---------------------------------------------------------
  // MOUSE INPUT
  // ---------------------------------------------------------
  updateMouse(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const dx = x - this.lastMouseX;
    const dy = y - this.lastMouseY;
    const speed = Math.sqrt(dx * dx + dy * dy);

    this.mouseSpeed = Math.min(1, this.safeVal(speed / 50));

    const direction = Math.atan2(dy, dx);
    const lastDirection = Math.atan2(this.lastMouseY, this.lastMouseX);
    const diff = Math.abs(direction - lastDirection);
    this.mouseDirectionChange = Math.min(1, this.safeVal(diff / Math.PI));

    this.lastMouseX = x;
    this.lastMouseY = y;
    this.idleTime = 0;
  }

  // ---------------------------------------------------------
  // KEYBOARD / CLICK / SCROLL / FOCUS
  // ---------------------------------------------------------
  updateKeypress() {
    this.keypressCount = Math.min(1, this.keypressCount + 0.1);
    this.idleTime = 0;
  }

  updateClick() {
    this.clickCount = Math.min(1, this.clickCount + 0.2);
    this.idleTime = 0;
  }

  updateScroll(delta) {
    if (!Number.isFinite(delta)) return;
    this.scrollIntensity = Math.min(1, Math.abs(delta) / 200);
    this.idleTime = 0;
  }

  setFocus(state) {
    this.focused = !!state;
    this.idleTime = 0;
  }

  // ---------------------------------------------------------
  // DECAY
  // ---------------------------------------------------------
  decay() {
    this.keypressCount *= 0.9;
    this.clickCount *= 0.8;
    this.scrollIntensity *= 0.85;
    this.mouseSpeed *= 0.9;
    this.mouseDirectionChange *= 0.9;
  }

  // ---------------------------------------------------------
  // OUTPUT VECTOR
  // ---------------------------------------------------------
  getVector() {
    this.decay();

    const vec = [
      this.safeVal(this.mouseSpeed),                 // 0 mouse speed
      this.safeVal(this.mouseDirectionChange),       // 1 mouse direction change
      this.safeVal(this.keypressCount),              // 2 keypress count
      Math.min(1, this.safeVal(this.idleTime / 10)), // 3 idle normalized
      this.focused ? 1 : 0,                          // 4 focused
      this.safeVal(this.clickCount),                 // 5 click count
      this.safeVal(this.scrollIntensity),            // 6 scroll intensity
      1,                                             // 7 heartbeat
      0,                                             // 8 brightness
      0,                                             // 9 motion
      0,                                             // 10 edges
      0                                              // 11 entropy
    ];

    this._validateOutput(vec);
    return {
      version: this.version,
      vector: vec
    };
  }

  // ---------------------------------------------------------
  // OUTPUT VALIDATION
  // ---------------------------------------------------------
  _validateOutput(vec) {
    if (!Array.isArray(vec)) {
      throw new Error("InputMapper: output vector is not an array");
    }

    for (let v of vec) {
      if (!Number.isFinite(v)) {
        throw new Error("InputMapper: output vector contains invalid values");
      }
    }
  }
}

module.exports = InputMapper;
