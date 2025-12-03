module.exports = {
  apps: [
    {
      name: 'palapoint-app',
      script: 'npm',
      args: 'start',
      cwd: '/home/palapoint/pala-point',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    },
    {
      name: 'palapoint-agent',
      script: 'node',
      args: 'index.js',
      cwd: '/home/palapoint/pala-point/agent',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    },
    {
      name: 'ws-bridge',
      script: 'node',
      args: 'ws-bridge.js',
      cwd: '/home/palapoint/pala-point',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    },
    {
      name: 'flic-bridge',
      script: 'node',
      args: 'flic-bridge.js',
      cwd: '/home/palapoint/pala-point',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    }
  ]
};
