jest.mock("./retrieval_engine", () => ({
  RetrievalEngine: jest.fn().mockImplementation(() => ({
    getAllEpisodes: jest.fn(),
    findByMeaningNative: jest.fn()
  }))
}));

jest.mock("./semantic_engine", () => ({
  SemanticEngine: jest.fn().mockImplementation(() => ({
    findSimilarEpisodes: jest.fn()
  }))
}));

jest.mock("./shard_manager", () =>
  jest.fn().mockImplementation(() => ({
    addEpisode: jest.fn()
  }))
);

jest.mock("./main_memory", () => ({
  tertiary: []
}));

const { RetrievalEngine } = require("./retrieval_engine");
const { SemanticEngine } = require("./semantic_engine");
const ShardManager = require("./shard_manager");
const mainMemory = require("./main_memory");

const { DreamingEngine } = require("./dreaming_engine");

describe("DreamingEngine", () => {
  let retrievalMock;
  let semanticMock;
  let shardMock;

  beforeEach(() => {
    jest.clearAllMocks();

    retrievalMock = new RetrievalEngine();
    semanticMock = new SemanticEngine();
    shardMock = new ShardManager();

    jest.spyOn(Date, "now").mockReturnValue(1000000);
    jest.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -----------------------------
  // sample()
  // -----------------------------
  test("sample returns N items deterministically", () => {
    const eng = new DreamingEngine();
    const arr = [1, 2, 3, 4];
    const out = eng.sample(arr, 2);
    expect(out.length).toBe(2);
    expect(out).toEqual([1, 2]);
  });

  // -----------------------------
  // getDreamTheme()
  // -----------------------------
  test("getDreamTheme returns strongest theme", () => {
    mainMemory.tertiary = [
      { strength: 0.2, theme: "weak" },
      { strength: 0.9, theme: "strong" }
    ];
    const eng = new DreamingEngine();
    expect(eng.getDreamTheme()).toBe("strong");
  });

  test("getDreamTheme returns null when no tertiary memory", () => {
    mainMemory.tertiary = [];
    const eng = new DreamingEngine();
    expect(eng.getDreamTheme()).toBeNull();
  });

  // -----------------------------
  // buildDreamEpisode()
  // -----------------------------
  test("buildDreamEpisode constructs dream with theme drift", () => {
    const eng = new DreamingEngine();

    const cluster = [
      { text: "A", mood: "calm", anomaly: 0.2, latentMag: 1 },
      { text: "B", mood: "alert", anomaly: 0.4, latentMag: 3 }
    ];

    const dream = eng.buildDreamEpisode(cluster, "memory-theme");

    expect(dream.type).toBe("dream");
    expect(dream.text).toContain("A");
    expect(dream.text).toContain("B");
    expect(dream.text).toContain("{theme:memory-theme}");
    expect(dream.mood).toBe("calm");
    expect(dream.anomaly).toBeCloseTo((0.2 + 0.4) / 2);
    expect(dream.latentMag).toBeCloseTo((1 + 3) / 2);
  });

  test("buildDreamEpisode returns null for empty cluster", () => {
    const eng = new DreamingEngine();
    expect(eng.buildDreamEpisode([])).toBeNull();
  });

  // -----------------------------
  // runDreamCycle()
  // -----------------------------
  test("runDreamCycle respects DREAM_EVERY_N", () => {
    const eng = new DreamingEngine();
    retrievalMock.getAllEpisodes.mockReturnValue([{ text: "x" }]);
    eng.retrieval = retrievalMock;

    for (let i = 0; i < 19; i++) {
      expect(eng.runDreamCycle().length).toBe(0);
    }
  });

  test("runDreamCycle respects DREAM_INTERVAL", () => {
    const eng = new DreamingEngine();
    retrievalMock.getAllEpisodes.mockReturnValue([{ text: "x" }]);
    eng.retrieval = retrievalMock;

    eng.episodeCounter = eng.DREAM_EVERY_N;

    const first = eng.runDreamCycle();
    expect(first.length).toBe(0);

    const second = eng.runDreamCycle();
    expect(second.length).toBe(0);
  });

  test("runDreamCycle builds dreams using native cluster first", () => {
    const eng = new DreamingEngine();

    const episodes = [
      { text: "seed", anomaly: 1, mood: "neutral", latentMag: 1 }
    ];

    retrievalMock.getAllEpisodes.mockReturnValue(episodes);
    retrievalMock.findByMeaningNative.mockReturnValue([
      { text: "native1", mood: "calm", anomaly: 0.1, latentMag: 2 }
    ]);

    semanticMock.findSimilarEpisodes.mockReturnValue([]);

    eng.retrieval = retrievalMock;
    eng.semantic = semanticMock;
    eng.episodeCounter = eng.DREAM_EVERY_N;
    eng.lastDreamTime = 0;

    const dreams = eng.runDreamCycle({ seedCount: 1, clusterSize: 1 });

    expect(dreams.length).toBe(1);
    expect(dreams[0].text).toContain("native1");
  });

  test("runDreamCycle falls back to semantic clustering", () => {
    const eng = new DreamingEngine();

    const episodes = [
      { text: "seed", anomaly: 1, mood: "neutral", latentMag: 1 }
    ];

    retrievalMock.getAllEpisodes.mockReturnValue(episodes);
    retrievalMock.findByMeaningNative.mockReturnValue([]);

    semanticMock.findSimilarEpisodes.mockReturnValue([
      { item: { text: "semantic1", mood: "alert", anomaly: 0.3, latentMag: 4 } }
    ]);

    eng.retrieval = retrievalMock;
    eng.semantic = semanticMock;
    eng.episodeCounter = eng.DREAM_EVERY_N;
    eng.lastDreamTime = 0;

    const dreams = eng.runDreamCycle({ seedCount: 1, clusterSize: 1 });

    expect(dreams.length).toBe(1);
    expect(dreams[0].text).toContain("semantic1");
  });

  test("runDreamCycle caps dreams at maxDreams", () => {
    const eng = new DreamingEngine();

    const episodes = [
      { text: "seed", anomaly: 1, mood: "neutral", latentMag: 1 }
    ];

    retrievalMock.getAllEpisodes.mockReturnValue(episodes);
    retrievalMock.findByMeaningNative.mockReturnValue([
      { text: "dream", mood: "neutral", anomaly: 0.1, latentMag: 1 }
    ]);

    eng.retrieval = retrievalMock;
    eng.episodeCounter = eng.DREAM_EVERY_N;
    eng.lastDreamTime = 0;

    const dreams = eng.runDreamCycle({
      seedCount: 5,
      clusterSize: 1,
      maxDreams: 2
    });

    expect(dreams.length).toBe(2);
  });
});