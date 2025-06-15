const { spawn } = require('child_process');
const chalk = require('chalk');

// Configuration
const MAX_RESTARTS = 5;
const RESTART_DELAY = 3000; // 3 seconds
const CHECK_INTERVAL = 60000; // 1 minute instead of 30 seconds

// Server definitions
const servers = [
  {
    name: 'Backend',
    cmd: 'npm',
    args: ['run', 'dev'],
    cwd: './backend',
    color: 'blue',
    port: 3001,
    url: 'http://localhost:3001/api/v1/health',
    process: null,
    restarts: 0,
    isRunning: false
  },
  {
    name: 'Frontend',
    cmd: 'npm',
    args: ['run', 'dev'],
    cwd: './frontend',
    color: 'green',
    port: 5173,
    url: 'http://localhost:5173',
    process: null,
    restarts: 0,
    isRunning: false,
    isVite: true // Flag to indicate this is a Vite server
  }
];

// Utility functions
const timestamp = () => new Date().toLocaleTimeString();
const log = (server, message) => {
  console.log(chalk[server.color](`[${timestamp()}] ${server.name}: ${message}`));
};
const error = (server, message) => {
  console.error(chalk.red(`[${timestamp()}] ${server.name} ERROR: ${message}`));
};

// Start a server
function startServer(server) {
  console.log(chalk.yellow(`[${timestamp()}] Attempting to start ${server.name} server...`));
  console.log(chalk.yellow(`[${timestamp()}] Command: ${server.cmd} ${server.args.join(' ')}`));
  console.log(chalk.yellow(`[${timestamp()}] Working directory: ${server.cwd}`));

  if (server.process) {
    try {
      console.log(chalk.yellow(`[${timestamp()}] Killing existing ${server.name} process...`));
      server.process.kill();
    } catch (err) {
      console.log(chalk.yellow(`[${timestamp()}] No existing ${server.name} process to kill`));
    }
  }

  log(server, `Starting ${server.name} server...`);
  
  try {
    const process = spawn(server.cmd, server.args, {
      cwd: server.cwd,
      shell: true,
      stdio: 'pipe'
    });
    
    server.process = process;
    server.isRunning = true;
    server.lastStarted = Date.now();
    
    // Handle stdout
    process.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          log(server, line);
        }
      });
    });
    
    // Handle stderr
    process.stderr.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          error(server, line);
        }
      });
    });
    
    // Handle process exit
    process.on('exit', (code) => {
      server.isRunning = false;
      
      if (code !== 0) {
        error(server, `Process exited with code ${code}`);
        
        // Restart the server if it hasn't exceeded the max restarts
        if (server.restarts < MAX_RESTARTS) {
          server.restarts++;
          error(server, `Restarting server (attempt ${server.restarts}/${MAX_RESTARTS})...`);
          
          setTimeout(() => {
            startServer(server);
          }, RESTART_DELAY);
        } else {
          error(server, `Maximum restart attempts (${MAX_RESTARTS}) reached. Giving up.`);
        }
      } else {
        log(server, `Process exited normally with code ${code}`);
      }
    });
    
    // Handle process errors
    process.on('error', (err) => {
      error(server, `Process error: ${err.message}`);
      server.isRunning = false;
    });

    console.log(chalk.green(`[${timestamp()}] Successfully started ${server.name} server`));
    return process;
  } catch (err) {
    error(server, `Failed to start server: ${err.message}`);
    console.error(err);
    return null;
  }
}

// Check server health
async function checkServerHealth(server) {
  const http = require('http');
  
  return new Promise((resolve) => {
    console.log(chalk.yellow(`[${timestamp()}] Checking health of ${server.name} at ${server.url}`));
    
    const req = http.get(server.url, (res) => {
      // For Vite servers, any response means it's healthy
      if (server.isVite) {
        log(server, `Health check passed: ${res.statusCode}`);
        resolve(true);
      } else if (res.statusCode >= 200 && res.statusCode < 300) {
        log(server, `Health check passed: ${res.statusCode}`);
        resolve(true);
      } else {
        error(server, `Health check failed: ${res.statusCode}`);
        resolve(false);
      }
      
      // Consume response data to free up memory
      res.resume();
    });
    
    req.on('error', (err) => {
      error(server, `Health check error: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.abort();
      error(server, 'Health check timed out');
      resolve(false);
    });
  });
}

// Periodically check server health
function monitorServers() {
  console.log(chalk.yellow(`[${timestamp()}] Starting server monitoring...`));
  
  setInterval(async () => {
    for (const server of servers) {
      if (!server.isRunning && Date.now() - (server.lastStarted || 0) > RESTART_DELAY) {
        log(server, 'Server not running, attempting to start...');
        startServer(server);
      } else if (server.isRunning) {
        const isHealthy = await checkServerHealth(server);
        
        if (!isHealthy && server.restarts < MAX_RESTARTS) {
          error(server, 'Server is unhealthy, restarting...');
          server.restarts++;
          startServer(server);
        }
      }
    }
  }, CHECK_INTERVAL);
}

// Start all servers initially
function startAllServers() {
  console.log(chalk.yellow(`[${timestamp()}] Starting all servers...`));
  
  servers.forEach(server => {
    startServer(server);
  });
  
  // Start monitoring
  monitorServers();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow(`\n[${timestamp()}] Shutting down all servers...`));
  
  servers.forEach(server => {
    if (server.process) {
      try {
        server.process.kill();
      } catch (err) {
        // Process might already be dead
      }
    }
  });
  
  process.exit(0);
});

// Start everything
console.log(chalk.yellow(`[${timestamp()}] Initializing server monitor...`));
startAllServers(); 