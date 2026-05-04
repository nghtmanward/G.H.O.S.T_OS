const mainMemory = require("./main_memory");

jest.mock("./retrieval_engine", () => ({
  RetrievalEngine: jest.fn().mockImplementation(() => ({
    shards: []
  }))
}));

jest.mock("./semantic_engine", () => ({
  SemanticEngine: jest.fn().mockImplementation(() => ({
    embed: jest.fn((txt) => [txt.length]) // deterministic embedding
  }))
}));

const { ThemeEngine } = require("./theme_engine");
const { RetrievalEngine } = require("./retrieval_engine");
const { SemanticEngine } = require("./semantic_engine");

describe("ThemeEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Math, "random").mockReturnValue(0.5); // deterministic center selection
    mainMemory.tertiary = [];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // distance()
  // ---------------------------------------------------------
  test("distance computes Euclidean distance", () => {
    const t = new ThemeEngine("/mem");
    const d = t.distance([0, 0], [3, 4]);
    expect(d).toBe(5);
  });

  // ---------------------------------------------------------
  // initCenters()
  // ---------------------------------------------------------
  test("initCenters picks k random centers deterministically", () => {
    const t = new ThemeEngine("/mem");

    const vectors = [[1], [2], [3], [4]];
    const centers = t.initCenters(vectors, 2);

    // Math.random() = 0.5 → index = floor(0.5 * 4) = 2 → pick [3]
    // Next: vectors = [1,2,4], index = floor(0.5 * 3) = 1 → pick [2]
    expect(centers).toEqual([[3], [2]]);
  });

  // ---------------------------------------------------------
  // clusterEmbeddings()
  // ---------------------------------------------------------
  test("clusterEmbeddings returns empty when no vectors", () => {
    const t = new ThemeEngine("/mem");
    expect(t.clusterEmbeddings([], 3)).toEqual([]);
  });

  test("clusterEmbeddings clusters vectors deterministically", () => {
    const t = new ThemeEngine("/mem");

    const vectors = [[1], [2], [10], [11]];

    const { centers, clusters } = t.clusterEmbeddings(vectors, 2, 2);

    expect(centers.length).toBe(2);
    expect(clusters.length).toBe(2);

    // Should cluster into low group [1,2] and high group [10,11]
    const clusterSizes = clusters.map(c => c.length).sort();
    expect(clusterSizes).toEqual([2, 2]);
  });

  // ---------------------------------------------------------
  // deriveLabel()
  // ---------------------------------------------------------
  test("deriveLabel extracts top keywords", () => {
    const t = new ThemeEngine("/mem");

    const shards = [
      { summary: { text: "alpha beta alpha gamma" } }
    ];

    const label = t.deriveLabel(shards);
    expect(label).toBe("alpha / beta / gamma");
  });

  test("deriveLabel returns fallback when no keywords", () => {
    const t = new ThemeEngine("/mem");

    const shards = [{ summary: { text: "a b c" } }]; // all <4 chars → filtered out
    const label = t.deriveLabel(shards);

    expect(label).toBe("unnamed theme");
  });

  // ---------------------------------------------------------
  // recomputeThemes()
  // ---------------------------------------------------------
  test("recomputeThemes returns empty when no shards", () => {
    RetrievalEngine.mockImplementation(() => ({ shards: [] }));

    const t = new ThemeEngine("/mem");
    const out = t.recomputeThemes(3);

    expect(out).toEqual([]);
  });

  test("recomputeThemes returns empty when no embeddings", () => {
    RetrievalEngine.mockImplementation(() => ({
      shards: [{ summary: { embedding: [] } }]
    }));

    const t = new ThemeEngine("/mem");
    const out = t.recomputeThemes(3);

    expect(out).toEqual([]);
  });

  test("recomputeThemes builds themes and writes to mainMemory", () => {
    RetrievalEngine.mockImplementation(() => ({
      shards: [
        { summary: { embedding: [1], text: "alpha beta" } },
        { summary: { embedding: [2], text: "alpha gamma" } },
        { summary: { embedding: [10], text: "delta epsilon" } }
      ]
    }));

    const t = new ThemeEngine("/mem");

    const themes = t.recomputeThemes(2);

    expect(themes.length).toBeGreaterThan(0);
    expect(mainMemory.tertiary).toBe(themes);

    // Check theme structure
    expect(themes[0]).toHaveProperty("theme");
    expect(themes[0]).toHaveProperty("summary");
    expect(themes[0]).toHaveProperty("embedding");
    expect(themes[0]).toHaveProperty("strength");
  });
});
