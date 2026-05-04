const { applyDecay, prune, decay } = require("./decay");

describe("decay.js", () => {
  // -----------------------------
  // applyDecay
  // -----------------------------
  test("applyDecay reduces strength over time", () => {
    const now = Date.now();
    const oneDayMs = 1000 * 60 * 60 * 24;

    const record = {
      strength: 1.0,
      updated_at: now - oneDayMs // 1 day old
    };

    const decayed = applyDecay(record, 0.001);

    expect(decayed.strength).toBeLessThan(1.0);
    expect(decayed.strength).toBeGreaterThan(0.95); // small decay
  });

  test("applyDecay respects lambda parameter", () => {
    const now = Date.now();
    const oneDayMs = 1000 * 60 * 60 * 24;

    const record = {
      strength: 1.0,
      updated_at: now - oneDayMs
    };

    const slow = applyDecay({ ...record }, 0.0001);
    const fast = applyDecay({ ...record }, 0.01);

    expect(fast.strength).toBeLessThan(slow.strength);
  });

  // -----------------------------
  // prune
  // -----------------------------
  test("prune removes records below threshold", () => {
    const records = [
      { strength: 0.1 },
      { strength: 0.04 },
      { strength: 0.5 }
    ];

    const pruned = prune(records, 0.05);

    expect(pruned.length).toBe(2);
    expect(pruned).toEqual([
      { strength: 0.1 },
      { strength: 0.5 }
    ]);
  });

  test("prune keeps all records above threshold", () => {
    const records = [
      { strength: 0.2 },
      { strength: 0.3 }
    ];

    const pruned = prune(records, 0.1);
    expect(pruned.length).toBe(2);
  });

  // -----------------------------
  // decay (full pass)
  // -----------------------------
  test("decay applies decay then prunes", () => {
    const now = Date.now();
    const old = now - 5 * 24 * 60 * 60 * 1000; // 5 days old

    const records = [
      { strength: 0.2, updated_at: old },
      { strength: 0.01, updated_at: old }
    ];

    const result = decay(records, { lambda: 0.001, minStrength: 0.05 });

    // First record decays but stays above threshold
    // Second record decays and gets pruned
    expect(result.length).toBe(1);
    expect(result[0].strength).toBeLessThan(0.2);
  });

  test("decay returns empty array when all pruned", () => {
    const now = Date.now();
    const old = now - 10 * 24 * 60 * 60 * 1000;

    const records = [
      { strength: 0.01, updated_at: old },
      { strength: 0.02, updated_at: old }
    ];

    const result = decay(records, { lambda: 0.001, minStrength: 0.05 });
    expect(result.length).toBe(0);
  });
});
