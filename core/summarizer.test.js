const {
  labelCluster,
  summarizeCluster,
  buildMoodProfile,
  mergeTags,
  summarizeClusterData
} = require("./summarizer");

describe("summarizer.js", () => {
  // ---------------------------------------------------------
  // labelCluster
  // ---------------------------------------------------------
  test("labelCluster picks top 1–3 keywords", () => {
    const cluster = [
      { keywords: ["a", "b", "a"] },
      { keywords: ["a", "c"] }
    ];

    const label = labelCluster(cluster);
    expect(label).toBe("a b c"); // a=3, b=1, c=1
  });

  test("labelCluster returns fallback when no keywords", () => {
    const cluster = [{ keywords: [] }, { keywords: [] }];
    const label = labelCluster(cluster);
    expect(label).toBe("general theme");
  });

  // ---------------------------------------------------------
  // summarizeCluster
  // ---------------------------------------------------------
  test("summarizeCluster returns first 1–2 sentences", () => {
    const cluster = [
      { text: "Hello world. This is test. Another sentence." }
    ];

    const summary = summarizeCluster(cluster);
    expect(summary).toBe("Hello world. This is test.");
  });

  test("summarizeCluster handles empty text", () => {
    const summary = summarizeCluster([{ text: "" }]);
    expect(summary).toBe("A set of related experiences with no textual content.");
  });

  // ---------------------------------------------------------
  // buildMoodProfile
  // ---------------------------------------------------------
  test("buildMoodProfile normalizes mood counts", () => {
    const cluster = [
      { mood: "happy" },
      { mood: "sad" },
      { mood: "happy" }
    ];

    const profile = buildMoodProfile(cluster);

    expect(profile.happy).toBeCloseTo(2 / 3);
    expect(profile.sad).toBeCloseTo(1 / 3);
  });

  test("buildMoodProfile returns empty object when no moods", () => {
    const profile = buildMoodProfile([{ mood: null }, {}]);
    expect(profile).toEqual({});
  });

  // ---------------------------------------------------------
  // mergeTags
  // ---------------------------------------------------------
  test("mergeTags deduplicates tags", () => {
    const cluster = [
      { tags: ["a", "b"] },
      { tags: ["b", "c"] }
    ];

    const tags = mergeTags(cluster);
    expect(tags.sort()).toEqual(["a", "b", "c"]);
  });

  test("mergeTags handles missing tags", () => {
    const tags = mergeTags([{ tags: null }, {}]);
    expect(tags).toEqual([]);
  });

  // ---------------------------------------------------------
  // summarizeClusterData
  // ---------------------------------------------------------
  test("summarizeClusterData returns full summary object", () => {
    const cluster = [
      { text: "Hello world.", keywords: ["hello"], mood: "calm", tags: ["t1"] },
      { text: "Another sentence.", keywords: ["hello"], mood: "alert", tags: ["t2"] }
    ];

    const out = summarizeClusterData(cluster);

    expect(out.theme).toBe("hello");
    expect(out.summary).toContain("Hello world.");
    expect(out.mood_profile.calm).toBeCloseTo(0.5);
    expect(out.tags.sort()).toEqual(["t1", "t2"]);
  });
});
