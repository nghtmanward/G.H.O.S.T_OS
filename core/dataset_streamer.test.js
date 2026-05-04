const fs = require("fs");
const path = require("path");

jest.mock("fs");

const { DatasetStreamer } = require("./dataset_streamer");

describe("DatasetStreamer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ------------------------------------------------------------
  // MNIST LOADING
  // ------------------------------------------------------------
  test("loadMNIST loads and parses CSV correctly", () => {
    const csv =
      "label,p0,p1,p2\n" +
      "5,1,2,3\n" +
      "3,4,5,6\n";

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(csv);

    const ds = new DatasetStreamer("mnist");
    ds.loadMNIST();

    expect(ds.mnistLoaded).toBe(true);
    expect(ds.mnistRows.length).toBe(2);

    expect(ds.mnistRows[0].label).toBe(5);
    expect(ds.mnistRows[0].pixels.length).toBe(784);
    expect(ds.mnistRows[0].pixels[0]).toBe(1);
  });

  test("loadMNIST throws when file missing", () => {
    fs.existsSync.mockReturnValue(false);

    const ds = new DatasetStreamer("mnist");
    expect(() => ds.loadMNIST()).toThrow("MNIST dataset not found");
  });

  test("streamMNIST returns row or null", async () => {
    const csv =
      "label,p0,p1,p2\n" +
      "5,1,2,3\n";

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(csv);

    const ds = new DatasetStreamer("mnist");
    const row0 = await ds.streamMNIST(0);
    const row1 = await ds.streamMNIST(1);

    expect(row0.label).toBe(5);
    expect(row1).toBeNull();
  });

  // ------------------------------------------------------------
  // CIFAR BATCH LOADING
  // ------------------------------------------------------------
  test("loadCIFARBatch parses binary batch correctly", () => {
    const label = 7;
    const pixels = Array(3072).fill(128);
    const buffer = Buffer.from([label, ...pixels]);

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(buffer);

    const ds = new DatasetStreamer("cifar");
    const { images, labels } = ds.loadCIFARBatch("dummy.bin");

    expect(labels[0]).toBe(7);
    expect(images[0].length).toBe(3072);
    expect(images[0][0]).toBe(128);
  });

  test("loadCIFARBatch throws when file missing", () => {
    fs.existsSync.mockReturnValue(false);

    const ds = new DatasetStreamer("cifar");
    expect(() => ds.loadCIFARBatch("missing.bin")).toThrow("CIFAR batch file missing");
  });

  // ------------------------------------------------------------
  // CIFAR FULL LOADING
  // ------------------------------------------------------------
  test("loadCIFAR loads all 5 batches", () => {
    const label = 3;
    const pixels = Array(3072).fill(10);
    const buffer = Buffer.from([label, ...pixels]);

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(buffer);

    const ds = new DatasetStreamer("cifar");
    ds.loadCIFAR();

    expect(ds.cifarLoaded).toBe(true);
    expect(ds.cifarImages.length).toBe(5); // 5 batches × 1 record each
    expect(ds.cifarLabels.length).toBe(5);
  });

  test("streamCIFAR returns sample or null", async () => {
    const label = 1;
    const pixels = Array(3072).fill(20);
    const buffer = Buffer.from([label, ...pixels]);

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(buffer);

    const ds = new DatasetStreamer("cifar");
    await ds.streamCIFAR(0); // triggers loadCIFAR — loads 5 batches × 1 record = 5 total

    const sample0 = await ds.streamCIFAR(0);
    const sampleNull = await ds.streamCIFAR(5); // index 5 is out of bounds → null

    expect(sample0.label).toBe(1);
    expect(sample0.pixels.length).toBe(3072);
    expect(sampleNull).toBeNull();
  });

  // ------------------------------------------------------------
  // UNIFIED STREAMING
  // ------------------------------------------------------------
  test("stream routes to MNIST", async () => {
    const csv =
      "label,p0,p1,p2\n" +
      "5,1,2,3\n";

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(csv);

    const ds = new DatasetStreamer("mnist");
    const out = await ds.stream(0);

    expect(out.label).toBe(5);
  });

  test("stream routes to CIFAR", async () => {
    const label = 9;
    const pixels = Array(3072).fill(33);
    const buffer = Buffer.from([label, ...pixels]);

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(buffer);

    const ds = new DatasetStreamer("cifar");
    const out = await ds.stream(0);

    expect(out.label).toBe(9);
  });

  test("stream returns null for unknown dataset", async () => {
    const ds = new DatasetStreamer("unknown");
    const out = await ds.stream(0);
    expect(out).toBeNull();
  });
});