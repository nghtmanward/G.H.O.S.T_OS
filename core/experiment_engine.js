// core/experiment_engine.js

class ExperimentEngine {
  constructor({ worldAPI, episodic, theoryEngine, logger = console }) {
    this.world = worldAPI;          // Unreal World API wrapper
    this.episodic = episodic;       // JS episodic memory mirror
    this.theory = theoryEngine;     // TheoryEngine instance (can be stubbed)
    this.log = logger;

    this.activeExperiment = null;
    this.lastRunTimestamp = 0;
    this.minIntervalMs = 10_000;    // don’t spam experiments every tick
  }

  // ---------------------------------------------------------
  // Utility
  // ---------------------------------------------------------
  _now() {
    return Date.now();
  }

  _shouldRun() {
    const now = this._now();
    return now - this.lastRunTimestamp > this.minIntervalMs;
  }

  // ---------------------------------------------------------
  // Public entry point from main.js
  // ---------------------------------------------------------
  async maybeRunExperiment(perceptionSnapshot) {
    if (!this._shouldRun()) {
      return null;
    }

    try {
      this.lastRunTimestamp = this._now();

      const cycle = await this.runFullExperimentCycle(perceptionSnapshot);

      this.episodic.addEpisode({
        type: "experiment_cycle",
        data: {
          hypothesis: cycle.hypothesis,
          analysis: cycle.analysis,
          theoryUpdate: cycle.theoryUpdate
        },
        timestamp: this._now(),
        source: "ExperimentEngine"
      });

      return cycle;
    } catch (err) {
      this.log.error("[ExperimentEngine] Error in experiment cycle:", err);
      this.episodic.addEpisode({
        type: "experiment_error",
        text: String(err),
        timestamp: this._now(),
        source: "ExperimentEngine"
      });
      return null;
    }
  }

  // ---------------------------------------------------------
  // Full cycle
  // ---------------------------------------------------------
  async runFullExperimentCycle(perceptionSnapshot) {
    const hypothesis = this.generateHypothesis(perceptionSnapshot);
    const plan = this.planExperiment(hypothesis);
    const results = await this.runExperiment(plan);
    const analysis = this.analyzeResults(results, hypothesis);
    const theoryUpdate = this.updateTheory(analysis, hypothesis);

    return {
      hypothesis,
      plan,
      results,
      analysis,
      theoryUpdate
    };
  }

  // ---------------------------------------------------------
  // 1) Hypothesis generation
  // ---------------------------------------------------------
  generateHypothesis(perceptionSnapshot) {
    // Minimal starter: gravity hypothesis
    const hyp = {
      id: "hyp_" + this._now(),
      statement: "Objects in this world fall with approximately constant acceleration.",
      domain: "physics.gravity",
      variables: ["height", "time", "acceleration"],
      expectedRelationship: "acceleration ≈ constant",
      confidence: 0.1,
      context: perceptionSnapshot || null
    };

    this.episodic.addEpisode({
      type: "hypothesis",
      text: hyp.statement,
      data: hyp,
      timestamp: this._now(),
      source: "ExperimentEngine"
    });

    this.log.info("[ExperimentEngine] Generated hypothesis:", hyp.statement);
    return hyp;
  }

  // ---------------------------------------------------------
  // 2) Experiment planning
  // ---------------------------------------------------------
  planExperiment(hypothesis) {
    // Simple drop test at multiple heights
    const plan = {
      hypothesisId: hypothesis.id,
      type: "drop_test",
      trials: [
        { mass: 1, height: 5 },
        { mass: 1, height: 10 },
        { mass: 1, height: 20 }
      ]
    };

    this.activeExperiment = plan;

    this.episodic.addEpisode({
      type: "experiment_plan",
      data: plan,
      timestamp: this._now(),
      source: "ExperimentEngine"
    });

    this.log.info("[ExperimentEngine] Planned experiment:", plan.type);
    return plan;
  }

  // ---------------------------------------------------------
  // 3) Execute experiment via Unreal World API
  // ---------------------------------------------------------
  async runExperiment(plan) {
    if (!plan) {
      this.log.warn("[ExperimentEngine] No plan provided to runExperiment.");
      return [];
    }

    if (!this.world || typeof this.world.startDropTest !== "function") {
      this.log.warn("[ExperimentEngine] World API not ready or missing startDropTest.");
      return [];
    }

    const results = [];

    for (const trial of plan.trials) {
      try {
        // Start trial in Unreal
        const trialInfo = await this.world.startDropTest(trial);
        const trialId = trialInfo.trialId ?? trialInfo.id ?? null;

        if (!trialId) {
          this.log.warn("[ExperimentEngine] Missing trialId from world for trial:", trial);
          continue;
        }

        // Get measurement from Unreal
        const measurement = await this.world.getDropTestResult(trialId);

        const merged = {
          trialId,
          ...trial,
          ...measurement
        };

        results.push(merged);

        this.episodic.addEpisode({
          type: "experiment_trial",
          data: merged,
          timestamp: this._now(),
          source: "ExperimentEngine"
        });

        this.log.info("[ExperimentEngine] Trial result:", merged);
      } catch (err) {
        this.log.error("[ExperimentEngine] Error during trial:", err);
        this.episodic.addEpisode({
          type: "experiment_trial_error",
          text: String(err),
          data: { trial },
          timestamp: this._now(),
          source: "ExperimentEngine"
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------
  // 4) Analyze results
  // ---------------------------------------------------------
  analyzeResults(results, hypothesis) {
    if (!results || results.length === 0) {
      this.log.warn("[ExperimentEngine] No results to analyze.");
      return {
        hypothesisId: hypothesis.id,
        meanAcceleration: null,
        variance: null,
        confidence: 0
      };
    }

    const accels = results
      .map(r => r.acceleration)
      .filter(a => Number.isFinite(a));

    if (accels.length === 0) {
      this.log.warn("[ExperimentEngine] No valid acceleration data in results.");
      return {
        hypothesisId: hypothesis.id,
        meanAcceleration: null,
        variance: null,
        confidence: 0
      };
    }

    const mean =
      accels.reduce((a, b) => a + b, 0) / accels.length;

    const variance =
      accels.reduce((a, b) => a + (b - mean) ** 2, 0) / accels.length;

    // Simple confidence: lower variance → higher confidence
    const confidence = 1 / (1 + variance);

    const analysis = {
      hypothesisId: hypothesis.id,
      meanAcceleration: mean,
      variance,
      confidence,
      sampleCount: accels.length
    };

    this.episodic.addEpisode({
      type: "experiment_analysis",
      data: analysis,
      timestamp: this._now(),
      source: "ExperimentEngine"
    });

    this.log.info("[ExperimentEngine] Analysis:", analysis);
    return analysis;
  }

  // ---------------------------------------------------------
  // 5) Update theory
  // ---------------------------------------------------------
  updateTheory(analysis, hypothesis) {
    if (!this.theory || typeof this.theory.update !== "function") {
      this.log.warn("[ExperimentEngine] No TheoryEngine available; skipping theory update.");
      return null;
    }

    const update = this.theory.update(hypothesis, analysis);

    this.episodic.addEpisode({
      type: "theory_update",
      data: update,
      timestamp: this._now(),
      source: "ExperimentEngine"
    });

    this.log.info("[ExperimentEngine] Theory updated.");
    return update;
  }
}

module.exports = ExperimentEngine;