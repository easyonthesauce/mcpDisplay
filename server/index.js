import express from "express";
import { WebSocketServer } from "ws";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startMcpServer } from "./mcp.js";
import { getState, nextScene, setSceneIndex } from "./state.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

const PORT = Number(process.env.KIOSK_PORT) || 8787;
const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.static(publicDir));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "family-kiosk-display", now: new Date().toISOString() });
});

app.get("/api/state", (req, res) => {
  res.json(getState());
});

const server = app.listen(PORT, () => {
  console.error(`[kiosk] Display server running at http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server, path: "/ws" });

function broadcastState() {
  const payload = JSON.stringify({ type: "state", state: getState() });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "state", state: getState() }));

  socket.on("message", (messageBuffer) => {
    try {
      const message = JSON.parse(messageBuffer.toString("utf8"));
      if (message?.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", at: Date.now() }));
      }
    } catch {
      socket.send(JSON.stringify({ type: "error", error: "Invalid JSON message" }));
    }
  });
});

let autoAdvanceTimer = null;

function refreshAutoAdvanceTimer() {
  if (autoAdvanceTimer) {
    clearInterval(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }

  const state = getState();
  if (!state.autoAdvance || state.playlist.length < 2) {
    return;
  }

  const intervalMs = Math.max(5000, (Number(state.autoAdvanceSec) || 20) * 1000);
  autoAdvanceTimer = setInterval(() => {
    nextScene();
    broadcastState();
  }, intervalMs);
}

const triggerUpdate = () => {
  if (getState().currentSceneIndex >= getState().playlist.length) {
    setSceneIndex(0);
  }
  refreshAutoAdvanceTimer();
  broadcastState();
};

startMcpServer(triggerUpdate)
  .then(() => {
    refreshAutoAdvanceTimer();
    console.error("[kiosk-mcp] MCP server connected over stdio and ready for tool calls");
  })
  .catch((error) => {
    console.error("[kiosk-mcp] Failed to start MCP server", error);
    process.exitCode = 1;
  });

process.on("SIGINT", () => {
  if (autoAdvanceTimer) {
    clearInterval(autoAdvanceTimer);
  }
  server.close(() => process.exit(0));
});
