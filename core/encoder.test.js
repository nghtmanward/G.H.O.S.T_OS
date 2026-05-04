const {
  extractKeywords,
  computeImportance,
  encodeShard,
  encodeText,
  normalize
} = require("./encoder");

// -----------------------------
// extractKeywords
// -----------------------------
describe("extractKeywords", () => {
  test("removes stopwords and short words", () => {
    const result = extractKeywords("The quick brown fox jumps over the lazy dog");
    expect(result).toEqual(["quick", "brown", "fox", "jumps", "over", "lazy", "dog"]);
  });

  test("handles punctuation and casing", () => {
    const result = extractKeywords("Hello, WORLD!!! This... is: testing.");
    expect(result).toEqual(["hello", "world", "testing"]);
  });

  test("returns empty array for empty input", () => {
    expect(extractKeywords("")).toEqual([]);
  });
});

// -----------------------------
// normalize
// -----------------------------
describe("normalize", () => {
  test("normalizes vector to unit length", () => {
    const vec = [3, 4];
    const norm = normalize(vec);
    const mag = Math.sqrt(norm[0] ** 2 + norm[1] ** 2);
    expect(mag).toBeCloseTo(1);
  });

  test("handles zero vector safely", () => {
    const norm = normalize([0, 0, 0]);
    const mag = Math.sqrt(norm.reduce((s, x) => s + x * x, 0));
    expect(mag).toBeCloseTo(1);
  });
});

// -----------------------------
// encodeText
// -----------------------------
describe("encodeText", () => {
  test("produces a 64‑dimensional normalized vector", () => {
    const vec = encodeText("hello world hello");
    expect(vec.length).toBe(64);

    const mag = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
    expect(mag).toBeCloseTo(1);
  });

  test("same word produces deterministic hash bucket", () => {
    const v1 = encodeText("banana");
    const v2 = encodeText("banana");
    expect(v1).toEqual(v2);
  });

  test("different words produce different distributions", () => {
    const v1 = encodeText("apple");
    const v2 = encodeText("zebra");
    expect(v1).not.toEqual(v2);
  });
});

// -----------------------------
// computeImportance
// -----------------------------
describe("computeImportance", () => {
  test("computes weighted importance correctly", () => {
    const shard = { anomaly: 1, latent_magnitude: 1, text: "x".repeat(500) };
    const score = computeImportance(shard);

    // 0.5*1 + 0.4*1 + 0.1*1 = 1.0
    expect(score).toBeCloseTo(1.0);
  });

  test("handles missing fields gracefully", () => {
    const score = computeImportance({});
    expect(score).toBeCloseTo(0);
  });

  test("caps text length contribution at 500 chars", () => {
    const shard = { anomaly: 0, latent_magnitude: 0, text: "x".repeat(2000) };
    const score = computeImportance(shard);
    expect(score).toBeCloseTo(0.1);
  });
});

// -----------------------------
// encodeShard
// -----------------------------
describe("encodeShard", () => {
  test("produces full encoded shard structure", () => {
    const shard = {
      id: "abc123",
      text: "Hello world testing",
      tags: ["memory"],
      mood: "neutral",
      anomaly: 0.2,
      latent_magnitude: 0.3
    };

    const encoded = encodeShard(shard);

    expect(encoded.id).toBe("abc123");
    expect(encoded.keywords).toEqual(["hello", "world", "testing"]);
    expect(encoded.tags).toEqual(["memory"]);
    expect(encoded.mood).toBe("neutral");
    expect(typeof encoded.importance).toBe("number");
    expect(encoded.embedding.length).toBe(64);
  });

  test("handles missing optional fields", () => {
    const encoded = encodeShard({ id: "x", text: "" });

    expect(encoded.tags).toEqual([]);
    expect(encoded.mood).toBe(null);
    expect(encoded.embedding.length).toBe(64);
  });
});
