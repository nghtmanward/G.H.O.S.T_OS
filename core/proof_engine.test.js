const proof = require("./proof_engine");

describe("ProofEngine (stub)", () => {
  test("module loads", () => {
    expect(proof).toBeDefined();
  });

  test("attemptProof returns stub response", () => {
    const out = proof.attemptProof("x + y = z");
    expect(out.status).toBe("unavailable");
    expect(out.proof).toBe("ProofEngine not implemented yet.");
  });
});
