// core/thought_mapper.test.js

// Helper to load ThoughtMapper with a specific registry version
const loadThoughtMapperWithVersion = (version) => {
  let ThoughtMapperClass;

  jest.isolateModules(() => {
    jest.doMock("./version_registry.js", () => ({
      ThoughtMapper: version
    }));

    ThoughtMapperClass = require("./thought_mapper");
  });

  return ThoughtMapperClass;
};

describe("ThoughtMapper", () => {
  const GOOD_VERSION = "1.0.0-2026.01.08";

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------
  // constructor + version validation
  // ---------------------------------------------------------
  test("constructor loads registry and validates version", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    expect(() => new ThoughtMapper()).not.toThrow();
  });

  test("constructor throws on version mismatch", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        ThoughtMapper: "WRONG"
      }));

      const BadMapper = require("./thought_mapper");
      expect(() => new BadMapper()).toThrow("Version mismatch");
    });
  });

  // ---------------------------------------------------------
  // safe helpers
  // ---------------------------------------------------------
  test("safeVal returns fallback for invalid values", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    expect(tm.safeVal(NaN, 5)).toBe(5);
    expect(tm.safeVal("x", 3)).toBe(3);
  });

  test("safeObj returns fallback for invalid objects", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    expect(tm.safeObj(null, { a: 1 })).toEqual({ a: 1 });
    expect(tm.safeObj("x", { a: 1 })).toEqual({ a: 1 });
  });

  // ---------------------------------------------------------
  // pickTone
  // ---------------------------------------------------------
  test("pickTone returns 'sensitive' when emotionality high", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const tone = tm.pickTone({
      moodState: { emotionality: 0.7 },
      anomalyTrend: { slope: 0 },
      latentDrift: { volatility: 0 }
    });

    expect(tone).toBe("sensitive");
  });

  test("pickTone returns 'curious' when curiosity high", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const tone = tm.pickTone({
      moodState: { curiosity: 0.8 },
      anomalyTrend: { slope: 0 },
      latentDrift: { volatility: 0 }
    });

    expect(tone).toBe("curious");
  });

  test("pickTone returns 'uneasy' when anomaly slope positive", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const tone = tm.pickTone({
      moodState: {},
      anomalyTrend: { slope: 0.02 },
      latentDrift: { volatility: 0 }
    });

    expect(tone).toBe("uneasy");
  });

  test("pickTone returns 'calming' when anomaly slope negative", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const tone = tm.pickTone({
      moodState: {},
      anomalyTrend: { slope: -0.02 },
      latentDrift: { volatility: 0 }
    });

    expect(tone).toBe("calming");
  });

  test("pickTone returns 'restless' when volatility high", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const tone = tm.pickTone({
      moodState: {},
      anomalyTrend: { slope: 0 },
      latentDrift: { volatility: 0.3 }
    });

    expect(tone).toBe("restless");
  });

  // ---------------------------------------------------------
  // pickTheme
  // ---------------------------------------------------------
  test("pickTheme returns 'memory' when memoryLoad.feelsHeavy", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const theme = tm.pickTheme({
      memoryLoad: { feelsHeavy: true }
    });

    expect(theme).toBe("memory");
  });

  test("pickTheme returns 'focus' when entropy low", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const theme = tm.pickTheme({
      attentionFocus: { entropy: 0.5 }
    });

    expect(theme).toBe("focus");
  });

  test("pickTheme returns 'change' when latent magnitude high", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const theme = tm.pickTheme({
      latentDrift: { magnitude: 0.2 }
    });

    expect(theme).toBe("change");
  });

  test("pickTheme returns 'stillness' as fallback", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const theme = tm.pickTheme({});
    expect(theme).toBe("stillness");
  });

  // ---------------------------------------------------------
  // buildSeed
  // ---------------------------------------------------------
  test("buildSeed constructs seed object with signals", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const seed = tm.buildSeed("curious", "focus", {
      latentDrift: { magnitude: 0.1, volatility: 0.2 },
      anomalyTrend: { recentAvg: 0.3 },
      memoryLoad: { fillRatio: 0.4 },
      attentionFocus: { dominantIndex: 2 },
      moodState: { styleHint: "poetic" }
    });

    expect(seed.tone).toBe("curious");
    expect(seed.theme).toBe("focus");
    expect(seed.signals.drift).toBe(0.1);
    expect(seed.signals.volatility).toBe(0.2);
    expect(seed.signals.anomaly).toBe(0.3);
    expect(seed.signals.memory).toBe(0.4);
    expect(seed.signals.focus).toBe(2);
    expect(seed.signals.style).toBe("poetic");
  });

  // ---------------------------------------------------------
  // map()
  // ---------------------------------------------------------
  test("map returns fallback when reflection invalid", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const out = tm.map(null);

    expect(out.tone).toBe("neutral");
    expect(out.theme).toBe("stillness");
    expect(out.seed).toBeDefined();
  });

  test("map returns structured output for valid reflection", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    const reflection = {
      moodState: { emotionality: 0.7 },
      anomalyTrend: { slope: 0.02 },
      latentDrift: { magnitude: 0.2, volatility: 0.1 },
      attentionFocus: { entropy: 0.5, dominantIndex: 1 },
      memoryLoad: { feelsHeavy: false, fillRatio: 0.3 }
    };

    const out = tm.map(reflection);

    expect(out.version).toBe(GOOD_VERSION);
    expect(typeof out.tone).toBe("string");
    expect(typeof out.theme).toBe("string");
    expect(typeof out.seed).toBe("object");
  });

  // ---------------------------------------------------------
  // output validation
  // ---------------------------------------------------------
  test("_validateOutput throws on invalid output", () => {
    const ThoughtMapper = loadThoughtMapperWithVersion(GOOD_VERSION);
    const tm = new ThoughtMapper();

    expect(() =>
      tm._validateOutput({ tone: 1, theme: "x", seed: {} })
    ).toThrow("tone must be a string");

    expect(() =>
      tm._validateOutput({ tone: "x", theme: 1, seed: {} })
    ).toThrow("theme must be a string");

    expect(() =>
      tm._validateOutput({ tone: "x", theme: "y", seed: null })
    ).toThrow("seed must be an object");
  });
});
