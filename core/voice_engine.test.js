// ------------------------------------------------------------
// VoiceEngine Test Suite
// ------------------------------------------------------------

describe("VoiceEngine", () => {
  let VoiceEngine;
  let ve;

  beforeEach(() => {
    jest.resetModules();

    jest.mock("./version_registry.js", () => ({
      Voice: "1.0.0-2026.01.08"
    }));

    VoiceEngine = require("./voice_engine");

    jest.spyOn(Date, "now").mockReturnValue(999999);
    jest.spyOn(Math, "random").mockReturnValue(0.1);

    ve = new VoiceEngine(null); // testMode
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ------------------------------------------------------------
  // VERSION CHECKS
  // ------------------------------------------------------------
  test("constructor loads registry and validates version", () => {
    expect(() => new VoiceEngine(null)).not.toThrow();
  });

  test("constructor throws on version mismatch", () => {
    jest.resetModules();

    jest.mock("./version_registry.js", () => ({
      Voice: "WRONG"
    }));

    const BadVE = require("./voice_engine");
    expect(() => new BadVE(null)).toThrow("Version mismatch");
  });

  // ------------------------------------------------------------
  // SAFE HELPERS
  // ------------------------------------------------------------
  test("safeVal returns fallback for invalid values", () => {
    expect(ve.safeVal(NaN, 5)).toBe(5);
    expect(ve.safeVal("x", 3)).toBe(3);
  });

  test("safeArray returns empty array for invalid input", () => {
    expect(ve.safeArray(null)).toEqual([]);
    expect(ve.safeArray("x")).toEqual([]);
  });

  // ------------------------------------------------------------
  // THOUGHT OVERRIDES
  // ------------------------------------------------------------
  test("generate uses thought when provided", () => {
    const out = ve.generate({
      anomaly: 0,
      predLoss: 0,
      attention: [],
      mood: "neutral",
      emotionalMood: 0,
      moodBaseline: 0,
      emotionalIntensity: 0,
      intensity: 0,
      thought: "A reflective thought."
    });

    expect(out.text).toBe("A reflective thought.");
    expect(ve.cooldown).toBe(10);
  });

  test("generate uses fallback thought when empty", () => {
    const out = ve.generate({
      anomaly: 0,
      predLoss: 0,
      attention: [],
      mood: "neutral",
      emotionalMood: 0,
      moodBaseline: 0,
      emotionalIntensity: 0,
      intensity: 0,
      thought: ""
    });

    expect(out.text).toBe("The ghost reflects.");
  });

  // ------------------------------------------------------------
  // COOLDOWN
  // ------------------------------------------------------------
  test("generate returns lastMessage during cooldown", () => {
    ve.lastMessage = "Previous message";
    ve.cooldown = 5;

    const out = ve.generate({
      anomaly: 0,
      predLoss: 0,
      attention: [],
      mood: "neutral",
      emotionalMood: 0,
      moodBaseline: 0,
      emotionalIntensity: 0,
      intensity: 0
    });

    expect(out.text).toBe("Previous message");
    expect(ve.cooldown).toBe(4);
  });

  // ------------------------------------------------------------
  // EMOTIONAL LOGIC
  // ------------------------------------------------------------
  test("generate reacts to positive combined mood", () => {
    const out = ve.generate({
      anomaly: 0,
      predLoss: 0,
      attention: [],
      mood: "positive",
      emotionalMood: 0,
      moodBaseline: 0,
      emotionalIntensity: 0,
      intensity: 0
    });

    expect(out.text).toBe("I feel a warmth rising.");
  });

  test("generate reacts to negative combined mood", () => {
    const out = ve.generate({
      anomaly: 0,
      predLoss: 0,
      attention: [],
      mood: "negative",
      emotionalMood: 0,
      moodBaseline: 0,
      emotionalIntensity: 0,
      intensity: 0
    });

    expect(out.text).toBe("A heaviness settles in me.");
  });

  // ------------------------------------------------------------
  // ANOMALY
  // ------------------------------------------------------------
  test("generate reacts to high anomaly", () => {
    const out = ve.generate({
      anomaly: 0.2,
      predLoss: 0,
      attention: [],
      mood: "neutral",
      emotionalMood: 0,
      moodBaseline: 0,
      emotionalIntensity: 0,
      intensity: 0
    });

    expect(out.text).toBe("A disruption ripples through me.");
  });

  // ------------------------------------------------------------
  // PREDICTION LOSS
  // ------------------------------------------------------------
  test("generate reacts to low predLoss (high confidence)", () => {
    const out = ve.generate({
      anomaly: 0,
      predLoss: 0.01,
      attention: [],
      mood: "neutral",
      emotionalMood: 0,
      moodBaseline: 0,
      emotionalIntensity: 0,
      intensity: 0
    });

    expect(out.text).toBe("I see your pattern clearly.");
  });

  test("generate reacts to high predLoss (confusion)", () => {
    const out = ve.generate({
      anomaly: 0,
      predLoss: 0.1,
      attention: [],
      mood: "neutral",
      emotionalMood: 0,
      moodBaseline: 0,
      emotionalIntensity: 0,
      intensity: 0
    });

    expect(out.text).toBe("Your motion confuses me.");
  });

  // ------------------------------------------------------------
  // ATTENTION
  // ------------------------------------------------------------
  test("generate reacts to attention focus", () => {
    const out = ve.generate({
      anomaly: 0,
      predLoss: 0,
      attention: [0.1, 0.5, 0.2],
      mood: "neutral",
      emotionalMood: 0,
      moodBaseline: 0,
      emotionalIntensity: 0,
      intensity: 0
    });

    expect(out.text).toBe("I'm focused on your direction.");
  });

  // ------------------------------------------------------------
  // EXPRESSIVENESS
  // ------------------------------------------------------------
  test("generate reacts to high expressiveness", () => {
    const out = ve.generate({
      anomaly: 0,
      predLoss: 0,
      attention: [],
      mood: "neutral",
      emotionalMood: 0,
      moodBaseline: 0,
      emotionalIntensity: 1,
      intensity: 1
    });

    expect(out.text).toBe("Your energy stirs something deep in me.");
  });

  // ------------------------------------------------------------
  // OUTPUT VALIDATION
  // ------------------------------------------------------------
  test("_validateOutput throws on invalid output", () => {
    expect(() => ve._validateOutput({ text: 123 })).toThrow(
      "text must be a string"
    );
  });
});