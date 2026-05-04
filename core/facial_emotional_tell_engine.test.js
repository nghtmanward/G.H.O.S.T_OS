describe("FacialEmotionalTellEngine", () => {
  let FacialEmotionalTellEngine;
  let fe;

  beforeEach(() => {
    jest.resetModules();

    jest.mock("./version_registry.js", () => ({
      FacialEmotionalTellEngine: "1.0.0-2026.01.08"
    }));

    FacialEmotionalTellEngine = require("./facial_emotional_tell_engine");
    fe = new FacialEmotionalTellEngine();
  });

  // ---------------------------------------------------------
  // constructor + version validation
  // ---------------------------------------------------------
  test("constructor loads registry and validates version", () => {
    expect(() => new FacialEmotionalTellEngine()).not.toThrow();
  });

  test("constructor throws on version mismatch", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      FacialEmotionalTellEngine: "WRONG"
    }));
    const BadFE = require("./facial_emotional_tell_engine");
    expect(() => new BadFE()).toThrow("Version mismatch");
  });

  // ---------------------------------------------------------
  // safeVal
  // ---------------------------------------------------------
  test("safeVal returns 0 for invalid values", () => {
    expect(fe.safeVal(NaN)).toBe(0);
    expect(fe.safeVal("x")).toBe(0);
  });

  // ---------------------------------------------------------
  // computeValence / computeArousal / computeTension
  // ---------------------------------------------------------
  test("computeValence = smile - frown", () => {
    expect(fe.computeValence({ smile: 0.8, frown: 0.3 })).toBeCloseTo(0.5);
  });

  test("computeArousal = eyeOpen + motionEnergy", () => {
    expect(fe.computeArousal({ eyeOpen: 0.4, motionEnergy: 0.2 })).toBeCloseTo(0.6);
  });

  test("computeTension = jawTension + browTension", () => {
    expect(fe.computeTension({ jawTension: 0.3, browTension: 0.4 })).toBeCloseTo(0.7);
  });

  // ---------------------------------------------------------
  // classifyEmotion
  // ---------------------------------------------------------
  test("classifyEmotion returns 'tense' when tension > 0.6", () => {
    expect(fe.classifyEmotion(0, 0, 0.7)).toBe("tense");
  });

  test("classifyEmotion returns 'excited' when arousal>0.6 and valence>0.2", () => {
    expect(fe.classifyEmotion(0.3, 0.7, 0)).toBe("excited");
  });

  test("classifyEmotion returns 'anxious' when arousal>0.6 and valence<-0.2", () => {
    expect(fe.classifyEmotion(-0.3, 0.7, 0)).toBe("anxious");
  });

  test("classifyEmotion returns 'happy' when valence>0.3", () => {
    expect(fe.classifyEmotion(0.4, 0, 0)).toBe("happy");
  });

  test("classifyEmotion returns 'sad' when valence<-0.3", () => {
    expect(fe.classifyEmotion(-0.4, 0, 0)).toBe("sad");
  });

  test("classifyEmotion returns 'neutral' otherwise", () => {
    expect(fe.classifyEmotion(0, 0, 0)).toBe("neutral");
  });

  // ---------------------------------------------------------
  // update() smoothing + classification
  // ---------------------------------------------------------
  test("update returns neutral fallback for invalid input", () => {
    const out = fe.update(null);
    expect(out.emotion).toBe("neutral");
    expect(out.valence).toBe(0);
  });

  test("update computes smoothed emotional axes", () => {
    const out1 = fe.update({
      smile: 1, frown: 0, eyeOpen: 0.5,
      motionEnergy: 0.5, jawTension: 0.2, browTension: 0.2
    });

    expect(out1.valence).toBeGreaterThan(0);
    expect(out1.arousal).toBeGreaterThan(0);
    expect(out1.tension).toBeGreaterThan(0);

    const out2 = fe.update({
      smile: 1, frown: 0, eyeOpen: 0.5,
      motionEnergy: 0.5, jawTension: 0.2, browTension: 0.2
    });

    expect(out2.valence).toBeGreaterThan(out1.valence);
  });

  test("update sets prev to features", () => {
    const features = { smile: 0.2, frown: 0.1 };
    fe.update(features);
    expect(fe.prev).toBe(features);
  });

  // ---------------------------------------------------------
  // output validation
  // ---------------------------------------------------------
  test("_validateOutput throws on invalid numeric fields", () => {
    expect(() =>
      fe._validateOutput({ valence: "x", arousal: 0, tension: 0, emotion: "neutral" })
    ).toThrow("valence invalid");
  });

  test("_validateOutput throws on invalid emotion type", () => {
    expect(() =>
      fe._validateOutput({ valence: 0, arousal: 0, tension: 0, emotion: 123 })
    ).toThrow("emotion must be a string");
  });
});