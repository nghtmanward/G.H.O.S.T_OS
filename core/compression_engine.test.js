// Default registry mock with correct version
jest.mock("./version_registry.js", () => ({
  Compression: "1.0.0-2026.01.08"
}));

const CompressionEngine = require("./compression_engine");

describe("CompressionEngine", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  // -----------------------------
  // Version validation
  // -----------------------------
  test("loads without registry file", () => {
    jest.doMock("./version_registry.js", () => null);
    const CE = require("./compression_engine");
    expect(() => new CE(8, 4)).not.toThrow();
  });

  test("throws on version mismatch", () => {
    jest.doMock("./version_registry.js", () => ({
      Compression: "WRONG-VERSION"
    }));
    const CE = require("./compression_engine");
    expect(() => new CE(8, 4)).toThrow("Version mismatch");
  });

  test("accepts correct version", () => {
    jest.doMock("./version_registry.js", () => ({
      Compression: "1.0.0-2026.01.08"
    }));
    const CE = require("./compression_engine");
    expect(() => new CE(8, 4)).not.toThrow();
  });

  // -----------------------------
  // _sanitizeInput
  // -----------------------------
  test("sanitizeInput clamps invalid values and pads to inputDim", () => {
    const eng = new CompressionEngine(5, 3);
    const input = [1, NaN, 2, Infinity];
    const clean = eng._sanitizeInput(input);

    expect(clean.length).toBe(5);
    expect(clean).toEqual([1, 0, 2, 0, 0]);
  });

  // -----------------------------
  // _normalize
  // -----------------------------
  test("_normalize returns unit-length vector and handles invalid values", () => {
    const eng = new CompressionEngine(4, 3);
    const vec = [3, 4, NaN];
    const norm = eng._normalize(vec);

    const mag = Math.sqrt(norm[0] ** 2 + norm[1] ** 2 + norm[2] ** 2);
    expect(mag).toBeCloseTo(1);
    expect(norm[2]).toBe(0);
  });

  // -----------------------------
  // ingest
  // -----------------------------
  test("ingest returns structured output with valid latent", () => {
    const eng = new CompressionEngine(8, 4);
    const input = Array(8).fill(0.5);

    const out = eng.ingest(input);

    expect(out.version).toBe(eng.version);
    expect(out.latent.length).toBe(4);
    out.latent.forEach(v => expect(Number.isFinite(v)).toBe(true));
    expect(out.recon.length).toBe(8);
    expect(out.prediction.length).toBe(8);
    expect(typeof out.loss).toBe("number");
    expect(typeof out.predLoss).toBe("number");
    expect(typeof out.anomaly).toBe("number");
    expect(out.latentHistory.length).toBe(1);
  });

  test("ingest with nextInput computes prediction loss and anomaly", () => {
    const eng = new CompressionEngine(8, 4);
    const input = Array(8).fill(0.2);
    const next = Array(8).fill(0.8);

    const out = eng.ingest(input, next);

    expect(out.predLoss).toBeGreaterThanOrEqual(0);
    expect(typeof out.anomaly).toBe("number");
    expect(eng.getPredictionLoss()).toBe(out.predLoss);
  });

  // -----------------------------
  // loss / predictiveLoss
  // -----------------------------
  test("loss returns 0 for empty vectors", () => {
    const eng = new CompressionEngine(4, 2);
    expect(eng.loss([], [])).toBe(0);
  });

  test("loss ignores invalid values", () => {
    const eng = new CompressionEngine(4, 2);
    const original = [1, NaN, 0];
    const recon = [0, 0.5, 0];

    const l = eng.loss(original, recon);
    expect(l).toBeCloseTo(1 / 3);
  });

  test("predictiveLoss behaves similarly", () => {
    const eng = new CompressionEngine(4, 2);
    const a = [1, NaN, 0];
    const p = [0, 0.5, 0];

    const l = eng.predictiveLoss(a, p);
    expect(l).toBeCloseTo(1 / 3);
  });

  // -----------------------------
  // _updateStructure
  // -----------------------------
  test("_updateStructure increments diagonal for strong activations", () => {
    const eng = new CompressionEngine(4, 2);
    const input = [0.6, 0.4, 0.7, 0];

    eng._updateStructure(input);

    expect(eng.structure[0][0]).toBe(1);
    expect(eng.structure[2][2]).toBe(1);
    expect(eng.structure[1][1]).toBe(0);
  });

  // -----------------------------
  // computeAnomaly
  // -----------------------------
  test("computeAnomaly tracks deviation from average", () => {
    const eng = new CompressionEngine(4, 2);

    eng.computeAnomaly(0.1);
    eng.computeAnomaly(0.1);
    const anomaly = eng.computeAnomaly(0.5);

    expect(anomaly).toBeCloseTo(0.27, 1);
    expect(eng.anomaly).toBeCloseTo(anomaly);
  });

  // -----------------------------
  // _validateOutput
  // -----------------------------
  test("_validateOutput throws on shape mismatch", () => {
    const eng = new CompressionEngine(4, 2);
    expect(() => eng._validateOutput([0.1])).toThrow("shape mismatch");
  });

  test("_validateOutput throws on invalid values", () => {
    const eng = new CompressionEngine(4, 2);
    expect(() => eng._validateOutput([0.1, NaN])).toThrow(
      "latent vector contains invalid values"
    );
  });

  // -----------------------------
  // getLatent3D
  // -----------------------------
  test("getLatent3D returns 4x4x2 structure", () => {
    const eng = new CompressionEngine(16, 32);
    eng.latent = Array(32).fill(0.5);

    const grid = eng.getLatent3D();

    expect(grid.length).toBe(2);
    expect(grid[0].length).toBe(4);
    expect(grid[0][0].length).toBe(4);
    expect(grid[0][0][0]).toBe(0.5);
  });

  // -----------------------------
  // loss accessors
  // -----------------------------
  test("getLoss and getPredictionLoss reflect last ingest", () => {
    const eng = new CompressionEngine(8, 4);
    const input = Array(8).fill(0.3);
    const next = Array(8).fill(0.9);

    const out = eng.ingest(input, next);

    expect(eng.getLoss()).toBe(out.loss);
    expect(eng.getPredictionLoss()).toBe(out.predLoss);
  });
});
