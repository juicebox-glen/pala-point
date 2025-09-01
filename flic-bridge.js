const fliclib = require("./fliclibNodeJs")
const FlicClient = fliclib.FlicClient
const FlicConnectionChannel = fliclib.FlicConnectionChannel
const { execSync } = require('child_process')

const client = new FlicClient("127.0.0.1", 5551)

// Your button MAC addresses from the old system
const buttonSides = {
  "80:e4:da:7f:68:cd": "left",
  "80:e4:da:7f:61:a9": "right", 
}

// Send keyboard commands to your Next.js app
function sendKeyPress(key) {
  console.log(`Simulating key press: ${key}`)
  
  // Use xdotool to send key to active window
  try {
    execSync(`DISPLAY=:0 xdotool key ${key}`)
  } catch (err) {
    console.error(`Error sending key ${key}:`, err.message)
  }
}

function setupButton(bdAddr) {
  const side = buttonSides[bdAddr]
  
  if (!side) {
    console.log(`Button ${bdAddr} not configured`)
    return
  }

  console.log(`Setting up ${side} button: ${bdAddr}`)
  
  const channel = new FlicConnectionChannel(bdAddr)

  channel.on("buttonSingleOrDoubleClick", (clickType) => {
    if (clickType === "ButtonSingleClick") {
      console.log(`${side} button: SINGLE CLICK`)
      
      // Send Q or P key based on side
      const key = side === "left" ? "q" : "p"
      sendKeyPress(key)
      
    } else if (clickType === "ButtonDoubleClick") {
      console.log(`${side} button: DOUBLE CLICK`)
      sendKeyPress("a") // Undo
    }
  })

  channel.on("buttonSingleOrDoubleClickOrHold", (clickType) => {
    if (clickType === "ButtonHold") {
      console.log(`${side} button: HOLD`)
      sendKeyPress("h") // Reset
    }
  })

  client.addConnectionChannel(channel)
}

console.log("Starting Flic Bridge...")

client.once("ready", () => {
  console.log("Connected to Flic daemon")
  
  // Setup your known buttons
  Object.keys(buttonSides).forEach(setupButton)
  
  console.log("Flic Bridge Ready!")
  console.log("Make sure your browser window is active when testing buttons")
})

client.on("error", (error) => {
  console.error("Flic client error:", error)
})
