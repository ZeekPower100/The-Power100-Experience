#!/usr/bin/env node

/**
 * Enhanced Dev Manager with Automatic Error Prevention
 * Starts servers AND watches for errors in real-time
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const colors = require('colors');

// Server configurations
const CONFIG = {
  backend: {
    name: 'Backend Server',
    command: 'node',
    args: ['tpe-backend/src/server.js'],
    port: 5000,
    pidFile: '.backend.pid',
    color: 'yellow',
    logFile: 'tpe-backend/backend.log'
  },
  frontend: {
    name: 'Frontend Dev Server',
    command: 'node',
    args: ['../node_modules/next/dist/bin/next', 'dev', '--port', '3002'],
    cwd: 'tpe-front-end',
    port: 3002,
    pidFile: '.frontend.pid',
    color: 'cyan',
    logFile: 'tpe-front-end/frontend.log'
  },
  errorWatcher: {
    name: 'Error Prevention Watcher',
    command: 'node',
    args: ['tools/dev-watcher.js'],
    pidFile: '.watcher.pid',
    color: 'green',
    optional: true,
    logFile: 'tools/error-watcher.log'
  }
};

class SafeDevManager {
  constructor() {
    this.processes = {};
    this.monitorWindows = {};
    this.isWindows = process.platform === 'win32';
  }

  // Open monitoring window for a log file
  openMonitorWindow(config) {
    const logPath = path.resolve(config.logFile);
    const title = `${config.name} - Live Output`;

    // Launch PowerShell window with UTF-8 encoding and proper font
    const monitorCmd = `start powershell -NoExit -Command "& { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'; chcp 65001 | Out-Null; $host.UI.RawUI.ForegroundColor = 'White'; $host.UI.RawUI.BackgroundColor = 'Black'; Clear-Host; $host.UI.RawUI.WindowTitle='${title}'; Write-Host '${config.name} - Monitoring ${logPath}' -ForegroundColor Cyan; Write-Host 'Close this window anytime - server will keep running' -ForegroundColor Gray; Write-Host ''; Get-Content -Path '${logPath}' -Encoding UTF8 -Wait -Tail 50 }"`;

    exec(monitorCmd, (error) => {
      if (error) {
        console.log(colors.yellow(`⚠️  Could not open monitoring window for ${config.name}`));
      }
    });
  }

  // Enhanced start with error watching
  async startAllWithSafety() {
    console.log(colors.cyan.bold('🛡️  Starting Development Environment with Error Prevention\n'));
    
    // Start backend
    console.log(colors.yellow('🚀 Starting Backend Server...'));
    await this.startServer(CONFIG.backend);
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start frontend
    console.log(colors.cyan('🚀 Starting Frontend Dev Server...'));
    await this.startServer(CONFIG.frontend);
    
    // Start error watcher
    console.log(colors.green('\n🛡️  Starting Error Prevention Watcher...'));
    await this.startWatcher();
    
    console.log(colors.green.bold('\n✅ All systems active with error prevention!'));
    console.log(colors.gray('─'.repeat(60)));
    console.log(colors.cyan('📍 Frontend: http://localhost:3002'));
    console.log(colors.yellow('📍 Backend: http://localhost:5000'));
    console.log(colors.green('🛡️  Error Watcher: Active'));
    console.log(colors.gray('─'.repeat(60)));
    console.log(colors.gray('\nThe error watcher will check your code automatically when you save files.'));
    console.log(colors.gray('If errors are found, they will be displayed immediately.\n'));
    
    // Keep process alive
    this.keepAlive();
  }

  // Start error watcher
  async startWatcher() {
    const config = CONFIG.errorWatcher;

    // Ensure log file exists
    if (config.logFile) {
      const logDir = path.dirname(config.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      // Clear old log file
      fs.writeFileSync(config.logFile, '');
    }

    // Open log file for appending
    const logPath = path.resolve(config.logFile);
    const logFd = fs.openSync(logPath, 'a');

    const watcherProcess = spawn(config.command, config.args, {
      stdio: ['ignore', logFd, logFd], // stdin ignored, stdout and stderr to log file
      detached: true,
      windowsHide: true
    });

    this.processes.errorWatcher = watcherProcess;

    // Fully detach
    watcherProcess.unref();

    // Close our reference to the log file descriptor
    watcherProcess.on('spawn', () => {
      fs.close(logFd, () => {});
    });

    // Wait a moment for watcher to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Open monitoring window
    console.log(colors.gray(`📺 Opening monitoring window for ${config.name}...`));
    this.openMonitorWindow(config);

    return true;
  }

  // Start a server
  async startServer(config) {
    // Ensure log file exists
    if (config.logFile) {
      const logDir = path.dirname(config.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      // Clear old log file
      fs.writeFileSync(config.logFile, '');
    }

    // Open log file for appending
    const logPath = path.resolve(config.logFile);
    const logFd = fs.openSync(logPath, 'a');

    const options = {
      stdio: ['ignore', logFd, logFd], // stdin ignored, stdout and stderr to log file
      detached: true,
      windowsHide: true
    };

    if (config.cwd) {
      options.cwd = config.cwd;
    }

    // Spawn directly without shell to avoid visible windows
    const child = spawn(config.command, config.args, options);

    // Save process
    this.processes[config.name] = child;

    // Save PID
    if (config.pidFile) {
      fs.writeFileSync(config.pidFile, child.pid.toString());
    }

    // Fully detach - closing parent won't kill child
    child.unref();

    // Close our reference to the log file descriptor
    // The child process still has it open
    child.on('spawn', () => {
      fs.close(logFd, () => {});
    });

    // Wait for server to be ready
    if (config.port) {
      await this.waitForPort(config.port, config.name);
    }

    // Open monitoring window AFTER server starts
    console.log(colors.gray(`📺 Opening monitoring window for ${config.name}...`));
    this.openMonitorWindow(config);

    return child;
  }

  // Wait for port to be available
  async waitForPort(port, name, maxAttempts = 30) {
    console.log(`⏳ Waiting for ${name} to be ready on port ${port}...`);
    
    for (let i = 0; i < maxAttempts; i++) {
      const isOpen = await this.checkPort(port);
      if (isOpen) {
        console.log(colors.green(`✅ ${name} is ready!`));
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(colors.yellow(`⚠️ ${name} did not start within expected time`));
    return false;
  }

  // Check if port is open
  async checkPort(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const tester = net.createConnection({ port }, () => {
        tester.end();
        resolve(true);
      });
      
      tester.on('error', () => {
        resolve(false);
      });
      
      tester.setTimeout(500, () => {
        tester.end();
        resolve(false);
      });
    });
  }

  // Keep process alive
  keepAlive() {
    process.stdin.resume();
    
    // Handle Ctrl+C
    process.on('SIGINT', async () => {
      console.log(colors.yellow('\n\n🛑 Shutting down development environment...'));
      
      // Stop all processes
      for (const [name, child] of Object.entries(this.processes)) {
        if (child && !child.killed) {
          child.kill('SIGTERM');
          console.log(colors.gray(`✅ Stopped ${name}`));
        }
      }
      
      // Clean up PID files
      Object.values(CONFIG).forEach(config => {
        if (config.pidFile && fs.existsSync(config.pidFile)) {
          fs.unlinkSync(config.pidFile);
        }
      });
      
      console.log(colors.green('👋 Goodbye!'));
      process.exit(0);
    });
  }

  // Show status
  showStatus() {
    console.log(colors.cyan.bold('\n📊 Development Environment Status\n'));
    console.log(colors.gray('─'.repeat(60)));

    // Check each service
    const statuses = [];

    // Check backend
    if (this.processes.backend && !this.processes.backend.killed) {
      statuses.push(colors.green('✅ Backend: Running on port 5000'));
    } else {
      statuses.push(colors.red('❌ Backend: Not running'));
    }

    // Check frontend
    if (this.processes.frontend && !this.processes.frontend.killed) {
      statuses.push(colors.green('✅ Frontend: Running on port 3002'));
    } else {
      statuses.push(colors.red('❌ Frontend: Not running'));
    }

    // Check watcher
    if (this.processes.errorWatcher && !this.processes.errorWatcher.killed) {
      statuses.push(colors.green('✅ Error Watcher: Active'));
    } else {
      statuses.push(colors.yellow('⚠️  Error Watcher: Not running'));
    }

    statuses.forEach(status => console.log(status));
    console.log(colors.gray('─'.repeat(60)));
  }

  // Reopen all monitoring windows
  reopenMonitors() {
    console.log(colors.cyan.bold('\n📺 Reopening Monitoring Windows\n'));

    if (this.processes['Backend Server']) {
      console.log(colors.gray('Opening Backend monitor...'));
      this.openMonitorWindow(CONFIG.backend);
    }

    if (this.processes['Frontend Dev Server']) {
      console.log(colors.gray('Opening Frontend monitor...'));
      this.openMonitorWindow(CONFIG.frontend);
    }

    if (this.processes.errorWatcher) {
      console.log(colors.gray('Opening Error Watcher monitor...'));
      this.openMonitorWindow(CONFIG.errorWatcher);
    }

    console.log(colors.green('\n✅ Monitoring windows reopened!'));
  }

  // Restart all with safety
  async restartAllWithSafety() {
    console.log(colors.yellow.bold('\n♻️  Restarting Development Environment with Error Prevention\n'));

    // Stop all processes
    for (const [name, child] of Object.entries(this.processes)) {
      if (child && !child.killed) {
        child.kill('SIGTERM');
        console.log(colors.gray(`✅ Stopped ${name}`));
      }
    }

    // Wait for processes to stop
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clear processes
    this.processes = {};

    // Start everything again with safety
    await this.startAllWithSafety();
  }
}

// Main execution
async function main() {
  const manager = new SafeDevManager();
  const args = process.argv.slice(2);
  const command = args[0] || 'start';
  const target = args[1] || 'all';
  
  switch (command) {
    case 'start':
      await manager.startAllWithSafety();
      break;

    case 'restart':
      await manager.restartAllWithSafety();
      break;

    case 'status':
      manager.showStatus();
      break;

    case 'monitors':
      manager.reopenMonitors();
      break;

    default:
      console.log(colors.cyan.bold('🛡️  Safe Development Manager\n'));
      console.log('Usage:');
      console.log('  node dev-manager-with-safety.js start    - Start servers with error watching');
      console.log('  node dev-manager-with-safety.js restart  - Restart with error watching');
      console.log('  node dev-manager-with-safety.js status   - Check status');
      console.log('  node dev-manager-with-safety.js monitors - Reopen monitoring windows');
      console.log('\nMonitoring Windows:');
      console.log('  • Each server gets its own PowerShell window with live output');
      console.log('  • Close windows anytime - servers keep running');
      console.log('  • Reopen windows with "monitors" command');
      console.log('\nThe error watcher will automatically check your code for:');
      console.log('  • JSON parsing errors');
      console.log('  • React array rendering errors');
      console.log('  • Missing error handlers');
      console.log('\n' + colors.green('Error protection is maintained during restarts!'));
      process.exit(0);
  }
}

// Run
main().catch(error => {
  console.error(colors.red('Fatal error:'), error);
  process.exit(1);
});