module.exports = {
  testEnvironment: "node",

  // Only run core engine tests
  testMatch: ["**/core/**/*.test.js"],

  // Ignore Electron UI tests
  testPathIgnorePatterns: [
    "<rootDir>/test/main.test.js",
    "<rootDir>/test/preload.test.js",
    "<rootDir>/test/renderer.test.js"
  ],

  collectCoverage: true,
  collectCoverageFrom: [
    "core/**/*.js",
    "core/math/**/*.js",
    "!core/**/index.js",
    "!core/**/deprecated/**",
    "!core/**/experimental/**"
  ],

  coveragePathIgnorePatterns: [
    "core/proof_engine.js",
    "core/unreal_world_api.js",
    "main.js",
    "preload.js",
    "renderer.js",
    "<rootDir>/native/"
  ],

  modulePathIgnorePatterns: ["<rootDir>/native/"],

  // ⭐ CRITICAL: ensure all engines load the mocked version_registry
  moduleNameMapper: {
    "^./version_registry$": "<rootDir>/__mocks__/version_registry.js"
  },

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  coverageReporters: ["text", "lcov"]
};
