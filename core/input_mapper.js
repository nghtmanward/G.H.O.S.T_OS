class InputMapper {
  constructor() {
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseSpeed = 0;
    this.mouseDirectionChange = 0;

    this.keypressCount = 0;
    this.clickCount = 0;
    this.scrollIntensity = 0;

    this.idleTime = 0;
    this.focused = true;

    // --- NEW: visual sensory defaults ---
    this.visual = {
      brightness: 0,
      motion: 0,
      edges: 0,
      entropy: 0
    };

    setInterval(() => {
      this.idleTime += 0.1;
    }, 100);
  }

  // --- NEW: update visual sensory input ---
  updateVisual(data) {
  if (!data) return;

  this.visual = {
    brightness: Number.isFinite(data.brightness) ? data.brightness : 0,
    motion:     Number.isFinite(data.motion)     ? data.motion     : 0,
    edges:      Number.isFinite(data.edges)      ? data.edges      : 0,
    entropy:    Number.isFinite(data.entropy)    ? data.entropy    : 0
  };
}



  updateMouse(x, y) {
    const dx = x - this.lastMouseX;
    const dy = y - this.lastMouseY;

    const speed = Math.sqrt(dx*dx + dy*dy);
    this.mouseSpeed = Math.min(1, speed / 50);

    const direction = Math.atan2(dy, dx);
    const lastDirection = Math.atan2(
      this.lastMouseY - (this.lastMouseY - dy),
      this.lastMouseX - (this.lastMouseX - dx)
    );

    this.mouseDirectionChange = Math.min(1, Math.abs(direction - lastDirection) / Math.PI);

    this.lastMouseX = x;
    this.lastMouseY = y;

    this.idleTime = 0;
  }

  updateKeypress() {
    this.keypressCount = Math.min(1, this.keypressCount + 0.1);
    this.idleTime = 0;
  }

  updateClick() {
    this.clickCount = Math.min(1, this.clickCount + 0.2);
    this.idleTime = 0;
  }

  updateScroll(delta) {
    this.scrollIntensity = Math.min(1, Math.abs(delta) / 200);
    this.idleTime = 0;
  }

  setFocus(state) {
    this.focused = state;
  }

  decay() {
    this.keypressCount *= 0.9;
    this.clickCount *= 0.8;
    this.scrollIntensity *= 0.85;
  }

  getVector() {
    this.decay();

    return [
      this.mouseSpeed,                 // 0
      this.mouseDirectionChange,       // 1
      this.keypressCount,              // 2
      Math.min(1, this.idleTime / 10), // 3
      this.focused ? 1 : 0,            // 4
      this.clickCount,                 // 5
      this.scrollIntensity,            // 6
      1,                               // 7 heartbeat

      // --- NEW VISUAL SENSORY INPUT ---
      this.visual.brightness,          // 8
      this.visual.motion,              // 9
      this.visual.edges,               // 10
      this.visual.entropy              // 11
    ];
  }
}

module.exports = InputMapper;