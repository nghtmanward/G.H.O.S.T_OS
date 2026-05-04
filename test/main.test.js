test("main.js loads without crashing", () => {
  expect(() => require("../main")).not.toThrow();
});
