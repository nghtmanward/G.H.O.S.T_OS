// core/dataset_streamer.js

const fs = require("fs");
const path = require("path");

class DatasetStreamer {
    constructor(dataset = "mnist") {
        this.dataset = dataset.toLowerCase();

        // MNIST fields
        this.mnistPath = path.join(__dirname, "..", "datasets", "mnist", "train.csv");
        this.mnistRows = [];
        this.mnistLoaded = false;
        this.expectedPixels = 784;

        // CIFAR fields (pure JS loader)
        this.cifarLoaded = false;
        this.cifarImages = [];
        this.cifarLabels = [];
        this.cifarCount = 50000; // 5 × 10k
        this.cifarDir = path.join(__dirname, "..", "datasets", "cifar10");
    }

    // ------------------------------------------------------------
    // MNIST LOADING
    // ------------------------------------------------------------
    loadMNIST() {
        if (this.mnistLoaded) return;

        if (!fs.existsSync(this.mnistPath)) {
            console.error("MNIST dataset missing:", this.mnistPath);
            throw new Error("MNIST dataset not found");
        }

        const raw = fs.readFileSync(this.mnistPath, "utf8");
        const lines = raw.split("\n").filter(l => l.trim().length > 0);

        lines.shift(); // remove header

        this.mnistRows = lines.map((line) => {
            const nums = line.split(",").map(Number);
            const label = nums[0];
            let pixels = nums.slice(1);

            // Normalize pixel count
            if (pixels.length < this.expectedPixels) {
                pixels = pixels.concat(Array(this.expectedPixels - pixels.length).fill(0));
            } else if (pixels.length > this.expectedPixels) {
                pixels = pixels.slice(0, this.expectedPixels);
            }

            pixels = pixels.map(v => (isFinite(v) ? v : 0));

            return { label, pixels };
        });

        this.mnistLoaded = true;
        console.log(`📁 Loaded MNIST dataset: ${this.mnistRows.length} samples`);
    }

    async streamMNIST(offset = 0) {
        if (!this.mnistLoaded) this.loadMNIST();
        if (offset >= this.mnistRows.length) return null;
        return this.mnistRows[offset];
    }

    // ------------------------------------------------------------
    // PURE-JS CIFAR-10 LOADING
    // ------------------------------------------------------------
    loadCIFARBatch(filePath) {
        if (!fs.existsSync(filePath)) {
            console.error("Missing CIFAR batch:", filePath);
            throw new Error("CIFAR batch file missing");
        }

        const buffer = fs.readFileSync(filePath);
        const recordSize = 1 + 3072; // label + pixels
        const numRecords = buffer.length / recordSize;

        const images = [];
        const labels = [];

        for (let i = 0; i < numRecords; i++) {
            const start = i * recordSize;
            const label = buffer[start];
            const pixels = Array.from(buffer.slice(start + 1, start + 1 + 3072));

            labels.push(label);
            images.push(pixels);
        }

        return { images, labels };
    }

    loadCIFAR() {
        if (this.cifarLoaded) return;

        console.log("📁 Loading CIFAR-10 dataset (pure JS)…");

        const batches = [
            "data_batch_1.bin",
            "data_batch_2.bin",
            "data_batch_3.bin",
            "data_batch_4.bin",
            "data_batch_5.bin"
        ];

        for (const batch of batches) {
            const filePath = path.join(this.cifarDir, batch);
            const { images, labels } = this.loadCIFARBatch(filePath);

            this.cifarImages.push(...images);
            this.cifarLabels.push(...labels);
        }

        this.cifarLoaded = true;
        console.log(`📁 CIFAR-10 loaded: ${this.cifarImages.length} samples`);
    }

    async streamCIFAR(offset = 0) {
        if (!this.cifarLoaded) this.loadCIFAR();
        if (offset >= this.cifarImages.length) return null;

        return {
            label: this.cifarLabels[offset],
            pixels: this.cifarImages[offset]
        };
    }

    // ------------------------------------------------------------
    // UNIFIED STREAMING API
    // ------------------------------------------------------------
    async stream(offset = 0) {
        switch (this.dataset) {
            case "mnist":
                return this.streamMNIST(offset);

            case "cifar":
            case "cifar10":
                return this.streamCIFAR(offset);

            default:
                console.warn(`⚠️ Unknown dataset "${this.dataset}".`);
                return null;
        }
    }
}

module.exports = { DatasetStreamer };