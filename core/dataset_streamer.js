// core/dataset_streamer.js

const fs = require("fs");
const path = require("path");

class DatasetStreamer {
    constructor() {
        this.datasetPath = path.join(__dirname, "..", "datasets", "mnist", "train.csv");
        this.rows = [];
        this.loaded = false;
        this.expectedPixels = 784;
    }

    loadCSV() {
        if (this.loaded) return;

        const raw = fs.readFileSync(this.datasetPath, "utf8");

        // Split into lines and remove empty ones
        const lines = raw.split("\n").filter(l => l.trim().length > 0);

        // Remove header row
        lines.shift();

        this.rows = lines.map((line, idx) => {
            const parts = line.split(",");

            // Convert all values to numbers
            const nums = parts.map(v => Number(v));

            const label = nums[0];
            let pixels = nums.slice(1);

            // Fix short rows (rare but happens in some Kaggle exports)
            if (pixels.length < this.expectedPixels) {
                const missing = this.expectedPixels - pixels.length;
                console.warn(`⚠️ Row ${idx} is short by ${missing} pixels. Padding with zeros.`);
                pixels = pixels.concat(Array(missing).fill(0));
            }

            // Fix long rows (also rare)
            if (pixels.length > this.expectedPixels) {
                console.warn(`⚠️ Row ${idx} has extra pixels. Truncating.`);
                pixels = pixels.slice(0, this.expectedPixels);
            }

            // Sanitize NaN or invalid values
            pixels = pixels.map(v => (isFinite(v) ? v : 0));

            return { label, pixels };
        });

        this.loaded = true;
        console.log(`📁 Loaded MNIST dataset locally: ${this.rows.length} samples`);
    }

    async streamMNIST(offset = 0) {
        if (!this.loaded) this.loadCSV();

        if (offset >= this.rows.length) return null;

        return this.rows[offset];
    }
}

module.exports = { DatasetStreamer };