const UnrealWorldAPI = require("./unreal_world_api");

describe("UnrealWorldAPI (stub)", () => {
  test("module loads and initializes", () => {
    const api = new UnrealWorldAPI();
    expect(api).toBeDefined();
  });

  test("sendExperimentRequest returns stub response", async () => {
    const api = new UnrealWorldAPI();
    const out = await api.sendExperimentRequest("dropTest", { height: 5 });

    expect(out.status).toBe("stub");
    expect(out.type).toBe("dropTest");
    expect(out.payload).toEqual({ height: 5 });
  });

  test("getExperimentResult returns stub response", async () => {
    const api = new UnrealWorldAPI();
    const out = await api.getExperimentResult("exp123");

    expect(out.status).toBe("stub");
    expect(out.id).toBe("exp123");
    expect(out.result).toBe("No real world data yet.");
  });
});
