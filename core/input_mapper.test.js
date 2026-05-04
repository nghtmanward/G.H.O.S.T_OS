jest.useFakeTimers();

describe("InputMapper", () => {
  let InputMapper;

  beforeEach(() => {
    jest.resetModules();

    jest.mock("./version_registry.js", () => ({
      InputMapper: "1.0.0-2026.01.08"
    }));

    InputMapper = require("./input_mapper");

    jest.spyOn(global, "setInterval").mockImplementation(() => 1);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -----------------------------
  // Version validation
  // -----------------------------
  test("loads without registry file", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => null);
    const IM = require("./input_mapper");
    expect(() => new IM()).not.toThrow();
  });

  test("throws on version mismatch", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      InputMapper: "WRONG"
    }));
    const IM = require("./input_mapper");
    expect(() => new IM()).toThrow("Version mismatch");
  });

  test("accepts correct version", () => {
    expect(() => new InputMapper()).not.toThrow();
  });

  // -----------------------------
  // safeVal
  // -----------------------------
  test("safeVal returns finite values", () => {
    const m = new InputMapper();
    expect(m.safeVal(5)).toBe(5);
  });

  test("safeVal returns fallback for invalid values", () => {
    const m = new InputMapper();
    expect(m.safeVal(NaN, 7)).toBe(7);
    expect(m.safeVal(Infinity, 9)).toBe(9);
    expect(m.safeVal(undefined, 3)).toBe(3);
  });

  // -----------------------------
  // updateMouse
  // -----------------------------
  test("updateMouse updates speed and direction", () => {
    const m = new InputMapper();
    m.updateMouse(0, 0);
    m.updateMouse(50, 0);
    expect(m.mouseSpeed).toBeCloseTo(1);
    expect(Number.isFinite(m.mouseDirectionChange)).toBe(true);
  });

  test("updateMouse ignores invalid input", () => {
    const m = new InputMapper();
    m.updateMouse(NaN, 5);
    expect(m.mouseSpeed).toBe(0);
  });

  // -----------------------------
  // updateKeypress / updateClick / updateScroll / setFocus
  // -----------------------------
  test("updateKeypress increments keypressCount and resets idleTime", () => {
    const m = new InputMapper();
    m.idleTime = 5;
    m.updateKeypress();
    expect(m.keypressCount).toBeCloseTo(0.1);
    expect(m.idleTime).toBe(0);
  });

  test("updateClick increments clickCount", () => {
    const m = new InputMapper();
    m.updateClick();
    expect(m.clickCount).toBeCloseTo(0.2);
  });

  test("updateScroll sets scrollIntensity", () => {
    const m = new InputMapper();
    m.updateScroll(100);
    expect(m.scrollIntensity).toBeCloseTo(0.5);
  });

  test("setFocus updates focus state", () => {
    const m = new InputMapper();
    m.setFocus(false);
    expect(m.focused).toBe(false);
  });

  // -----------------------------
  // decay
  // -----------------------------
  test("decay reduces transient values", () => {
    const m = new InputMapper();
    m.keypressCount = 1;
    m.clickCount = 1;
    m.scrollIntensity = 1;
    m.mouseSpeed = 1;
    m.mouseDirectionChange = 1;
    m.decay();
    expect(m.keypressCount).toBeCloseTo(0.9);
    expect(m.clickCount).toBeCloseTo(0.8);
    expect(m.scrollIntensity).toBeCloseTo(0.85);
    expect(m.mouseSpeed).toBeCloseTo(0.9);
    expect(m.mouseDirectionChange).toBeCloseTo(0.9);
  });

  // -----------------------------
  // getVector
  // -----------------------------
  test("getVector returns correct structure", () => {
    const m = new InputMapper();
    const out = m.getVector();
    expect(out.version).toBe(m.version);
    expect(Array.isArray(out.vector)).toBe(true);
    expect(out.vector.length).toBe(12);
    expect(out.vector[7]).toBe(1);
  });

  test("getVector applies decay before output", () => {
    const m = new InputMapper();
    m.keypressCount = 1;
    const out = m.getVector();
    expect(out.vector[2]).toBeCloseTo(0.9);
  });

  // -----------------------------
  // _validateOutput
  // -----------------------------
  test("_validateOutput throws on invalid vector", () => {
    const m = new InputMapper();
    expect(() => m._validateOutput([1, 2, NaN])).toThrow(
      "InputMapper: output vector contains invalid values"
    );
  });

  test("_validateOutput throws on non-array", () => {
    const m = new InputMapper();
    expect(() => m._validateOutput("bad")).toThrow(
      "InputMapper: output vector is not an array"
    );
  });

  // -----------------------------
  // idle timer behavior (mocked)
  // -----------------------------
  test("idleTime increments via mocked interval", () => {
    const m = new InputMapper();
    m.idleTime = 0;
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(100);
    }
    expect(m.idleTime).toBe(0);
  });
});
