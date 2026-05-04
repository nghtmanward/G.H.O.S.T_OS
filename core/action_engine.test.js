const ActionEngine = require("./action_engine");

describe("ActionEngine", () => {
  let engine;

  beforeEach(() => {
    engine = new ActionEngine();
  });

  // -----------------------------
  // safeVal
  // -----------------------------
  test("safeVal returns value when finite", () => {
    expect(engine.safeVal(0.42, 0)).toBe(0.42);
  });

  test("safeVal returns fallback when value is not finite", () => {
    expect(engine.safeVal(NaN, 5)).toBe(5);
    expect(engine.safeVal(Infinity, 7)).toBe(7);
    expect(engine.safeVal(undefined, 9)).toBe(9);
  });

  // -----------------------------
  // choose — anomaly branch
  // -----------------------------
  test("choose returns 'stabilize' when anomaly > 0.12", () => {
    const action = engine.choose({
      thought: "test",
      mood: "neutral",
      intensity: 0.3,
      anomaly: 0.2
    });

    expect(action.label).toBe("stabilize");
    expect(action.reason).toBe("anomaly-spike");
    expect(action.intensity).toBeCloseTo(0.2);
  });

  test("anomaly intensity is capped at 1.0", () => {
    const action = engine.choose({
      thought: "x",
      mood: "neutral",
      intensity: 0.3,
      anomaly: 5
    });

    expect(action.intensity).toBe(1);
  });

  // -----------------------------
  // choose — intensity branch
  // -----------------------------
  test("choose returns 'focus' when intensity > 0.55 and anomaly low", () => {
    const action = engine.choose({
      thought: "thinking",
      mood: "neutral",
      intensity: 0.8,
      anomaly: 0.01
    });

    expect(action.label).toBe("focus");
    expect(action.reason).toBe("heightened-activity");
    expect(action.intensity).toBeCloseTo(0.8);
  });

  // -----------------------------
  // choose — calm + text branch
  // -----------------------------
  test("choose returns 'rehearse' when mood is calm and text exists", () => {
    const action = engine.choose({
      thought: "memory trace",
      mood: "calm",
      intensity: 0.05,
      anomaly: 0
    });

    expect(action.label).toBe("rehearse");
    expect(action.reason).toBe("memory-consolidation");
    expect(action.intensity).toBeCloseTo(0.1); // minimum enforced
  });

  // -----------------------------
  // choose — default branch
  // -----------------------------
  test("choose returns 'observe' when no conditions match", () => {
    const action = engine.choose({
      thought: "",
      mood: "neutral",
      intensity: 0.1,
      anomaly: 0
    });

    expect(action.label).toBe("observe");
    expect(action.reason).toBe("steady-state");
  });

  // -----------------------------
  // lastAction tracking
  // -----------------------------
  test("choose updates lastAction", () => {
    const action = engine.choose({
      thought: "hello",
      mood: "calm",
      intensity: 0.2,
      anomaly: 0
    });

    expect(engine.lastAction).toEqual(action);
  });
});
