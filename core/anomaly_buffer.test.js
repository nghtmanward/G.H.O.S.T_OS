const AnomalyBuffer = require("./anomaly_buffer");

// -----------------------------
// Registry mocks
// -----------------------------
jest.mock("./version_registry.js", () => ({
  AnomalyBuffer: "1.0.0-2026.01.08"
}));

describe("AnomalyBuffer", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  // -----------------------------
  // Version validation
  // -----------------------------
  test("loads without registry file", () => {
    jest.doMock("./version_registry.js", () => null);
    const AB = require("./anomaly_buffer");
    expect(() => new AB()).not.toThrow();
  });

  test("throws on version mismatch", () => {
    jest.doMock("./version_registry.js", () => ({
      AnomalyBuffer: "WRONG-VERSION"
    }));
    const AB = require("./anomaly_buffer");
    expect(() => new AB()).toThrow("Version mismatch");
  });

  test("accepts correct version", () => {
    jest.doMock("./version_registry.js", () => ({
      AnomalyBuffer: "1.0.0-2026.01.08"
    }));
    const AB = require("./anomaly_buffer");
    expect(() => new AB()).not.toThrow();
  });

  // -----------------------------
  // safeVal
  // -----------------------------
  test("safeVal returns finite values", () => {
    const buf = new AnomalyBuffer();
    expect(buf.safeVal(0.5, 0)).toBe(0.5);
  });

  test("safeVal returns fallback for invalid values", () => {
    const buf = new AnomalyBuffer();
    expect(buf.safeVal(NaN, 7)).toBe(7);
    expect(buf.safeVal(Infinity, 9)).toBe(9);
    expect(buf.safeVal(undefined, 3)).toBe(3);
  });

  // -----------------------------
  // Classification
  // -----------------------------
  test("classifies invalid values", () => {
    const buf = new AnomalyBuffer();
    const flag = buf._classify(NaN, 0.1);
    expect(flag.type).toBe("invalid");
  });

  test("classifies spike anomaly", () => {
    const buf = new AnomalyBuffer();
    const flag = buf._classify(0.25, 0.01);
    expect(flag.type).toBe("spike");
  });

  test("classifies elevated anomaly", () => {
    const buf = new AnomalyBuffer();
    const flag = buf._classify(0.15, 0.05);
    expect(flag.type).toBe("elevated");
  });

  test("classifies normal", () => {
    const buf = new AnomalyBuffer();
    const flag = buf._classify(0.01, 0.01);
    expect(flag.type).toBe("normal");
  });

  // -----------------------------
  // Ingest
  // -----------------------------
  test("ingest stores anomaly and predLoss history", () => {
    const buf = new AnomalyBuffer(4);
    buf.ingest({ anomaly: 0.1, predLoss: 0.2 });
    buf.ingest({ anomaly: 0.2, predLoss: 0.3 });

    expect(buf.anomalyHistory).toEqual([0.1, 0.2]);
    expect(buf.predLossHistory).toEqual([0.2, 0.3]);
  });

  test("ingest trims history to window size", () => {
    const buf = new AnomalyBuffer(2);
    buf.ingest({ anomaly: 0.1, predLoss: 0.1 });
    buf.ingest({ anomaly: 0.2, predLoss: 0.2 });
    buf.ingest({ anomaly: 0.3, predLoss: 0.3 });

    expect(buf.anomalyHistory).toEqual([0.2, 0.3]);
  });

  test("ingest adds spikes to quarantine", () => {
    const buf = new AnomalyBuffer();
    const flag = buf.ingest({ anomaly: 0.3, predLoss: 0.01 });

    expect(flag.type).toBe("spike");
    expect(buf.quarantine.length).toBe(1);
  });

  // -----------------------------
  // Quarantine
  // -----------------------------
  test("quarantine respects limit", () => {
    const buf = new AnomalyBuffer(64, 2);

    buf.ingest({ anomaly: 0.3, predLoss: 0.01 });
    buf.ingest({ anomaly: 0.4, predLoss: 0.01 });
    buf.ingest({ anomaly: 0.5, predLoss: 0.01 });

    expect(buf.quarantine.length).toBe(2);
  });

  test("clearQuarantine empties quarantine", () => {
    const buf = new AnomalyBuffer();
    buf.ingest({ anomaly: 0.3, predLoss: 0.01 });

    buf.clearQuarantine();
    expect(buf.quarantine.length).toBe(0);
  });

  // -----------------------------
  // shouldRecordEpisode
  // -----------------------------
  test("invalid flags never record", () => {
    const buf = new AnomalyBuffer();
    expect(buf.shouldRecordEpisode({ type: "invalid" })).toBe(false);
  });

  test("extreme spikes do not record", () => {
    const buf = new AnomalyBuffer();
    expect(buf.shouldRecordEpisode({ type: "spike", severity: 0.9 })).toBe(false);
  });

  test("mild spikes record", () => {
    const buf = new AnomalyBuffer();
    expect(buf.shouldRecordEpisode({ type: "spike", severity: 0.5 })).toBe(true);
  });

  test("elevated always records", () => {
    const buf = new AnomalyBuffer();
    expect(buf.shouldRecordEpisode({ type: "elevated" })).toBe(true);
  });

  test("normal always records", () => {
    const buf = new AnomalyBuffer();
    expect(buf.shouldRecordEpisode({ type: "normal" })).toBe(true);
  });

  // -----------------------------
  // filterMetadata
  // -----------------------------
  test("filterMetadata sanitizes invalid fields", () => {
    const buf = new AnomalyBuffer();
    const result = buf.filterMetadata({
      thought: 123,
      latent: [1, NaN, 3],
      anomaly: Infinity,
      mood: 42,
      styleBias: "bad",
      traits: [1, "x", 3]
    });

    expect(result.thought).toBe("");
    expect(result.latent).toEqual([1, 0, 3]);
    expect(result.anomaly).toBe(0);
    expect(result.mood).toBe("neutral");
    expect(result.styleBias).toEqual({ poetic: 1 });
    expect(result.traits).toEqual([1, 0, 3]);
  });

  // -----------------------------
  // getSummary
  // -----------------------------
  test("getSummary returns correct structure", () => {
    const buf = new AnomalyBuffer();
    buf.ingest({ anomaly: 0.2, predLoss: 0.1 });

    const summary = buf.getSummary();

    expect(summary.version).toBe(buf.version);
    expect(summary.windowSize).toBe(buf.windowSize);
    expect(summary.recentAnomalyAvg).toBeCloseTo(0.2);
    expect(summary.quarantineCount).toBe(buf.quarantine.length);
    expect(summary.lastFlag).not.toBeNull();
  });
});
