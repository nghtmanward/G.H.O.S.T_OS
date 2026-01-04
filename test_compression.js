const CompressionEngine = require('./core/compression_engine');

const engine = new CompressionEngine(8, 32);

const input = [1, 0, 1, 0, 0, 1, 0, 0];

const result = engine.ingest(input);

console.log("Latent code:", result.latent);
console.log("Reconstruction:", result.recon);
console.log("Loss:", engine.loss(input, result.recon));