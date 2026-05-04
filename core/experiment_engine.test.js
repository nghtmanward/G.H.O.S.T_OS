const ExperimentEngine = require("./experiment_engine");

describe("ExperimentEngine", () => {
  let worldMock;
  let episodicMock;
  let theoryMock;
  let loggerMock;

  beforeEach(() => {
    jest.clearAllMocks();

    worldMock = {
      startDropTest: jest.fn(),
      getDropTestResult: jest.fn()
    };

    episodicMock = {
      addEpisode: jest.fn()
    };

    theoryMock = {
      update: jest.fn()
    };

    loggerMock = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    jest.spyOn(Date, "now").mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // _shouldRun
  // ---------------------------------------------------------
  test("_shouldRun enforces minIntervalMs", () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    eng.lastRunTimestamp = 999500; // only 500ms ago
    expect(eng._shouldRun()).toBe(false);

    eng.lastRunTimestamp = 900000; // long enough ago
    expect(eng._shouldRun()).toBe(true);
  });

  // ---------------------------------------------------------
  // generateHypothesis
  // ---------------------------------------------------------
  test("generateHypothesis creates hypothesis and logs + stores episode", () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    const hyp = eng.generateHypothesis({ foo: "bar" });

    expect(hyp.statement).toContain("constant acceleration");
    expect(episodicMock.addEpisode).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // planExperiment
  // ---------------------------------------------------------
  test("planExperiment creates drop_test plan and stores episode", () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    const hyp = { id: "hyp1" };
    const plan = eng.planExperiment(hyp);

    expect(plan.type).toBe("drop_test");
    expect(plan.trials.length).toBe(3);
    expect(episodicMock.addEpisode).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // runExperiment
  // ---------------------------------------------------------
  test("runExperiment runs trials and stores results", async () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    worldMock.startDropTest.mockResolvedValue({ trialId: "T1" });
    worldMock.getDropTestResult.mockResolvedValue({ acceleration: 9.8 });

    const plan = {
      trials: [{ mass: 1, height: 5 }]
    };

    const results = await eng.runExperiment(plan);

    expect(results.length).toBe(1);
    expect(results[0].acceleration).toBe(9.8);
    expect(episodicMock.addEpisode).toHaveBeenCalled();
  });

  test("runExperiment handles missing trialId", async () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    worldMock.startDropTest.mockResolvedValue({}); // no trialId

    const plan = { trials: [{}] };
    const results = await eng.runExperiment(plan);

    expect(results.length).toBe(0);
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  test("runExperiment handles world API errors", async () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    worldMock.startDropTest.mockRejectedValue(new Error("boom"));

    const plan = { trials: [{}] };
    const results = await eng.runExperiment(plan);

    expect(results.length).toBe(0);
    expect(loggerMock.error).toHaveBeenCalled();
    expect(episodicMock.addEpisode).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // analyzeResults
  // ---------------------------------------------------------
  test("analyzeResults computes mean, variance, confidence", () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    const results = [
      { acceleration: 9 },
      { acceleration: 11 }
    ];

    const hyp = { id: "H1" };
    const analysis = eng.analyzeResults(results, hyp);

    expect(analysis.meanAcceleration).toBe(10);
    expect(analysis.variance).toBe(1);
    expect(analysis.confidence).toBeCloseTo(1 / (1 + 1));
    expect(episodicMock.addEpisode).toHaveBeenCalled();
  });

  test("analyzeResults handles empty results", () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    const hyp = { id: "H1" };
    const analysis = eng.analyzeResults([], hyp);

    expect(analysis.confidence).toBe(0);
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  test("analyzeResults handles invalid acceleration data", () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    const hyp = { id: "H1" };
    const analysis = eng.analyzeResults([{ acceleration: NaN }], hyp);

    expect(analysis.confidence).toBe(0);
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // updateTheory
  // ---------------------------------------------------------
  test("updateTheory calls theory.update and stores episode", () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    theoryMock.update.mockReturnValue({ updated: true });

    const out = eng.updateTheory({ a: 1 }, { b: 2 });

    expect(out.updated).toBe(true);
    expect(episodicMock.addEpisode).toHaveBeenCalled();
  });

  test("updateTheory handles missing theory engine", () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: null,
      logger: loggerMock
    });

    const out = eng.updateTheory({}, {});
    expect(out).toBeNull();
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // runFullExperimentCycle
  // ---------------------------------------------------------
  test("runFullExperimentCycle runs all stages", async () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    worldMock.startDropTest.mockResolvedValue({ trialId: "T1" });
    worldMock.getDropTestResult.mockResolvedValue({ acceleration: 9.8 });
    theoryMock.update.mockReturnValue({ updated: true });

    const cycle = await eng.runFullExperimentCycle({ foo: "bar" });

    expect(cycle.hypothesis).toBeDefined();
    expect(cycle.plan).toBeDefined();
    expect(cycle.results.length).toBe(3);
    expect(cycle.analysis).toBeDefined();
    expect(cycle.theoryUpdate).toEqual({ updated: true });
  });

  // ---------------------------------------------------------
  // maybeRunExperiment
  // ---------------------------------------------------------
  test("maybeRunExperiment respects throttling", async () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    eng.lastRunTimestamp = 999500; // too recent
    const out = await eng.maybeRunExperiment({});
    expect(out).toBeNull();
  });

  test("maybeRunExperiment runs cycle and stores episode", async () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    eng.lastRunTimestamp = 0;

    worldMock.startDropTest.mockResolvedValue({ trialId: "T1" });
    worldMock.getDropTestResult.mockResolvedValue({ acceleration: 9.8 });
    theoryMock.update.mockReturnValue({ updated: true });

    const out = await eng.maybeRunExperiment({});

    expect(out).not.toBeNull();
    expect(episodicMock.addEpisode).toHaveBeenCalled();
  });

  test("maybeRunExperiment logs and stores error episode", async () => {
    const eng = new ExperimentEngine({
      worldAPI: worldMock,
      episodic: episodicMock,
      theoryEngine: theoryMock,
      logger: loggerMock
    });

    eng.lastRunTimestamp = 0;

    jest.spyOn(eng, "runFullExperimentCycle").mockRejectedValue(new Error("boom"));

    const out = await eng.maybeRunExperiment({});

    expect(out).toBeNull();
    expect(loggerMock.error).toHaveBeenCalled();
    expect(episodicMock.addEpisode).toHaveBeenCalled();
  });
});
