jest.mock("./main_memory", () => ({
  tertiary: []
}));

const mainMemory = require("./main_memory");
const { EmotionEngine } = require("./emotion_engine");

describe("EmotionEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mainMemory.tertiary = [];
  });

  // -----------------------------
  // semanticInfluence()
  // -----------------------------
  test("semanticInfluence returns 0 when no tertiary memory", () => {
    const eng = new EmotionEngine();
    expect(eng.semanticInfluence()).toBe(0);
  });

  test("semanticInfluence boosts mood for positive themes", () => {
    mainMemory.tertiary = [{ strength: 1, theme: "Hope Rising" }];
    const eng = new EmotionEngine();
    expect(eng.semanticInfluence()).toBe(0.05);
  });

  test("semanticInfluence depresses mood for negative themes", () => {
    mainMemory.tertiary = [{ strength: 1, theme: "Fear and Loss" }];
    const eng = new EmotionEngine();
    expect(eng.semanticInfluence()).toBe(-0.05);
  });

  test("semanticInfluence picks strongest record", () => {
    mainMemory.tertiary = [
      { strength: 0.2, theme: "hope" },
      { strength: 0.9, theme: "loss" }
    ];
    const eng = new EmotionEngine();
    expect(eng.semanticInfluence()).toBe(-0.05);
  });

  // -----------------------------
  // temporalInfluence()
  // -----------------------------
  test("temporalInfluence returns 0 for null summary", () => {
    const eng = new EmotionEngine();
    expect(eng.temporalInfluence(null)).toBe(0);
  });

  test("temporalInfluence combines moodTrend, dreamFrequency, anomalyTrend", () => {
    const eng = new EmotionEngine();

    const summary = {
      moodTrend: 0.5,        // +0.05
      dreamFrequency: 0.6,   // -0.02
      anomalyTrend: 0.4      // +0.02
    };

    const shift = eng.temporalInfluence(summary);
    expect(shift).toBeCloseTo(0.05 - 0.02 + 0.02);
  });

  // -----------------------------
  // update()
  // -----------------------------
  test("update applies moodShift, semanticShift, temporalShift, personalityBoost", () => {
    const eng = new EmotionEngine();

    mainMemory.tertiary = [{ strength: 1, theme: "hope" }];

    const summary = {
      moodTrend: 0.2,
      dreamFrequency: 0.1,
      anomalyTrend: 0.3
    };

    const out = eng.update({
      anomaly: 0.3,
      predLoss: 0.1,
      mood: "positive",
      dream: false,
      temporalSummary: summary,
      traits: [0.5, 0, 0.4, 0.2] // curiosity, _, emotionalAmp, vigilance
    });

    expect(out.mood).toBeGreaterThan(0); // positive shift
    expect(out.semanticShift).toBe(0.05);
    expect(out.temporalShift).toBeCloseTo(0.2 * 0.1 + 0 + 0.3 * 0.05);
    expect(out.personalityBoost).toBeCloseTo(0.4 * 0.2 - 0.2 * 0.1 + 0.5 * 0.05);
  });

  test("update clamps mood to [-1, 1]", () => {
    const eng = new EmotionEngine();

    const out = eng.update({
      anomaly: 1,
      predLoss: 1,
      mood: "positive",
      traits: [10, 0, 10, 0] // huge amplifiers
    });

    expect(out.mood).toBeLessThanOrEqual(1);
  });

  test("update softens mood shift during dreams", () => {
    const eng = new EmotionEngine();

    const normal = eng.update({
      anomaly: 0.5,
      predLoss: 0.2,
      mood: "negative",
      dream: false
    }).mood;

    eng.mood = 0; // reset

    const dream = eng.update({
      anomaly: 0.5,
      predLoss: 0.2,
      mood: "negative",
      dream: true
    }).mood;

    expect(Math.abs(dream)).toBeLessThan(Math.abs(normal));
  });

  test("update tracks history and enforces maxHistory", () => {
    const eng = new EmotionEngine();

    for (let i = 0; i < 400; i++) {
      eng.update({ anomaly: 0, predLoss: 0 });
    }

    expect(eng.history.length).toBe(300);
  });

  test("baseline drifts over time", () => {
    const eng = new EmotionEngine();
    const before = eng.baseline;

    eng.update({ anomaly: 0.5, predLoss: 0.2, mood: "positive" });

    expect(eng.baseline).not.toBe(before);
  });

  test("update never produces NaN or Infinity", () => {
    const eng = new EmotionEngine();

    const out = eng.update({
      anomaly: NaN,
      predLoss: Infinity,
      mood: "positive",
      traits: [NaN, NaN, NaN, NaN],
      temporalSummary: { moodTrend: NaN, dreamFrequency: NaN, anomalyTrend: NaN }
    });

    expect(Number.isFinite(out.mood)).toBe(true);
    expect(Number.isFinite(out.baseline)).toBe(true);
    expect(Number.isFinite(out.intensity)).toBe(true);
  });
});
