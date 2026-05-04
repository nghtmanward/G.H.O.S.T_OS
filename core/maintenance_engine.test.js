jest.mock("./shard_manager", () =>
  jest.fn().mockImplementation(() => ({
    currentShard: { id: "shard1" },
    saveShard: jest.fn()
  }))
);

jest.mock("./theme_engine", () => ({
  ThemeEngine: jest.fn().mockImplementation(() => ({
    recomputeThemes: jest.fn()
  }))
}));

jest.mock("./retrieval_engine", () => ({
  RetrievalEngine: jest.fn().mockImplementation(() => ({}))
}));

const { MaintenanceEngine } = require("./maintenance_engine");

describe("MaintenanceEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // cooldown logic
  // ---------------------------------------------------------
  test("run() returns skipped when cooldown not met", () => {
    const eng = new MaintenanceEngine("/memory");

    eng.lastRun = 999500;

    const out = eng.run();

    expect(out.status).toBe("skipped");
    expect(out.reason).toBe("cooldown");
  });

  // ---------------------------------------------------------
  // successful run
  // ---------------------------------------------------------
  test("run() saves current shard and recomputes themes", () => {
    const eng = new MaintenanceEngine("/memory");

    eng.lastRun = 0;
    eng.themes.recomputeThemes.mockReturnValue([{ t: 1 }, { t: 2 }]);

    const out = eng.run();

    expect(eng.shards.saveShard).toHaveBeenCalledWith(eng.shards.currentShard);
    expect(eng.themes.recomputeThemes).toHaveBeenCalledWith(5);
    expect(out.status).toBe("ok");
    expect(out.themesUpdated).toBe(2);
    expect(out.timestamp).toBe(1000000);
  });

  // ---------------------------------------------------------
  // lastRun timestamp update
  // ---------------------------------------------------------
  test("run() updates lastRun timestamp", () => {
    const eng = new MaintenanceEngine("/memory");

    eng.lastRun = 0;
    eng.themes.recomputeThemes.mockReturnValue([]);

    eng.run();

    expect(eng.lastRun).toBe(1000000);
  });
});