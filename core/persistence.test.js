jest.mock("fs");

describe("Persistence", () => {
  let fs;
  let Persistence;

  beforeEach(() => {
    jest.resetModules();

    jest.mock("fs");
    jest.mock("./version_registry.js", () => ({
      Persistence: "1.1.0-2026.01.08"
    }));

    fs = require("fs");
    Persistence = require("./persistence");

    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(111111);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // constructor + version validation
  // ---------------------------------------------------------
  test("constructor loads registry and validates version", () => {
    expect(() => new Persistence("test.json")).not.toThrow();
  });

  test("constructor warns when registry missing", () => {
    jest.resetModules();
    jest.mock("fs");
    jest.mock("./version_registry.js", () => { throw new Error("missing"); });

    const PersistenceReloaded = require("./persistence");
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => new PersistenceReloaded("test.json")).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  test("constructor throws on version mismatch", () => {
    jest.resetModules();
    jest.mock("fs");
    jest.mock("./version_registry.js", () => ({
      Persistence: "WRONG"
    }));

    const PersistenceReloaded = require("./persistence");

    expect(() => new PersistenceReloaded("test.json")).toThrow("Version mismatch");
  });

  // ---------------------------------------------------------
  // save()
  // ---------------------------------------------------------
  test("save writes temp file then renames atomically", () => {
    const p = new Persistence("ghost.json");

    fs.writeFileSync.mockImplementation(() => {});
    fs.renameSync.mockImplementation(() => {});

    p.save({ a: 1 });

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.renameSync).toHaveBeenCalled();
  });

  test("save sanitizes state", () => {
    const p = new Persistence("ghost.json");

    const circular = {};
    circular.self = circular;

    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    p.save(circular);

    expect(warn).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // load()
  // ---------------------------------------------------------
  test("load returns null when file missing", () => {
    const p = new Persistence("ghost.json");

    fs.existsSync.mockReturnValue(false);

    expect(p.load()).toBeNull();
  });

  test("load handles new schema format", () => {
    const p = new Persistence("ghost.json");

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      schema: "ghost-state-v1",
      version: "1.1.0-2026.01.08",
      timestamp: 111,
      state: { x: 5 }
    }));

    const out = p.load();
    expect(out).toEqual({ x: 5 });
  });

  test("load handles legacy format", () => {
    const p = new Persistence("ghost.json");

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ legacy: true }));

    const out = p.load();
    expect(out).toEqual({ legacy: true });
  });

  test("load recovers from corrupted main file using temp backup", () => {
    const p = new Persistence("ghost.json");

    fs.existsSync.mockImplementation((file) => {
      if (file.endsWith(".tmp")) return true;
      return true;
    });

    fs.readFileSync.mockImplementation((file) => {
      if (file.endsWith(".tmp")) {
        return JSON.stringify({
          schema: "ghost-state-v1",
          version: "1.1.0-2026.01.08",
          timestamp: 111,
          state: { recovered: true }
        });
      }
      throw new Error("corrupted");
    });

    const out = p.load();
    expect(out).toEqual({ recovered: true });
  });

  test("load returns null when both main and backup are corrupted", () => {
    const p = new Persistence("ghost.json");

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => { throw new Error("corrupt"); });

    const error = jest.spyOn(console, "error").mockImplementation(() => {});

    const out = p.load();
    expect(out).toBeNull();
    expect(error).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // migrateIfNeeded()
  // ---------------------------------------------------------
  test("migrateIfNeeded returns wrapper.state", () => {
    const p = new Persistence("ghost.json");
    const out = p.migrateIfNeeded({ state: { a: 1 } });
    expect(out).toEqual({ a: 1 });
  });

  test("migrateIfNeeded returns null for invalid wrapper", () => {
    const p = new Persistence("ghost.json");
    expect(p.migrateIfNeeded(null)).toBeNull();
    expect(p.migrateIfNeeded("bad")).toBeNull();
  });

  // ---------------------------------------------------------
  // _sanitize()
  // ---------------------------------------------------------
  test("_sanitize removes unserializable data", () => {
    const p = new Persistence("ghost.json");

    const obj = { a: 1, b: () => {} };
    const out = p._sanitize(obj);

    expect(out).toEqual({ a: 1 });
  });

  test("_sanitize returns {} on circular reference", () => {
    const p = new Persistence("ghost.json");

    const circular = {};
    circular.self = circular;

    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const out = p._sanitize(circular);

    expect(out).toEqual({});
    expect(warn).toHaveBeenCalled();
  });
});