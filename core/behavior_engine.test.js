describe("BehaviorEngine", () => {
  let BehaviorEngine;

  beforeEach(() => {
    jest.resetModules();

    jest.mock("./version_registry.js", () => ({
      BehaviorEngine: "2.2.1-2026.05.01"
    }));

    BehaviorEngine = require("./behavior_engine");
  });

  // -----------------------------
  // Version validation
  // -----------------------------
  test("loads without registry file", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => null);
    const BE = require("./behavior_engine");
    expect(() => new BE()).not.toThrow();
  });

  test("throws on version mismatch", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      BehaviorEngine: "WRONG-VERSION"
    }));
    const BE = require("./behavior_engine");
    expect(() => new BE()).toThrow("Version mismatch");
  });

  test("accepts correct version", () => {
    expect(() => new BehaviorEngine()).not.toThrow();
  });

  // -----------------------------
  // Mood logic
  // -----------------------------
  test("mood becomes alert when anomaly > 0.05", () => {
    const eng = new BehaviorEngine();
    const out = eng.update({ anomaly: 0.2, predLoss: 0, latent: [] });
    expect(out.mood).toBe("alert");
    expect(out.color).toBe("#ff00ff");
  });

  test("mood becomes calm when anomaly < -0.05", () => {
    const eng = new BehaviorEngine();
    const out = eng.update({ anomaly: -0.2, predLoss: 0, latent: [] });
    expect(out.mood).toBe("calm");
    expect(out.color).toBe("#00ffaa");
  });

  test("mood becomes neutral when anomaly is small", () => {
    const eng = new BehaviorEngine();
    const out = eng.update({ anomaly: 0.01, predLoss: 0, latent: [] });
    expect(out.mood).toBe("neutral");
    expect(out.color).toBe("#00ffff");
  });

  // -----------------------------
  // Intensity logic
  // -----------------------------
  test("intensity scales with predLoss and clamps to [0,1]", () => {
    const eng = new BehaviorEngine();
    const out = eng.update({ anomaly: 0, predLoss: 0.3, latent: [] });
    expect(out.intensity).toBeCloseTo(1.0);
  });

  test("intensity is zero for invalid predLoss", () => {
    const eng = new BehaviorEngine();
    const out = eng.update({ anomaly: 0, predLoss: NaN, latent: [] });
    expect(out.intensity).toBe(0);
  });

  // -----------------------------
  // Latent magnitude
  // -----------------------------
  test("latentMag sums absolute latent values", () => {
    const eng = new BehaviorEngine();
    const out = eng.update({ anomaly: 0, predLoss: 0, latent: [1, -2, 3] });
    expect(out.latentMag).toBe(6);
  });

  test("latentMag ignores invalid values", () => {
    const eng = new BehaviorEngine();
    const out = eng.update({ anomaly: 0, predLoss: 0, latent: [1, NaN, -2] });
    expect(out.latentMag).toBe(3);
  });

  // -----------------------------
  // Text logic
  // -----------------------------
  test("uses provided thought text when valid", () => {
    const eng = new BehaviorEngine();
    const out = eng.update({ anomaly: 0, predLoss: 0, latent: [], thought: "Hello ghost" });
    expect(out.text).toBe("Hello ghost");
  });

  test("uses alert fallback text", () => {
    const eng = new BehaviorEngine();
    const out = eng.update({ anomaly: 0.2, predLoss: 0, latent: [], thought: "" });
    expect(out.text).toBe("The ghost senses disruption.");
  });

  test("uses calm fallback text", () => {
    const eng = new BehaviorEngine();
    const out = eng.update({ anomaly: -0.2, predLoss: 0, latent: [], thought: "" });
    expect(out.text).toBe("The ghost drifts in quiet memory.");
  });

  test("uses neutral fallback text", () => {
    const eng = new BehaviorEngine();
    const out = eng.update({ anomaly: 0, predLoss: 0, latent: [], thought: "" });
    expect(out.text).toBe("The ghost stirs...");
  });

  // -----------------------------
  // Output validation
  // -----------------------------
  test("throws if output is malformed", () => {
    const eng = new BehaviorEngine();
    expect(() =>
      eng._validateOutput({ mood: 5, intensity: 0, latentMag: 0, color: "", text: "" })
    ).toThrow("mood must be a string");
  });
});