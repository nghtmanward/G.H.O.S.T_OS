class InputMapper {
  constructor() {
    // ---------------------------------------------------------
    // VERSIONING (Hybrid Semantic + Date)
    // ---------------------------------------------------------
    this.version = "1.0.0-2026.01.08";

    try {
      this.registry = require("../version_registry.json");
    } catch (e) {
      console.warn(
        "InputMapper: version_registry.json missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
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

    this.visual = {
      brightness: 0,
      motion: 0,
      edges: 0,
      entropy: 0
    };

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
  // VISUAL INPUT
  // ---------------------------------------------------------
  updateVisual(data) {
    if (!data || typeof data !== "object") return;

    this.visual = {
      brightness: this.safeVal(data.brightness),
      motion: this.safeVal(data.motion),
      edges: this.safeVal(data.edges),
      entropy: this.safeVal(data.entropy)
    };
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
    const lastDirection = Math.atan2(
      this.lastMouseY - (this.lastMouseY - dy),
      this.lastMouseX - (this.lastMouseX - dx)
    );

    const diff = Math.abs(direction - lastDirection);
    this.mouseDirectionChange = Math.min(1, this.safeVal(diff / Math.PI));

    this.lastMouseX = x;
    this.lastMouseY = y;

    this.idleTime = 0;
  }

  // ---------------------------------------------------------
  // KEYBOARD / CLICK / SCROLL
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
  }

  // ---------------------------------------------------------
  // DECAY
  // ---------------------------------------------------------
  decay() {
    this.keypressCount *= 0.9;
    this.clickCount *= 0.8;
    this.scrollIntensity *= 0.85;
  }

  // ---------------------------------------------------------
  // OUTPUT VECTOR
  // ---------------------------------------------------------
  getVector() {
    this.decay();

    const vec = [
      this.safeVal(this.mouseSpeed),                 // 0
      this.safeVal(this.mouseDirectionChange),       // 1
      this.safeVal(this.keypressCount),              // 2
      Math.min(1, this.safeVal(this.idleTime / 10)), // 3
      this.focused ? 1 : 0,                          // 4
      this.safeVal(this.clickCount),                 // 5
      this.safeVal(this.scrollIntensity),            // 6
      1,                                             // 7 heartbeat

      this.safeVal(this.visual.brightness),          // 8
      this.safeVal(this.visual.motion),              // 9
      this.safeVal(this.visual.edges),               // 10
      this.safeVal(this.visual.entropy)              // 11
    ];

    this._validateOutput(vec);
    return { version: this.version, vector: vec };
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