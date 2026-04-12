const path = require("path");

// Load the compiled native addon
const addonPath = path.join(__dirname, "ghost_core", "build", "Release", "ghost_core.node");
const core = require(addonPath);

// Export the native functions
module.exports = {
  findSimilar: core.findSimilar,
  retrieveFromShards: core.retrieveFromShards
};