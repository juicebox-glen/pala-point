// ws-bridge.js
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, using system environment variables
}
const fliclib = require('./fliclibNodeJs');
const { FlicClient, FlicConnectionChannel } = fliclib;
const WebSocket = require('ws');

const WS_PORT = process.env.NEXT_PUBLIC_WS_PORT || 4001;
const FLIC_HOST = process.env.FLIC_DAEMON_HOST || '127.0.0.1';
const FLIC_PORT = process.env.FLIC_DAEMON_PORT || 5551;
const DEBUG = process.env.DEBUG === 'true';

const buttonSides = {
  "80:e4:da:7f:68:cd": "left",
  "80:e4:da:7f:61:a9": "right",
};

const wss = new WebSocket.Server({ port: WS_PORT });

// Heartbeat to keep connections alive
setInterval(() => {
  wss.clients.forEach(c => {
    if (c.isAlive === false) return c.terminate();
    c.isAlive = false;
    c.ping();
  });
}, 30000);

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  if (DEBUG) console.log('Browser connected to WS');
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      try {
        c.send(data);
      } catch (error) {
        console.error('Error sending WebSocket message:', error.message);
      }
    }
  });
}

const client = new FlicClient(FLIC_HOST, FLIC_PORT);

function connectFlic() {
  client.once("ready", () => {
    if (DEBUG) console.log("Connected to Flic daemon");
    Object.keys(buttonSides).forEach(bdAddr => {
      const side = buttonSides[bdAddr];
      const ch = new FlicConnectionChannel(bdAddr);

      ch.on("buttonSingleOrDoubleClickOrHold", (clickType) => {
        if (DEBUG) console.log(`${side} button: ${clickType}`);
        if (clickType === "ButtonSingleClick") {
          broadcast({ type: "command", cmd: side === "left" ? "SCORE_LEFT" : "SCORE_RIGHT" });
        } else if (clickType === "ButtonDoubleClick") {
          broadcast({ type: "command", cmd: "UNDO" });
        } else if (clickType === "ButtonHold") {
          broadcast({ type: "command", cmd: "HOLD" });
        }
      });

      client.addConnectionChannel(ch);
    });
    if (DEBUG) console.log(`WS bridge ready on ws://localhost:${WS_PORT}`);
  });

  client.on('close', () => {
    if (DEBUG) console.log('Flic client closed; retrying in 1s');
    setTimeout(connectFlic, 1000);
  });

  client.on("error", (e) => console.error("Flic client error:", e.message));
}

connectFlic();
