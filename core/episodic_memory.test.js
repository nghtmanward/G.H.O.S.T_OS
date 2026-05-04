describe("EpisodicMemory", () => {

  // -----------------------------
  // Version validation
  // -----------------------------
  test("loads without registry file", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => null);
      const EM = require("./episodic_memory");
      expect(() => new EM()).not.toThrow();
    });
  });

  test("throws on version mismatch", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "WRONG"
      }));
      const EM = require("./episodic_memory");
      expect(() => new EM()).toThrow("Version mismatch");
    });
  });

  test("accepts correct version", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      expect(() => new EM()).not.toThrow();
    });
  });

  // -----------------------------
  // latentMagnitude
  // -----------------------------
  test("latentMagnitude averages absolute values", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      expect(mem.latentMagnitude([1, -2, 3])).toBe(2);
    });
  });

  test("latentMagnitude ignores invalid values", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      expect(mem.latentMagnitude([1, NaN, -2])).toBe(1.5);
    });
  });

  // -----------------------------
  // dominantStyle
  // -----------------------------
  test("dominantStyle picks highest value", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      const style = mem.dominantStyle({ poetic: 1, chaotic: 5, calm: 2 });
      expect(style).toBe("chaotic");
    });
  });

  test("dominantStyle defaults to poetic", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      expect(mem.dominantStyle({})).toBe("poetic");
    });
  });

  // -----------------------------
  // compressEpisode
  // -----------------------------
  test("compressEpisode builds normalized episode", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      const ep = mem.compressEpisode({
        thought: "hello",
        latent: [1, -1],
        anomaly: 0.3,
        mood: "alert",
        styleBias: { calm: 3, poetic: 1 }
      });

      expect(ep.text).toBe("hello");
      expect(ep.latentMag).toBe(1);
      expect(ep.style).toBe("calm");
      expect(ep.anomaly).toBe(0.3);
      expect(typeof ep.timestamp).toBe("number");
    });
  });

  // -----------------------------
  // adaptMemorySize
  // -----------------------------
  test("adaptMemorySize adjusts currentLimit based on anomaly and mood", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      const before = mem.currentLimit;

      mem.adaptMemorySize({ anomaly: 0.2, moodBaseline: -0.5 });

      expect(mem.currentLimit).toBeGreaterThan(before);
    });
  });

  test("adaptMemorySize clamps within min/max", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      mem.currentLimit = 1000;
      mem.adaptMemorySize({ anomaly: 0.2 });
      expect(mem.currentLimit).toBeLessThanOrEqual(mem.maxSize);
    });
  });

  // -----------------------------
  // _maybeExpandCeiling
  // -----------------------------
  test("expands ceiling when near maxSize", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      mem.maxSize = 20;
      mem.episodes = new Array(19).fill({});

      mem._maybeExpandCeiling();
      expect(mem.maxSize).toBeGreaterThan(20);
    });
  });

  // -----------------------------
  // addEpisode (new-style)
  // -----------------------------
  test("addEpisode (new-style) compresses and stores episode", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();

      mem.addEpisode("hello", {
        thought: "hello",
        latent: [1],
        anomaly: 0.1,
        mood: "calm",
        styleBias: { poetic: 2 }
      });

      expect(mem.episodes.length).toBe(1);
      expect(mem.episodes[0].text).toBe("hello");
    });
  });

  // -----------------------------
  // addEpisode trims to currentLimit
  // -----------------------------
  test("addEpisode trims to currentLimit", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      mem.currentLimit = 3;

      for (let i = 0; i < 10; i++) {
        mem.addEpisode("t", { thought: "t", latent: [1], anomaly: 0 });
      }

      expect(mem.episodes.length).toBe(3);
    });
  });

  // -----------------------------
  // addEpisode (legacy)
  // -----------------------------
  test("addEpisode (legacy) normalizes and stores", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();

      mem.addEpisode({
        text: "legacy",
        anomaly: 0.2,
        latentMag: 1,
        mood: "neutral",
        timestamp: 123
      });

      expect(mem.episodes.length).toBe(1);
      expect(mem.episodes[0].text).toBe("legacy");
    });
  });

  // -----------------------------
  // normalizeEpisode
  // -----------------------------
  test("normalizeEpisode fills missing fields", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      const ep = mem.normalizeEpisode({ text: "x" });

      expect(ep.text).toBe("x");
      expect(ep.mood).toBe("neutral");
      expect(ep.style).toBe("poetic");
    });
  });

  test("normalizeEpisode handles invalid input", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      const ep = mem.normalizeEpisode(null);

      expect(ep.text).toBe("");
      expect(ep.anomaly).toBe(0);
    });
  });

  // -----------------------------
  // _validateEpisode
  // -----------------------------
  test("_validateEpisode throws on invalid episode", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      expect(() => mem._validateEpisode({})).toThrow();
    });
  });

  // -----------------------------
  // ingestLegacyEpisodes
  // -----------------------------
  test("ingestLegacyEpisodes normalizes and stores all", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();

      mem.ingestLegacyEpisodes([
        { text: "a", anomaly: 0.1, latentMag: 1, mood: "calm", timestamp: 1 },
        { text: "b", anomaly: 0.2, latentMag: 2, mood: "alert", timestamp: 2 }
      ]);

      expect(mem.episodes.length).toBe(2);
    });
  });

  // -----------------------------
  // retrieval + summary
  // -----------------------------
  test("getRecentEpisodes returns copy", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      mem.episodes = [{ text: "x" }];

      const out = mem.getRecentEpisodes();
      expect(out).not.toBe(mem.episodes);
    });
  });

  test("getSummary returns correct structure", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      mem.episodes = [{ text: "x" }];

      const summary = mem.getSummary();
      expect(summary.count).toBe(1);
      expect(summary.last.text).toBe("x");
    });
  });

  // -----------------------------
  // dump + load
  // -----------------------------
  test("dump returns episodes array", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();
      mem.episodes = [{ text: "x" }];

      expect(mem.dump()).toEqual([{ text: "x" }]);
    });
  });

  test("load normalizes episodes", () => {
    jest.isolateModules(() => {
      jest.doMock("./version_registry.js", () => ({
        EpisodicMemory: "1.1.0-2026.01.08"
      }));
      const EM = require("./episodic_memory");
      const mem = new EM();

      mem.load([{ text: "x", anomaly: 0.1, latentMag: 1 }]);

      expect(mem.episodes.length).toBe(1);
      expect(mem.episodes[0].text).toBe("x");
    });
  });

});
