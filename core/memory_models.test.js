const { EpisodicShard, TertiaryRecord } = require("./memory_models");
const { v4: uuidv4 } = require("uuid");

jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-uuid")
}));

describe("memory_models.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(123456789);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // EpisodicShard
  // ---------------------------------------------------------
  test("EpisodicShard initializes with defaults", () => {
    const shard = new EpisodicShard();

    expect(shard.id).toBe("mock-uuid");
    expect(shard.timestamp).toBe(123456789);
    expect(shard.text).toBe("");
    expect(shard.mood).toBeNull();
    expect(shard.anomaly).toBe(0);
    expect(shard.latent_magnitude).toBe(0);
    expect(shard.tags).toEqual([]);
    expect(shard.embedding).toBeNull();
    expect(shard.consolidated).toBe(false);
    expect(shard.consolidated_at).toBeNull();
  });

  test("EpisodicShard accepts provided fields", () => {
    const shard = new EpisodicShard({
      id: "id1",
      timestamp: 999,
      text: "hello",
      mood: "calm",
      anomaly: 0.5,
      latent_magnitude: 2,
      tags: ["a", "b"],
      embedding: [0.1, 0.2],
      consolidated: true,
      consolidated_at: 777
    });

    expect(shard.id).toBe("id1");
    expect(shard.timestamp).toBe(999);
    expect(shard.text).toBe("hello");
    expect(shard.mood).toBe("calm");
    expect(shard.anomaly).toBe(0.5);
    expect(shard.latent_magnitude).toBe(2);
    expect(shard.tags).toEqual(["a", "b"]);
    expect(shard.embedding).toEqual([0.1, 0.2]);
    expect(shard.consolidated).toBe(true);
    expect(shard.consolidated_at).toBe(777);
  });

  // ---------------------------------------------------------
  // TertiaryRecord
  // ---------------------------------------------------------
  test("TertiaryRecord initializes with defaults", () => {
    const rec = new TertiaryRecord();

    expect(rec.id).toBe("mock-uuid");
    expect(rec.created_at).toBe(123456789);
    expect(rec.updated_at).toBe(123456789);
    expect(rec.theme).toBe("");
    expect(rec.summary).toBe("");
    expect(rec.tags).toEqual([]);
    expect(rec.mood_profile).toEqual({});
    expect(rec.shard_ids).toEqual([]);
    expect(rec.strength).toBe(0);
    expect(rec.embedding).toBeNull();
  });

  test("TertiaryRecord accepts provided fields", () => {
    const rec = new TertiaryRecord({
      id: "id2",
      created_at: 111,
      updated_at: 222,
      theme: "memory",
      summary: "summary text",
      tags: ["x"],
      mood_profile: { calm: 1 },
      shard_ids: ["s1", "s2"],
      strength: 0.9,
      embedding: [0.3, 0.4]
    });

    expect(rec.id).toBe("id2");
    expect(rec.created_at).toBe(111);
    expect(rec.updated_at).toBe(222);
    expect(rec.theme).toBe("memory");
    expect(rec.summary).toBe("summary text");
    expect(rec.tags).toEqual(["x"]);
    expect(rec.mood_profile).toEqual({ calm: 1 });
    expect(rec.shard_ids).toEqual(["s1", "s2"]);
    expect(rec.strength).toBe(0.9);
    expect(rec.embedding).toEqual([0.3, 0.4]);
  });

  // ---------------------------------------------------------
  // UUID generation
  // ---------------------------------------------------------
  test("UUID is generated when no id is provided", () => {
    new EpisodicShard();
    new TertiaryRecord();

    expect(uuidv4).toHaveBeenCalledTimes(2);
  });
});
