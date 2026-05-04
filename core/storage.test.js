const fs = require("fs");
const path = require("path");

jest.mock("fs");
jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/"))
}));

const {
  loadShards,
  saveShards,
  loadTertiary,
  saveTertiary
} = require("./storage");

describe("storage.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.readFileSync.mockImplementation(() => "[]");
    fs.writeFileSync.mockImplementation(() => {});
  });

  // ---------------------------------------------------------
  // ensureMemoryDir (implicit via load/save)
  // ---------------------------------------------------------
  test("loadShards ensures memory directory exists", () => {
    fs.existsSync.mockReturnValueOnce(false); // memory dir missing

    loadShards();

    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  test("saveShards ensures memory directory exists", () => {
    fs.existsSync.mockReturnValueOnce(false);

    saveShards([{ a: 1 }]);

    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // loadJSON behavior (via loadShards/loadTertiary)
  // ---------------------------------------------------------
  test("loadShards returns empty array when file missing", () => {
    fs.existsSync.mockReturnValueOnce(true)  // memory dir exists
                 .mockReturnValueOnce(false); // shards.json missing

    const out = loadShards();
    expect(out).toEqual([]);
  });

  test("loadShards loads valid JSON", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([{ id: 1 }]));

    const out = loadShards();
    expect(out).toEqual([{ id: 1 }]);
  });

  test("loadShards handles corrupted JSON safely", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => "{bad json");

    const error = jest.spyOn(console, "error").mockImplementation(() => {});

    const out = loadShards();

    expect(out).toEqual([]);
    expect(error).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // saveJSON behavior (via saveShards/saveTertiary)
  // ---------------------------------------------------------
  test("saveShards writes JSON to disk", () => {
    saveShards([{ id: 1 }]);

    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test("saveShards handles write errors safely", () => {
    fs.writeFileSync.mockImplementation(() => {
      throw new Error("disk full");
    });

    const error = jest.spyOn(console, "error").mockImplementation(() => {});

    saveShards([{ id: 1 }]);

    expect(error).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // loadTertiary
  // ---------------------------------------------------------
  test("loadTertiary loads valid JSON", () => {
    fs.readFileSync.mockReturnValue(JSON.stringify([{ t: 1 }]));

    const out = loadTertiary();
    expect(out).toEqual([{ t: 1 }]);
  });

  test("loadTertiary handles corrupted JSON", () => {
    fs.readFileSync.mockImplementation(() => "{bad json");

    const error = jest.spyOn(console, "error").mockImplementation(() => {});

    const out = loadTertiary();

    expect(out).toEqual([]);
    expect(error).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // saveTertiary
  // ---------------------------------------------------------
  test("saveTertiary writes JSON to disk", () => {
    saveTertiary([{ t: 1 }]);

    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test("saveTertiary handles write errors", () => {
    fs.writeFileSync.mockImplementation(() => {
      throw new Error("write error");
    });

    const error = jest.spyOn(console, "error").mockImplementation(() => {});

    saveTertiary([{ t: 1 }]);

    expect(error).toHaveBeenCalled();
  });
});
