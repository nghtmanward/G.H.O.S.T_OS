// preload.js
const { contextBridge, ipcRenderer } = require("electron");

// ---------------------------------------------------------
// EXPOSE SAFE IPC API TO RENDERER
// ---------------------------------------------------------
contextBridge.exposeInMainWorld("ghost", {
  sendMouseMove: (x, y) => {
    ipcRenderer.send("mouse-move", x, y);
  },

  sendMouseClick: () => {
    ipcRenderer.send("mouse-click");
  },

  sendMouseScroll: (delta) => {
    ipcRenderer.send("mouse-scroll", delta);
  },

  sendKeyPress: () => {
    ipcRenderer.send("key-press");
  },

  sendFocusChange: (state) => {
    ipcRenderer.send("focus-change", state);
  },

  // Request the current cognitive-loop snapshot
  requestGhostUpdate: () => {
    return ipcRenderer.invoke("ghost-input");
  }
});