// core/ghost_node.js

class GhostNode {
  constructor(inputDim = 8, latentDim = 16) {
    this.layer1 = [];       // Raw events
    this.layer2 = {};       // User → action frequencies
    this.transitions = {};  // User → action transitions
    this.resources = {};    // User → accessed resources
    this.layer3 = null;     // Predictive depth
    this.anomalyHistory = [];

    // Thinking substrate
    this.inputDim = inputDim;
    this.latentDim = latentDim;
    this.logicState = Array(latentDim).fill(0).map(() => Math.random() * 2 - 1);
    this.predictiveField = Array(latentDim).fill(0);
  }

  ingestEvent(event) {
    this.layer1.push(event);
    this.updateStructure(event);
    this.updatePrediction(event);
    this.updateThinking(event);
  }

  updateStructure(event) {
    // Frequency tracking
    if (!this.layer2[event.user]) this.layer2[event.user] = {};
    if (!this.layer2[event.user][event.action]) this.layer2[event.user][event.action] = 0;
    this.layer2[event.user][event.action]++;

    // Transition tracking
    const prevEvent = this.layer1[this.layer1.length - 2];
    if (prevEvent && prevEvent.user === event.user) {
      const key = `${prevEvent.action}->${event.action}`;
      if (!this.transitions[key]) this.transitions[key] = 0;
      this.transitions[key]++;
    }

    // Resource tracking
    if (!this.resources[event.user]) this.resources[event.user] = new Set();
    this.resources[event.user].add(event.resource);
  }

  updatePrediction(event) {
    let anomalyScore = 0;

    // Frequency anomaly
    const freq = this.layer2[event.user][event.action];
    if (freq === 1) anomalyScore += 0.3;

    // Transition anomaly
    const prevEvent = this.layer1[this.layer1.length - 2];
    if (prevEvent && prevEvent.user === event.user) {
      const key = `${prevEvent.action}->${event.action}`;
      if (!this.transitions[key] || this.transitions[key] < 2) {
        anomalyScore += 0.3;
      }
    }

    // Timing anomaly
    const now = event.timestamp || Date.now();
    const windowMs = 5000;
    const recentEvents = this.layer1.filter(e => now - e.timestamp < windowMs && e.user === event.user);
    if (recentEvents.length > 3) anomalyScore += 0.3;

    // Resource anomaly
    if (event.resource && !this.resources[event.user].has(event.resource)) {
      anomalyScore += 0.3;
    }

    anomalyScore = Math.min(1, anomalyScore);

    this.anomalyHistory.push(anomalyScore);
    if (this.anomalyHistory.length > 50) this.anomalyHistory.shift();

    let mood = "calm";
    if (anomalyScore > 0.8) mood = "alert";
    else if (anomalyScore > 0.5) mood = "curious";

    const avgScore = this.anomalyHistory.reduce((a, b) => a + b, 0) / this.anomalyHistory.length;
    if (avgScore > 0.6) mood = "eerie";
    if (this.layer1.length > 200 && avgScore < 0.2) mood = "ancient";

    this.layer3 = { anomalyScore, mood };
  }

  updateThinking(event) {
    // Convert event into a simple binary vector
    const inputBits = Array(this.inputDim).fill(0);
    const hash = Math.abs(this.hashAction(event.action)) % this.inputDim;
    inputBits[hash] = 1;

    // Update predictive field: combine input with logic state
    this.predictiveField = this.logicState.map((val, i) => {
      return Math.tanh(val + inputBits.reduce((sum, bit, j) => sum + bit * (Math.random() - 0.5), 0));
    });

    // Plasticity: logic state mutates toward predictive field
    this.logicState = this.logicState.map((val, i) => 0.9 * val + 0.1 * this.predictiveField[i]);
  }

  hashAction(action) {
    // Simple hash for mapping actions to indices
    let hash = 0;
    for (let i = 0; i < action.length; i++) {
      hash = (hash << 5) - hash + action.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

module.exports = GhostNode;