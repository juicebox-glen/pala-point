const fetch = require('node-fetch');
require('dotenv').config({ path: '../.env' });

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL is missing in .env file');
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY) {
  console.error('ERROR: SUPABASE_ANON_KEY is missing in .env file');
  process.exit(1);
}

if (!process.env.PI_TOKEN || process.env.PI_TOKEN.length !== 64) {
  console.error('ERROR: Invalid PI_TOKEN in .env file. Must be exactly 64 characters.');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PI_TOKEN = process.env.PI_TOKEN;

const HEARTBEAT_INTERVAL = 60000; // 60 seconds
const COMMAND_POLL_INTERVAL = 30000; // 30 seconds

// Send heartbeat
async function sendHeartbeat() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/heartbeat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-pi-token': PI_TOKEN
      },
      body: JSON.stringify({
        ip_address: getLocalIP(),
        cpu_temp: await getCPUTemp(),
        disk_usage_percent: await getDiskUsage(),
        current_version: await getCurrentVersion(),
        court_state: await getCourtState(),
        current_score: await getCurrentScore(),
        game_mode: await getGameMode()
      })
    });

    if (!response.ok) {
      throw new Error(`Heartbeat request failed with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Heartbeat sent successfully');
      
      // Check for pending command
      if (data.pending_command) {
        console.log('📋 Pending command found:', data.pending_command.command_type);
        await executeCommand(data.pending_command);
      }
    } else {
      console.error('❌ Heartbeat failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Heartbeat error:', error.message);
  }
}

// Execute command
async function executeCommand(command) {
  console.log(`🔄 Executing ${command.command_type} command...`);
  
  // Report in_progress
  await reportCommandResult(command.id, 'in_progress', null);
  
  try {
    switch (command.command_type) {
      case 'update':
        await executeUpdate(command);
        break;
      case 'reboot':
        await executeReboot(command);
        break;
      case 'restart':
        await executeRestart(command);
        break;
      case 'stop_kiosk':
        await executeStopKiosk(command);
        break;
      case 'start_kiosk':
        await executeStartKiosk(command);
        break;
      default:
        throw new Error(`Unknown command type: ${command.command_type}`);
    }
  } catch (error) {
    console.error(`❌ Command failed:`, error.message);
    await reportCommandResult(command.id, 'failed', error.message);
  }
}

// Execute update command
async function executeUpdate(command) {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    console.log('📥 Pulling latest code...');
    await execPromise('cd /home/palapoint/pala-point && git pull origin v3-clean');
    
    console.log('📦 Installing dependencies...');
    await execPromise('cd /home/palapoint/pala-point && npm install --legacy-peer-deps');
    
    console.log('🔨 Building app...');
    await execPromise('cd /home/palapoint/pala-point && npm run build');
    
    console.log('🔄 Restarting app...');
    await execPromise('pm2 restart palapoint-app');
    
    // Get new version
    const { stdout } = await execPromise('cd /home/palapoint/pala-point && git rev-parse --short HEAD');
    const newVersion = stdout.trim();
    
    console.log(`✅ Update completed! New version: ${newVersion}`);
    await reportCommandResult(command.id, 'completed', `Updated to ${newVersion}`, newVersion);
    
  } catch (error) {
    throw new Error(`Update failed: ${error.message}`);
  }
}

// Execute reboot command
async function executeReboot(command) {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  console.log('🔄 Rebooting Pi in 10 seconds...');
  await reportCommandResult(command.id, 'completed', 'Rebooting...');
  
  // Give time for response to send
  setTimeout(async () => {
    await execPromise('sudo reboot');
  }, 10000);
}

// Execute restart command (just restart the app, not the Pi)
async function executeRestart(command) {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  console.log('🔄 Restarting pala-point app...');
  await execPromise('pm2 restart palapoint-app');
  
  console.log('✅ App restarted successfully');
  await reportCommandResult(command.id, 'completed', 'App restarted successfully');
}

// Execute stop kiosk command
async function executeStopKiosk(command) {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  console.log('🛑 Stopping kiosk mode...');
  await execPromise('systemctl --user stop kiosk.service');
  
  console.log('✅ Kiosk stopped successfully');
  await reportCommandResult(command.id, 'completed', 'Kiosk stopped successfully');
}

// Execute start kiosk command
async function executeStartKiosk(command) {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  console.log('▶️ Starting kiosk mode...');
  await execPromise('systemctl --user start kiosk.service');
  
  console.log('✅ Kiosk started successfully');
  await reportCommandResult(command.id, 'completed', 'Kiosk started successfully');
}

// Report command result
async function reportCommandResult(commandId, status, message, currentVersion = null) {
  try {
    const body = {
      command_id: commandId,
      status: status,
      result_message: message
    };
    
    if (currentVersion) {
      body.current_version = currentVersion;
    }
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/command-result`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-pi-token': PI_TOKEN
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Command result request failed with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Command result reported: ${status}`);
    }
  } catch (error) {
    console.error('❌ Failed to report command result:', error.message);
  }
}

// Helper functions
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

async function getCPUTemp() {
  try {
    const fs = require('fs').promises;
    const temp = await fs.readFile('/sys/class/thermal/thermal_zone0/temp', 'utf8');
    return parseFloat(temp) / 1000;
  } catch (error) {
    return null;
  }
}

async function getDiskUsage() {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const { stdout } = await execPromise("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'");
    return parseInt(stdout.trim());
  } catch (error) {
    return null;
  }
}

async function getCurrentVersion() {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const { stdout } = await execPromise('cd /home/palapoint/pala-point && git rev-parse --short HEAD');
    return stdout.trim();
  } catch (error) {
    return 'unknown';
  }
}

async function getCourtState() {
  try {
    const fs = require('fs').promises;
    const state = await fs.readFile('/tmp/palapoint-state.json', 'utf8');
    const parsed = JSON.parse(state);
    return parsed.court_state || 'idle';
  } catch (error) {
    return 'idle';
  }
}

async function getCurrentScore() {
  try {
    const fs = require('fs').promises;
    const state = await fs.readFile('/tmp/palapoint-state.json', 'utf8');
    const parsed = JSON.parse(state);
    return parsed.current_score || null;
  } catch (error) {
    return null;
  }
}

async function getGameMode() {
  try {
    const fs = require('fs').promises;
    const state = await fs.readFile('/tmp/palapoint-state.json', 'utf8');
    const parsed = JSON.parse(state);
    return parsed.game_mode || null;
  } catch (error) {
    return null;
  }
}

// Main loop
async function main() {
  console.log('🚀 PalaPoint Agent starting...');
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Pi Token: ${PI_TOKEN.substring(0, 8)}...`);
  
  // Send initial heartbeat
  await sendHeartbeat();
  
  // Set up intervals
  setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  
  console.log('✅ Agent running');
  console.log(`⏱️  Heartbeat: every ${HEARTBEAT_INTERVAL / 1000}s`);
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
});

// Start
main();
