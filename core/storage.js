// /core/storage.js

const fs = require("fs");
const path = require("path");

const SHARD_PATH = path.join(__dirname, "../memory/shards.json");
const TERTIARY_PATH = path.join(__dirname, "../memory/tertiary.json");

// -----------------------------
// Ensure memory directory exists
// -----------------------------
function ensureMemoryDir() {
    const dir = path.join(__dirname, "../memory");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// -----------------------------
// Load JSON safely
// -----------------------------
function loadJSON(filePath) {
    try {
        if (!fs.existsSync(filePath)) return [];
        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Error loading JSON:", err);
        return [];
    }
}

// -----------------------------
// Save JSON safely
// -----------------------------
function saveJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
        console.error("Error saving JSON:", err);
    }
}

// -----------------------------
// Load Episodic Shards
// -----------------------------
function loadShards() {
    ensureMemoryDir();
    return loadJSON(SHARD_PATH);
}

// -----------------------------
// Save Episodic Shards
// -----------------------------
function saveShards(shards) {
    ensureMemoryDir();
    saveJSON(SHARD_PATH, shards);
}

// -----------------------------
// Load Tertiary Records
// -----------------------------
function loadTertiary() {
    ensureMemoryDir();
    return loadJSON(TERTIARY_PATH);
}

// -----------------------------
// Save Tertiary Records
// -----------------------------
function saveTertiary(records) {
    ensureMemoryDir();
    saveJSON(TERTIARY_PATH, records);
}

module.exports = {
    loadShards,
    saveShards,
    loadTertiary,
    saveTertiary
};