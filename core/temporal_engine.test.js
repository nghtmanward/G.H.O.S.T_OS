const { TemporalEngine } = require("./temporal_engine");

describe("TemporalEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // constructor
  // ---------------------------------------------------------
  test("constructor initializes fields correctly", () => {
    const t = new TemporalEngine();

    expect(t.lastTick).toBe(1000);
    expect(t.tickCount).toBe(0);
    expect(t.circadianPhase).toBe(0);
    expect(t.cycleLengthMs).toBe(1000 * 60 * 60 * 24);
  });

  // ---------------------------------------------------------
  // tick()
  // ---------------------------------------------------------
  test("tick updates lastTick and increments tickCount", () => {
    const t = new TemporalEngine();

    t.tick(5000);

    expect(t.lastTick).toBe(5000);
    expect(t.tickCount).toBe(1);
  });

  test("tick updates circadianPhase correctly", () => {
    const t = new TemporalEngine();

    const dayMs = t.cycleLengthMs;
    const now = dayMs * 0.25; // 25% through the cycle

    t.tick(now);

    expect(t.circadianPhase).toBeCloseTo(0.25);
  });

  test("tick wraps circadianPhase using modulo", () => {
    const t = new TemporalEngine();

    const dayMs = t.cycleLengthMs;
    const now = dayMs + dayMs * 0.1; // 110% of cycle → 10% phase

    t.tick(now);

    expect(t.circadianPhase).toBeCloseTo(0.1);
  });

  // ---------------------------------------------------------
  // getState()
  // ---------------------------------------------------------
  test("getState returns correct snapshot", () => {
    const t = new TemporalEngine();

    t.tick(2000);

    const state = t.getState();

    expect(state.lastTick).toBe(2000);
    expect(state.tickCount).toBe(1);
    expect(state.circadianPhase).toBeCloseTo(
      (2000 % t.cycleLengthMs) / t.cycleLengthMs
    );
  });
});
