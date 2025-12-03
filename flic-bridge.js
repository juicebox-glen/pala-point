try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, using system environment variables
}

const fliclib = require("./fliclibNodeJs")
const FlicClient = fliclib.FlicClient
const FlicConnectionChannel = fliclib.FlicConnectionChannel
const { execSync } = require('child_process')

const FLIC_HOST = process.env.FLIC_DAEMON_HOST || '127.0.0.1';
const FLIC_PORT = process.env.FLIC_DAEMON_PORT || 5551;
const DEBUG = process.env.DEBUG === 'true';

const client = new FlicClient(FLIC_HOST, FLIC_PORT)

// Your button MAC addresses
const buttonSides = {
  "90:88:a9:50:e4:41": "left",
  "90:88:a9:50:e4:3d": "right", 
}

// Send keyboard commands to your Next.js app
function sendKeyPress(key) {
  if (DEBUG) console.log(`Simulating key press: ${key}`)
  
  try {
    execSync(`DISPLAY=:0 xdotool key ${key}`)
  } catch (err) {
    console.error(`Error sending key ${key}:`, err.message)
  }
}

// Send keyboard hold (for hold button functionality)
function sendKeyHold(key, duration = 1500) {
  if (DEBUG) console.log(`Simulating key hold: ${key} for ${duration}ms`)
  
  try {
    execSync(`DISPLAY=:0 xdotool keydown ${key}`)
    setTimeout(() => {
      try {
        execSync(`DISPLAY=:0 xdotool keyup ${key}`)
      } catch (err) {
        console.error(`Error releasing key ${key}:`, err.message)
      }
    }, duration)
  } catch (err) {
    console.error(`Error holding key ${key}:`, err.message)
  }
}

function setupButton(bdAddr) {
  const side = buttonSides[bdAddr]
  
  if (!side) {
    if (DEBUG) console.log(`Button ${bdAddr} not configured`)
    return
  }
  
  if (DEBUG) console.log(`Setting up ${side} button: ${bdAddr}`)
  
  const channel = new FlicConnectionChannel(bdAddr)
  
  channel.on("buttonSingleOrDoubleClick", (clickType) => {
    if (clickType === "ButtonSingleClick") {
      if (DEBUG) console.log(`${side} button: SINGLE CLICK`)
      
      // Send Q or P key based on side
      const key = side === "left" ? "q" : "p"
      sendKeyPress(key)
      
    } else if (clickType === "ButtonDoubleClick") {
      if (DEBUG) console.log(`${side} button: DOUBLE CLICK`)
      sendKeyPress("a") // Undo
    }
  })
  
  channel.on("buttonSingleOrDoubleClickOrHold", (clickType) => {
    if (clickType === "ButtonHold") {
      if (DEBUG) console.log(`${side} button: HOLD`)
      sendKeyHold("r", 1500) // Hold R key for 1.5 seconds
    }
  })
  
  client.addConnectionChannel(channel)
}

if (DEBUG) console.log("Starting Flic Bridge...")

client.once("ready", () => {
  if (DEBUG) console.log("Connected to Flic daemon")
  
  // Setup your known buttons
  Object.keys(buttonSides).forEach(setupButton)
  
  if (DEBUG) console.log("Flic Bridge Ready!")
  if (DEBUG) console.log("Make sure your browser window is active when testing buttons")
})

client.on("error", (error) => {
  console.error("Flic client error:", error)
})
