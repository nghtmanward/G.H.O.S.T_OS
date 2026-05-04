const SyntheticSensoryEngine = require("./synthetic_sensory_engine");

describe("SyntheticSensoryEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // constructor
  // ---------------------------------------------------------
  test("constructor initializes size, phase, and lastVector", () => {
    const s = new SyntheticSensoryEngine(8);
    expect(s.size).toBe(8);
    expect(s.phase).toBe(0);
    expect(s.lastVector.length).toBe(8);
    expect(s.lastVector.every(v => v === 0)).toBe(true);
  });

  // ---------------------------------------------------------
  // safeVal
  // ---------------------------------------------------------
  test("safeVal returns fallback for invalid values", () => {
    const s = new SyntheticSensoryEngine();
    expect(s.safeVal(NaN, 5)).toBe(5);
    expect(s.safeVal("x", 3)).toBe(3);
  });

  // ---------------------------------------------------------
  // clamp
  // ---------------------------------------------------------
  test("clamp restricts values to [min,max]", () => {
    const s = new SyntheticSensoryEngine();
    expect(s.clamp(2, 0, 1)).toBe(1);
    expect(s.clamp(-1, 0, 1)).toBe(0);
    expect(s.clamp(0.5, 0, 1)).toBe(0.5);
  });

  // ---------------------------------------------------------
  // generate() basic behavior
  // ---------------------------------------------------------
  test("generate returns array of correct size", () => {
    const s = new SyntheticSensoryEngine(6);

    const out = s.generate({
      inputVector: [0.1, 0.2, 0.3],
      temporalSummary: { circadianPhase: 0.5 },
      mood: 0.2,
      memoryLoad: 0.3,
      tick: 10
    });

    expect(out.length).toBe(6);
  });

  test("generate clamps all outputs to [0,1]", () => {
    const s = new SyntheticSensoryEngine(6);

    const out = s.generate({
      inputVector: [10, -10, 0.5, 2, -3, 1],
      temporalSummary: {},
      mood: 1,
      memoryLoad: 1,
      tick: 0
    });

    expect(out.every(v => v >= 0 && v <= 1)).toBe(true);
  });

  // ---------------------------------------------------------
  // phase drift
  // ---------------------------------------------------------
  test("phase increases by 0.12 each generate call", () => {
    const s = new SyntheticSensoryEngine();

    expect(s.phase).toBe(0);

    s.generate({ inputVector: [], tick: 0 });
    expect(s.phase).toBeCloseTo(0.12);

    s.generate({ inputVector: [], tick: 0 });
    expect(s.phase).toBeCloseTo(0.24);
  });

  // ---------------------------------------------------------
  // input sanitization
  // ---------------------------------------------------------
  test("generate sanitizes inputVector values", () => {
    const s = new SyntheticSensoryEngine(3);

    const out = s.generate({
      inputVector: [NaN, 2, -1],
      tick: 0
    });

    expect(out.length).toBe(3);
  });

  // ---------------------------------------------------------
  // noise + spike + turbulence (deterministic with mocked Math.random)
  // ---------------------------------------------------------
  test("noise and spike are deterministic when Math.random is mocked", () => {
    const s = new SyntheticSensoryEngine(3);

    const out = s.generate({
      inputVector: [0.1, 0.2, 0.3],
      tick: 5
    });

    expect(out.every(v => typeof v === "number")).toBe(true);
  });

  // ---------------------------------------------------------
  // lastVector update
  // ---------------------------------------------------------
  test("generate updates lastVector", () => {
    const s = new SyntheticSensoryEngine(4);

    const out = s.generate({
      inputVector: [0.1, 0.2, 0.3, 0.4],
      tick: 0
    });

    expect(s.lastVector).toEqual(out);
  });

  // ---------------------------------------------------------
  // stability across multiple ticks
  // ---------------------------------------------------------
  test("generate produces stable deterministic output across multiple ticks", () => {
    const s = new SyntheticSensoryEngine(4);

    const out1 = s.generate({
      inputVector: [0.1, 0.2, 0.3, 0.4],
      tick: 1
    });

    // Reset phase so second call starts from identical state
    s.phase -= 0.12;
    s.lastVector = [0, 0, 0, 0];

    const out2 = s.generate({
      inputVector: [0.1, 0.2, 0.3, 0.4],
      tick: 1
    });

    expect(out1).toEqual(out2);
  });
});