// ws-bridge.js
const fliclib = require('./fliclibNodeJs');
const { FlicClient, FlicConnectionChannel } = fliclib;
const WebSocket = require('ws');

const buttonSides = {
  "80:e4:da:7f:68:cd": "left",
  "80:e4:da:7f:61:a9": "right",
};

const wss = new WebSocket.Server({ port: 4001 });

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
  console.log('Browser connected to WS');
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(data));
}

const client = new FlicClient("127.0.0.1", 5551);

function connectFlic() {
  client.once("ready", () => {
    console.log("Connected to Flic daemon");
    Object.keys(buttonSides).forEach(bdAddr => {
      const side = buttonSides[bdAddr];
      const ch = new FlicConnectionChannel(bdAddr);

      ch.on("buttonSingleOrDoubleClickOrHold", (clickType) => {
        console.log(`${side} button: ${clickType}`);
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
    console.log("WS bridge ready on ws://localhost:4001");
  });

  client.on('close', () => {
    console.log('Flic client closed; retrying in 1s');
    setTimeout(connectFlic, 1000);
  });

  client.on("error", (e) => console.error("Flic client error:", e.message));
}

connectFlic();
