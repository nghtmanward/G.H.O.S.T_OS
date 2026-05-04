test("renderer.js loads without crashing", () => {
  expect(() => require("../renderer")).not.toThrow();
});
