class UnrealWorldAPI {
    constructor() {
        console.log("[WORLD_API] UnrealWorldAPI initialized (stub).");
    }

    async sendExperimentRequest(type, payload) {
        console.log(`[WORLD_API] Experiment request (stub): ${type}`, payload);

        return {
            status: "stub",
            message: "Unreal world not connected yet.",
            type,
            payload
        };
    }

    async getExperimentResult(id) {
        console.log(`[WORLD_API] getExperimentResult (stub): ${id}`);

        return {
            status: "stub",
            id,
            result: "No real world data yet."
        };
    }
}

module.exports = UnrealWorldAPI;