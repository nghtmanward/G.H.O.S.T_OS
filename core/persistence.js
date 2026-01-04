const fs = require('fs');
const path = require('path');

class Persistence {
  constructor(filename = 'ghost_memory.json') {
    this.filePath = path.join(process.cwd(), filename);
  }

  save(state) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (err) {
      console.error("Error saving ghost memory:", err);
    }
  }

  load() {
    try {
      if (!fs.existsSync(this.filePath)) return null;
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error("Error loading ghost memory:", err);
      return null;
    }
  }
}

module.exports = Persistence;