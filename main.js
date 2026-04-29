// =========================
// GHOST_OS MAIN PROCESS
// =========================

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { Worker } = require("node:worker_threads");

// Cognitive engine tick rate (kept here just for reference/logging)
const COGNITIVE_TICK_MS = 400;

// -------------------------
// STARTUP LOGGING
// -------------------------
console.log("======================================");
console.log(" Ghost_OS main.js starting...");
console.log(" MAIN FILE PATH:", __filename);
console.log(" WORKING DIR   :", process.cwd());
console.log("======================================");

// -------------------------
// GLOBAL CRASH HANDLERS
// -------------------------
app.on("web-contents-created", (event, contents) => {
  contents.on("render-process-gone", (e, details) => {
    console.error("Renderer crashed:", details);
  });
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT ERROR IN MAIN PROCESS:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED PROMISE REJECTION:", reason);
});

// -------------------------
// WINDOW CREATION
// -------------------------
let mainWindow = null;

function createWindow() {
  console.log("[UI] Creating BrowserWindow...");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.openDevTools();
  mainWindow.loadFile("index.html");

  mainWindow.on("closed", () => {
    console.log("[UI] Main window closed.");
    mainWindow = null;
  });

  console.log("[UI] BrowserWindow created and index.html loaded.");
}

// -------------------------
// WORKER SETUP
// -------------------------
let ghostWorker = null;
let lastGhostState = null;

function startGhostWorker() {
  console.log("[WORKER] Spawning cognitive worker...");

  ghostWorker = new Worker(path.join(__dirname, "cog_worker.js"));

  ghostWorker.on("message", (msg) => {
    if (!msg || typeof msg !== "object") return;

    switch (msg.type) {
      case "state":
        lastGhostState = msg.payload || null;
        break;
      case "log":
        console.log("[COG]", msg.payload);
        break;
      case "error":
        console.error("[COG ERROR]", msg.payload);
        break;
      default:
        break;
    }
  });

  ghostWorker.on("error", (err) => {
    console.error("[WORKER] Worker error:", err);
  });

  ghostWorker.on("exit", (code) => {
    console.log("[WORKER] Worker exited with code:", code);
    ghostWorker = null;
  });
}

function sendToWorker(msg) {
  if (ghostWorker) {
    ghostWorker.postMessage(msg);
  }
}

// -------------------------
// APP READY
// -------------------------
app.whenReady().then(() => {
  console.log("[APP] Electron app ready. Creating window and starting systems...");
  createWindow();
  startGhostWorker();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log("[APP] Reactivating app, creating new window...");
      createWindow();
    }
  });
});

// -------------------------
// IPC: ghost-input
// -------------------------
console.log("[IPC] Registering 'ghost-input' handler (invoke)...");
ipcMain.handle("ghost-input", () => {
  // Just return the last computed state from the worker.
  return lastGhostState || null;
});

// -------------------------
// IPC: INPUT MAPPER EVENTS (FORWARDED TO WORKER)
// -------------------------
ipcMain.on("mouse-move", (e, x, y) => {
  sendToWorker({ type: "mouse-move", x, y });
});

ipcMain.on("mouse-click", () => {
  sendToWorker({ type: "mouse-click" });
});

ipcMain.on("mouse-scroll", (e, delta) => {
  sendToWorker({ type: "mouse-scroll", delta });
});

ipcMain.on("key-press", () => {
  sendToWorker({ type: "key-press" });
});

ipcMain.on("focus-change", (e, state) => {
  sendToWorker({ type: "focus-change", state });
});

// -------------------------
// APP LIFECYCLE
// -------------------------
app.on("before-quit", () => {
  console.log("[APP] before-quit: notifying worker to save memory and shut down...");
  sendToWorker({ type: "shutdown" });
});

app.on("window-all-closed", () => {
  console.log("[APP] All windows closed.");
  if (process.platform !== "darwin") {
    console.log("[APP] Quitting app (non-macOS).");
    app.quit();
  }
});
