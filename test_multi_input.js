const CompressionEngine = require('./core/compression_engine');

// Create engine: 8-bit input → 32-dim latent
const engine = new CompressionEngine(8, 32);

// Training dataset (patterns)
const dataset = [
  [1,0,1,0,0,1,0,0],
  [1,0,1,0,0,1,0,0],
  [1,0,1,0,0,1,0,0],
  [0,1,0,1,1,0,1,1],
  [0,1,0,1,1,0,1,1],
  [1,1,1,0,0,0,1,1],
  [1,1,1,0,0,0,1,1]
];

// Train for several epochs
for (let epoch = 0; epoch < 20; epoch++) {
  let totalLoss = 0;

  dataset.forEach(input => {
    const result = engine.ingest(input);
    const loss = engine.loss(input, result.recon);
    totalLoss += loss;
  });

  console.log(`Epoch ${epoch} - Avg Loss: ${totalLoss / dataset.length}`);
}