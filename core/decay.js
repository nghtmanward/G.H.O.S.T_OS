// /core/decay.js

// -----------------------------
// Exponential Decay Function
// -----------------------------
function applyDecay(record, lambda = 0.001) {
    const now = Date.now();
    const ageMs = now - record.updated_at;

    // Convert age to days
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // Exponential decay: strength = strength * e^(-λ * age)
    const newStrength = record.strength * Math.exp(-lambda * ageDays);

    record.strength = newStrength;
    return record;
}

// -----------------------------
// Prune Weak Records
// -----------------------------
function prune(records, minStrength = 0.05) {
    return records.filter(r => r.strength >= minStrength);
}

// -----------------------------
// Full Decay Pass
// -----------------------------
function decay(tertiaryRecords, options = {}) {
    const lambda = options.lambda || 0.001;
    const minStrength = options.minStrength || 0.05;

    // Apply decay to each record
    for (const record of tertiaryRecords) {
        applyDecay(record, lambda);
    }

    // Remove weak records
    const pruned = prune(tertiaryRecords, minStrength);

    return pruned;
}

module.exports = {
    applyDecay,
    prune,
    decay
};