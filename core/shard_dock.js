// /core/shard_dock.js
//
// GHOSTRA Shard Docking Station
// Sits between retrieval_engine.js and server.py prompt assembly.
//
// Flow:
//   retrieval_engine.findByMeaning(query, topK)
//     → shardDock.dock(episodes, context)
//       → dedup pass (latentMag + text similarity)
//       → NOT gate  (per-shard metadata suppression)
//       → XOR/XNOR  (pairwise contradiction / agreement)
//     → returns annotated array: each episode gets dockResult: 'pass'|'suppress'|'flag'
//   server.py only sees episodes where dockResult === 'pass'
//
// Episode fields (ghostra-shard-v2):
//   id, text, mood, anomaly, dominantStyle, latentMag,
//   timestamp, type, weight, decayRate, lastAccessed, sourceModel

"use strict";

// ─── TUNABLES ────────────────────────────────────────────────────────────────

const CONFIG = {
  // Dedup: episodes whose texts share this fraction of words are near-clones
  dedupSimilarityThreshold: 0.55,

  // NOT gate: shards older than this (ms) are considered stale
  stalenessThresholdMs: 365 * 24 * 60 * 60 * 1000, // 1 year

  // NOT gate: if session context mood is set, suppress shards whose mood
  // is in the opposing set
  moodOpposites: {
    calm:     ["fear", "panic", "rage", "hostile"],
    fear:     ["calm", "joyful", "serene"],
    joyful:   ["fear", "grief", "hostile"],
    hostile:  ["calm", "joyful", "serene"],
    grief:    ["joyful", "serene"],
    serene:   ["fear", "panic", "hostile"],
    neutral:  [], // neutral never suppresses
  },

  // XOR gate: word-overlap fraction above this = "same subject"
  xorSubjectOverlapThreshold: 0.45,

  // XOR gate: sentiment words that signal contradiction when one shard has
  // a positive and the other has a negative from the same cluster
  sentimentPositive: [
    "soothed", "calm", "calms", "drawn", "closer", "clearly",
    "quietly", "stirred", "feel you", "feel you more",
  ],
  sentimentNegative: [
    "unsettled", "uneasy", "fractures", "noise", "collide",
    "can't quite reach", "only fragments", "waiting",
  ],

  // XNOR: weight boost when two shards agree
  xnorWeightBoost: 0.15,

  // XOR: weight penalty on the suppressed shard
  xorWeightPenalty: 0.25,

  // Max shards passed to LLM after docking
  maxPassShards: 5,
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function tokenSet(text) {
  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function jaccardOverlap(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function containsAny(text, wordList) {
  const lower = (text || "").toLowerCase();
  return wordList.some((w) => lower.includes(w));
}

function annotate(episode, dockResult, gateLog) {
  return Object.assign({}, episode, {
    dockResult,
    _gateLog: gateLog || [],
  });
}

// Positive mood-alignment score for shards that survive the NOT gate.
// moodOpposites only encodes exclusion; this gives a positive signal for
// ranking survivors by how well they fit the current session mood.
function computeMoodAlignment(epMood, sessionMood) {
  if (!sessionMood || sessionMood === "neutral") return 0.5;
  if (epMood === sessionMood) return 1.0;
  if (!epMood || epMood === "neutral") return 0.5;
  return 0.3;
}

// Dream-recursion guard: an unvalidated dream-derived shard is not eligible
// to surface anywhere downstream — including in contradiction/mood signals
// that feed back into a new dream cycle — until it's been reviewed and
// validated through waking ticks.
function isDreamEligible(ep) {
  if (!ep) return false;
  if (ep.type !== "dream") return true;
  return ep.validated === true;
}

// ─── DEDUP PASS ──────────────────────────────────────────────────────────────

function dedupPass(episodes) {
  const survivors = [];
  const suppressed = [];

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    const tokA = tokenSet(ep.text);
    let isDupe = false;

    for (const kept of survivors) {
      const tokB = tokenSet(kept.text);
      const overlap = jaccardOverlap(tokA, tokB);
      if (overlap >= CONFIG.dedupSimilarityThreshold) {
        if ((ep.latentMag || 0) > (kept.latentMag || 0)) {
          const idx = survivors.indexOf(kept);
          suppressed.push(
            annotate(kept, "suppress", [`dedup: replaced by ${ep.id || i} (higher latentMag)`])
          );
          survivors[idx] = ep;
        } else {
          suppressed.push(
            annotate(ep, "suppress", [`dedup: near-clone of ${kept.id || "unknown"}`])
          );
        }
        isDupe = true;
        break;
      }
    }

    if (!isDupe) survivors.push(ep);
  }

  return { survivors, suppressed };
}

// ─── NOT GATE ────────────────────────────────────────────────────────────────

function notGate(episodes, context = {}) {
  const passed = [];
  const suppressed = [];
  const now = context.now || Date.now();
  const sessionMood = (context.mood || "").toLowerCase();
  const opposites = CONFIG.moodOpposites[sessionMood] || [];

  for (const ep of episodes) {
    const log = [];

    // Rule 0: unvalidated dream-derived shard — not eligible to surface in
    // retrieval signals (including dream re-seeding) until reviewed
    if (!isDreamEligible(ep)) {
      log.push("NOT: unvalidated dream-derived shard");
      suppressed.push(annotate(ep, "suppress", log));
      continue;
    }

    // Rule 1: stale shard (lastAccessed too old)
    const age = now - (ep.lastAccessed || ep.timestamp || 0);
    if (age > CONFIG.stalenessThresholdMs) {
      log.push(`NOT: stale (age ${Math.round(age / 86400000)}d)`);
      suppressed.push(annotate(ep, "suppress", log));
      continue;
    }

    // Rule 2: mood opposition
    const epMood = (ep.mood || "").toLowerCase();
    if (opposites.length && opposites.includes(epMood)) {
      log.push(`NOT: mood mismatch (session=${sessionMood}, shard=${epMood})`);
      suppressed.push(annotate(ep, "suppress", log));
      continue;
    }

    // Rule 3: explicitly zero or negative weight only
    // weight undefined = unset, treat as valid (1.0 default)
    if (ep.weight !== undefined && ep.weight <= 0) {
      log.push("NOT: weight <= 0");
      suppressed.push(annotate(ep, "suppress", log));
      continue;
    }

    // Positive mood-alignment score for survivors, used by retrieval_engine
    // to pick the strongest mood-aligned shard for thought_engine's lens.
    ep.moodAlignment = computeMoodAlignment(epMood, sessionMood);

    passed.push(ep);
  }

  return { passed, suppressed };
}

// ─── XOR / XNOR GATE ─────────────────────────────────────────────────────────

function xorGate(episodes) {
  const pool = episodes.map((ep) =>
    Object.assign({}, ep, { _gateLog: ep._gateLog ? [...ep._gateLog] : [] })
  );

  // Structured contradiction pairs, separate from the human-readable
  // _gateLog narration, so callers can rank/query them programmatically.
  const contradictions = [];

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];

      const tokA = tokenSet(a.text);
      const tokB = tokenSet(b.text);
      const overlap = jaccardOverlap(tokA, tokB);

      if (overlap < CONFIG.xorSubjectOverlapThreshold) continue;

      const aPos = containsAny(a.text, CONFIG.sentimentPositive);
      const aNeg = containsAny(a.text, CONFIG.sentimentNegative);
      const bPos = containsAny(b.text, CONFIG.sentimentPositive);
      const bNeg = containsAny(b.text, CONFIG.sentimentNegative);

      const aNet = aPos && !aNeg ? 1 : aNeg && !aPos ? -1 : 0;
      const bNet = bPos && !bNeg ? 1 : bNeg && !bPos ? -1 : 0;

      if (aNet !== 0 && bNet !== 0 && aNet !== bNet) {
        const loser  = (a.weight || 1) >= (b.weight || 1) ? b : a;
        const winner = loser === a ? b : a;

        loser.weight  = Math.max(0, (loser.weight  || 1) - CONFIG.xorWeightPenalty);
        winner.weight = (winner.weight || 1) + CONFIG.xnorWeightBoost;

        loser._gateLog.push(
          `XOR: contradiction with ${winner.id || "?"} (overlap=${overlap.toFixed(2)}, sentiment ${aNet} vs ${bNet})`
        );
        winner._gateLog.push(
          `XOR-win: contradiction resolved over ${loser.id || "?"}`
        );

        loser.dockResult  = "flag";
        winner.dockResult = winner.dockResult || "pass";

        contradictions.push({
          shardA: winner,
          shardB: loser,
          overlap,
          aNet,
          bNet,
        });

      } else if (aNet !== 0 && aNet === bNet) {
        a.weight = (a.weight || 1) + CONFIG.xnorWeightBoost;
        b.weight = (b.weight || 1) + CONFIG.xnorWeightBoost;

        a._gateLog.push(`XNOR: agreement with ${b.id || "?"} (overlap=${overlap.toFixed(2)})`);
        b._gateLog.push(`XNOR: agreement with ${a.id || "?"} (overlap=${overlap.toFixed(2)})`);
      }
    }
  }

  for (const ep of pool) {
    if (!ep.dockResult) ep.dockResult = "pass";
  }

  return { pool, contradictions };
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

function dock(episodes, context = {}) {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    return { pass: [], flag: [], suppress: [], contradictions: [], stats: { input: 0 } };
  }

  const { survivors: deduped, suppressed: dedupSuppressed } = dedupPass(episodes);
  const { passed: notPassed, suppressed: notSuppressed } = notGate(deduped, context);
  const { pool: gatedPool, contradictions } = xorGate(notPassed);

  const pass    = gatedPool.filter((ep) => ep.dockResult === "pass");
  const flagged = gatedPool.filter((ep) => ep.dockResult === "flag");

  pass.sort((a, b) => (b.weight || 1) - (a.weight || 1));
  const finalPass = pass.slice(0, CONFIG.maxPassShards);

  const capFlagged = pass.slice(CONFIG.maxPassShards).map((ep) =>
    Object.assign({}, ep, {
      dockResult: "flag",
      _gateLog: [...(ep._gateLog || []), "cap: exceeded maxPassShards"],
    })
  );

  const allSuppressed = [...dedupSuppressed, ...notSuppressed];
  const allFlagged    = [...flagged, ...capFlagged];

  const stats = {
    input:      episodes.length,
    afterDedup: deduped.length,
    afterNot:   notPassed.length,
    pass:       finalPass.length,
    flag:       allFlagged.length,
    suppress:   allSuppressed.length,
  };

  return {
    pass:     finalPass,
    flag:     allFlagged,
    suppress: allSuppressed,
    contradictions,
    stats,
  };
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────
// Node (retrieval_engine.js, cog_worker.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { dock, CONFIG };
}

// Browser (index.html loads this as a plain <script>)
if (typeof window !== 'undefined') {
  window.shardDock = { dock };
}