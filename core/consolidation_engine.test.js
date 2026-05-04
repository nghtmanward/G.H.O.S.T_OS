const fs = require("fs");

// Explicit fs mocks
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

jest.mock("./retrieval_engine", () => ({
  RetrievalEngine: jest.fn().mockImplementation(() => ({
    getAllEpisodes: jest.fn()
  }))
}));

jest.mock("./semantic_engine", () => ({
  SemanticEngine: jest.fn().mockImplementation(() => ({
    findSimilarEpisodes: jest.fn()
  }))
}));

const { RetrievalEngine } = require("./retrieval_engine");
const { SemanticEngine } = require("./semantic_engine");
const { ConsolidationEngine } = require("./consolidation_engine");

describe("ConsolidationEngine", () => {
  let retrievalMock;
  let semanticMock;

  beforeEach(() => {
    jest.clearAllMocks();

    retrievalMock = new RetrievalEngine();
    semanticMock = new SemanticEngine();

    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue("");
    fs.writeFileSync.mockImplementation(() => {});
  });

  // -----------------------------
  // loadLongTerm
  // -----------------------------
  test("loadLongTerm returns empty structure when file missing", () => {
    const eng = new ConsolidationEngine("/memory");
    expect(eng.longTerm).toEqual({ themes: [] });
  });

  test("loadLongTerm loads JSON when file exists", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ themes: [{ summary: "x" }] }));

    const eng = new ConsolidationEngine("/memory");
    expect(eng.longTerm.themes.length).toBe(1);
  });

  // -----------------------------
  // consolidate: no episodes
  // -----------------------------
  test("consolidate does nothing when no episodes", () => {
    retrievalMock.getAllEpisodes.mockReturnValue([]);

    const eng = new ConsolidationEngine("/memory");
    eng.retrieval = retrievalMock;

    eng.consolidate();

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  // -----------------------------
  // consolidate: builds themes
  // -----------------------------
  test("consolidate builds themes from episodes", () => {
    const episodes = [
      { text: "hello world", anomaly: 0.1, mood: "neutral", timestamp: 1 },
      { text: "hello again", anomaly: 0.2, mood: "alert", timestamp: 2 }
    ];

    retrievalMock.getAllEpisodes.mockReturnValue(episodes);

    semanticMock.findSimilarEpisodes
      .mockReturnValueOnce([
        { episode: episodes[0], score: 1 },
        { episode: episodes[1], score: 0.8 }
      ])
      .mockReturnValueOnce([]); // second episode already used

    const eng = new ConsolidationEngine("/memory");
    eng.retrieval = retrievalMock;
    eng.semantic = semanticMock;

    eng.consolidate();

    expect(eng.longTerm.themes.length).toBe(1);

    const theme = eng.longTerm.themes[0];
    expect(theme.summary).toBe("hello world");
    expect(theme.count).toBe(2);
    expect(theme.avgAnomaly).toBeCloseTo((0.1 + 0.2) / 2);
    expect(theme.moods).toEqual(expect.arrayContaining(["neutral", "alert"]));
    expect(theme.examples.length).toBe(2);

    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  // -----------------------------
  // consolidate: marks used episodes
  // -----------------------------
  test("consolidate marks clustered episodes as used", () => {
    const episodes = [
      { text: "A", anomaly: 0.1, mood: "neutral", timestamp: 1 },
      { text: "B", anomaly: 0.2, mood: "alert", timestamp: 2 }
    ];

    retrievalMock.getAllEpisodes.mockReturnValue(episodes);

    semanticMock.findSimilarEpisodes
      .mockReturnValueOnce([
        { episode: episodes[0], score: 1 },
        { episode: episodes[1], score: 0.9 }
      ])
      .mockReturnValueOnce([]); // second episode skipped

    const eng = new ConsolidationEngine("/memory");
    eng.retrieval = retrievalMock;
    eng.semantic = semanticMock;

    eng.consolidate();

    expect(eng.longTerm.themes.length).toBe(1);
  });

  // -----------------------------
  // getThemes
  // -----------------------------
  test("getThemes returns long-term themes", () => {
    const eng = new ConsolidationEngine("/memory");
    eng.longTerm = { themes: [{ summary: "x" }] };

    expect(eng.getThemes()).toEqual([{ summary: "x" }]);
  });
});
