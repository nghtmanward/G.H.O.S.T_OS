let VisualSensoryEngine;

describe("VisualSensoryEngine", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      VisualSensoryEngine: "1.0.0-2026.01.08"
    }));
    VisualSensoryEngine = require("./visual_sensory_engine");
  });

  // ---------------------------------------------------------
  // constructor + version validation
  // ---------------------------------------------------------
  test("constructor throws on version mismatch", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      VisualSensoryEngine: "WRONG"
    }));

    const BadVSE = require("./visual_sensory_engine");
    expect(() => new BadVSE()).toThrow("Version mismatch");
  });

  // ---------------------------------------------------------
  // safe helpers
  // ---------------------------------------------------------
  test("safeVal returns fallback for invalid values", () => {
    const vs = new VisualSensoryEngine();
    expect(vs.safeVal(NaN, 5)).toBe(5);
    expect(vs.safeVal("x", 3)).toBe(3);
  });

  test("safePixel returns 0 for invalid pixel index", () => {
    const vs = new VisualSensoryEngine();
    const pixels = [10, 20, 30];
    expect(vs.safePixel(pixels, 10)).toBe(0);
  });

  // ---------------------------------------------------------
  // downsampleToGray
  // ---------------------------------------------------------
  test("downsampleToGray computes grayscale values", () => {
    const vs = new VisualSensoryEngine();

    // 2x2 image, RGBA pixels
    const pixels = [
      255, 0, 0, 255,   // red
      0, 255, 0, 255,   // green
      0, 0, 255, 255,   // blue
      255, 255, 255, 255 // white
    ];

    const gray = vs.downsampleToGray(pixels, 2, 2, 2);

    expect(gray.length).toBe(4);
    expect(gray[0]).toBeCloseTo((255 + 0 + 0) / 3 / 255);
  });

  // ---------------------------------------------------------
  // computeBrightness
  // ---------------------------------------------------------
  test("computeBrightness averages grayscale values", () => {
    const vs = new VisualSensoryEngine();
    const brightness = vs.computeBrightness([0.5, 0.5, 0.5]);
    expect(brightness).toBeCloseTo(0.5);
  });

  test("computeBrightness returns 0 for empty array", () => {
    const vs = new VisualSensoryEngine();
    expect(vs.computeBrightness([])).toBe(0);
  });

  // ---------------------------------------------------------
  // computeMotion
  // ---------------------------------------------------------
  test("computeMotion returns 0 on first frame", () => {
    const vs = new VisualSensoryEngine();
    const motion = vs.computeMotion([0.1, 0.2, 0.3]);
    expect(motion).toBe(0);
  });

  test("computeMotion detects change between frames", () => {
    const vs = new VisualSensoryEngine();

    vs.computeMotion([0.1, 0.1, 0.1]); // first frame → motion=0
    const motion = vs.computeMotion([0.9, 0.9, 0.9]);

    expect(motion).toBeGreaterThan(0);
    expect(motion).toBeLessThanOrEqual(1);
  });

  // ---------------------------------------------------------
  // computeEdgeDensity
  // ---------------------------------------------------------
  test("computeEdgeDensity returns variance", () => {
    const vs = new VisualSensoryEngine();
    const edges = vs.computeEdgeDensity([0, 1]);
    expect(edges).toBeGreaterThan(0);
  });

  test("computeEdgeDensity returns 0 for empty array", () => {
    const vs = new VisualSensoryEngine();
    expect(vs.computeEdgeDensity([])).toBe(0);
  });

  // ---------------------------------------------------------
  // computeEntropy
  // ---------------------------------------------------------
  test("computeEntropy returns normalized entropy", () => {
    const vs = new VisualSensoryEngine();
    const entropy = vs.computeEntropy([0, 0.5, 1]);
    expect(entropy).toBeGreaterThan(0);
    expect(entropy).toBeLessThanOrEqual(1);
  });

  test("computeEntropy returns 0 for empty array", () => {
    const vs = new VisualSensoryEngine();
    expect(vs.computeEntropy([])).toBe(0);
  });

  // ---------------------------------------------------------
  // processFrame
  // ---------------------------------------------------------
  test("processFrame returns fallback for invalid input", () => {
    const vs = new VisualSensoryEngine();
    const out = vs.processFrame(null, 0, 0);

    expect(out.brightness).toBe(0);
    expect(out.motion).toBe(0);
    expect(out.edges).toBe(0);
    expect(out.entropy).toBe(0);
  });

  test("processFrame returns valid sensory metrics", () => {
    const vs = new VisualSensoryEngine();

    const pixels = new Array(4 * 4 * 4).fill(128); // 4x4 gray image
    const out = vs.processFrame(pixels, 4, 4);

    expect(out.brightness).toBeGreaterThan(0);
    expect(out.motion).toBe(0); // first frame
    expect(out.edges).toBeGreaterThanOrEqual(0);
    expect(out.entropy).toBeGreaterThanOrEqual(0);
  });

  // ---------------------------------------------------------
  // output validation
  // ---------------------------------------------------------
  test("_validateOutput throws on invalid numeric fields", () => {
    const vs = new VisualSensoryEngine();

    expect(() =>
      vs._validateOutput({ brightness: "x", motion: 0, edges: 0, entropy: 0 })
    ).toThrow("invalid numeric field 'brightness'");
  });
});
