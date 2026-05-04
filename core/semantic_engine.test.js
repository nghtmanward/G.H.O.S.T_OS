jest.mock("./encoder", () => ({
  encodeText: jest.fn((txt) => {
    // Deterministic embedding: vector of char codes mod 10
    return txt
      .split("")
      .map((c) => (c.charCodeAt(0) % 10) || 1);
  })
}));

const { encodeText } = require("./encoder");
const { SemanticEngine } = require("./semantic_engine");

describe("SemanticEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------
  // constructor + normalize
  // ---------------------------------------------------------
  test("constructor wraps embeddingFn and normalizes output", () => {
    const eng = new SemanticEngine();

    const vec = eng.embed("abc"); // deterministic from mock
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));

    expect(mag).toBeCloseTo(1);
  });

  test("normalize handles zero vector safely", () => {
    encodeText.mockReturnValueOnce([0, 0, 0]);

    const eng = new SemanticEngine();
    const out = eng.embed("ignored");

    const mag = Math.sqrt(out.reduce((s, v) => s + v * v, 0));
    expect(mag).toBeCloseTo(1); // normalized from fallback
  });

  // ---------------------------------------------------------
  // cosine
  // ---------------------------------------------------------
  test("cosine computes dot product for normalized vectors", () => {
    const eng = new SemanticEngine();

    const a = eng.normalize([1, 0]);
    const b = eng.normalize([1, 0]);

    expect(eng.cosine(a, b)).toBeCloseTo(1);
  });

  test("cosine returns 0 for orthogonal vectors", () => {
    const eng = new SemanticEngine();

    const a = eng.normalize([1, 0]);
    const b = eng.normalize([0, 1]);

    expect(eng.cosine(a, b)).toBeCloseTo(0);
  });

  // ---------------------------------------------------------
  // _search
  // ---------------------------------------------------------
  test("_search ranks items by similarity", () => {
    const eng = new SemanticEngine();

    const items = [
      { text: "aaa" },
      { text: "bbb" }
    ];

    const out = eng._search("aaa", items, (i) => i.text, 2);

    expect(out.length).toBe(2);
    expect(out[0].item.text).toBe("aaa"); // closest match
  });

  // ---------------------------------------------------------
  // findSimilarEpisodes
  // ---------------------------------------------------------
  test("findSimilarEpisodes delegates to _search", () => {
    const eng = new SemanticEngine();

    const episodes = [
      { text: "hello" },
      { text: "world" }
    ];

    const out = eng.findSimilarEpisodes("hello", episodes, 2);

    expect(out.length).toBe(2);
    expect(out[0].item.text).toBe("hello");
  });

  // ---------------------------------------------------------
  // findSimilarShards
  // ---------------------------------------------------------
  test("findSimilarShards uses shard.originalText", () => {
    const eng = new SemanticEngine();

    const shards = [
      { originalText: "alpha" },
      { originalText: "beta" }
    ];

    const out = eng.findSimilarShards("alpha", shards, 2);

    expect(out[0].item.originalText).toBe("alpha");
  });

  // ---------------------------------------------------------
  // findSimilarTertiary
  // ---------------------------------------------------------
  test("findSimilarTertiary uses record.summary", () => {
    const eng = new SemanticEngine();

    const tertiary = [
      { summary: "sun" },
      { summary: "moon" }
    ];

    const out = eng.findSimilarTertiary("sun", tertiary, 2);

    expect(out[0].item.summary).toBe("sun");
  });

  // ---------------------------------------------------------
  // findSimilarThemes
  // ---------------------------------------------------------
  test("findSimilarThemes uses record.theme", () => {
    const eng = new SemanticEngine();

    const tertiary = [
      { theme: "joy" },
      { theme: "fear" }
    ];

    const out = eng.findSimilarThemes("joy", tertiary, 2);

    expect(out[0].item.theme).toBe("joy");
  });

  // ---------------------------------------------------------
  // retrieveRelevantMemories
  // ---------------------------------------------------------
  test("retrieveRelevantMemories returns all four semantic groups", () => {
    const eng = new SemanticEngine();

    const out = eng.retrieveRelevantMemories("query", {
      episodes: [{ text: "ep" }],
      shards: [{ originalText: "shard" }],
      tertiary: [{ summary: "sum", theme: "th" }]
    });

    expect(out.episodes.length).toBeGreaterThan(0);
    expect(out.shards.length).toBeGreaterThan(0);
    expect(out.tertiary.length).toBeGreaterThan(0);
    expect(out.themes.length).toBeGreaterThan(0);
  });
});
