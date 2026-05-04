test("preload exposes ghost API", () => {
  const preload = require("../preload");

  // Simulate window object
  global.window = {};
  global.contextBridge = {
    exposeInMainWorld: (key, api) => {
      window[key] = api;
    }
  };

  // Re-require preload to trigger exposure
  require("../preload");

  expect(window.ghost).toBeDefined();
  expect(typeof window.ghost.sendMouseMove).toBe("function");
});
