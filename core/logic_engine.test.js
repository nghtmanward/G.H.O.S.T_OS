const LogicEngine = require("./logic_engine");

describe("LogicEngine", () => {
  beforeEach(() => {
    jest.spyOn(Math, "random").mockReturnValue(0.5); // deterministic projection + latent init
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // constructor
  // ---------------------------------------------------------
  test("initializes with correct dimensions and random projection", () => {
    const eng = new LogicEngine(4, 3);

    expect(eng.inputDim).toBe(4);
    expect(eng.latentDim).toBe(3);

    expect(eng.latent.length).toBe(3);
    expect(eng.projection.length).toBe(4);
    expect(eng.projection[0].length).toBe(3);
  });

  // ---------------------------------------------------------
  // _sanitize
  // ---------------------------------------------------------
  test("_sanitize clamps invalid values and pads to inputDim", () => {
    const eng = new LogicEngine(5, 3);

    const out = eng._sanitize([1, NaN, 2]);

    expect(out).toEqual([1, 0, 2, 0, 0]);
  });

  // ---------------------------------------------------------
  // _updateStructure
  // ---------------------------------------------------------
  test("_updateStructure increments structure for values > 0.5", () => {
    const eng = new LogicEngine(4, 3);

    eng._updateStructure([0.6, 0.4, 0.7, 0]);
    expect(eng.structure).toEqual([1, 0, 1, 0]);
  });

  // ---------------------------------------------------------
  // _updateLatent
  // ---------------------------------------------------------
  test("_updateLatent updates latent vector and normalizes it", () => {
    const eng = new LogicEngine(3, 2);

    const input = [1, 0, 1];
    eng._updateLatent(input);

    const norm = Math.sqrt(
      eng.latent[0] ** 2 + eng.latent[1] ** 2
    );

    expect(norm).toBeCloseTo(1);
  });

  // ---------------------------------------------------------
  // reconstruct
  // ---------------------------------------------------------
  test("reconstruct returns array of inputDim with sigmoid outputs", () => {
    const eng = new LogicEngine(4, 2);

    const out = eng.reconstruct();

    expect(out.length).toBe(4);
    out.forEach(v => {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    });
  });

  // ---------------------------------------------------------
  // getSummary
  // ---------------------------------------------------------
  test("getSummary returns density based on structure", () => {
    const eng = new LogicEngine(4, 2);

    eng.structure = [1, 2, 3, 4]; // sum = 10
    const summary = eng.getSummary();

    expect(summary.density).toBe(10 / 4);
  });

  // ---------------------------------------------------------
  // ingest
  // ---------------------------------------------------------
  test("ingest runs full pipeline and returns latent, reconstruction, summary", () => {
    const eng = new LogicEngine(4, 2);

    const out = eng.ingest([1, 0, 1, 0]);

    expect(out.latent.length).toBe(2);
    expect(out.reconstruction.length).toBe(4);
    expect(out.summary).toHaveProperty("density");
    expect(eng.history.length).toBe(1);
  });

  test("ingest trims history at 1000 entries", () => {
    const eng = new LogicEngine(2, 2);

    for (let i = 0; i < 1100; i++) {
      eng.ingest([1, 0]);
    }

    expect(eng.history.length).toBe(1000);
  });
});
