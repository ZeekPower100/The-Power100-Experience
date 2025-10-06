#!/usr/bin/env node

/**
 * Enhanced Dev Manager with Automatic Error Prevention
 * Starts servers AND watches for errors in real-time
 */

const { spawn } = require('child_process');
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
    color: 'yellow'
  },
  frontend: {
    name: 'Frontend Dev Server',
    command: 'node',
    args: ['node_modules/next/dist/bin/next', 'dev', '--port', '3002'],
    cwd: 'tpe-front-end',
    port: 3002,
    pidFile: '.frontend.pid',
    color: 'cyan'
  },
  errorWatcher: {
    name: 'Error Prevention Watcher',
    command: 'node',
    args: ['tools/dev-watcher.js'],
    pidFile: '.watcher.pid',
    color: 'green',
    optional: true
  }
};

class SafeDevManager {
  constructor() {
    this.processes = {};
    this.isWindows = process.platform === 'win32';
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
    const watcherProcess = spawn(CONFIG.errorWatcher.command, CONFIG.errorWatcher.args, {
      stdio: 'pipe',
      shell: false,
      detached: false
    });

    this.processes.errorWatcher = watcherProcess;

    // Handle watcher output specially
    watcherProcess.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Color code based on content
      if (output.includes('✅')) {
        console.log(colors.green(output.trim()));
      } else if (output.includes('❌') || output.includes('⚠️')) {
        console.log(colors.red.bold(output.trim()));
      } else if (output.includes('🔍')) {
        console.log(colors.yellow(output.trim()));
      } else {
        console.log(colors.gray(output.trim()));
      }
    });

    watcherProcess.stderr.on('data', (data) => {
      console.error(colors.red(`Watcher Error: ${data}`));
    });

    return true;
  }

  // Start a server
  async startServer(config) {
    const options = {
      stdio: 'pipe',
      shell: false,
      detached: false
    };

    if (config.cwd) {
      options.cwd = config.cwd;
    }

    const child = spawn(config.command, config.args, options);
    
    // Save process
    this.processes[config.name] = child;
    
    // Save PID
    if (config.pidFile) {
      fs.writeFileSync(config.pidFile, child.pid.toString());
    }

    // Handle output
    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        const prefix = config.color ? colors[config.color](`[${config.name}]`) : `[${config.name}]`;
        console.log(`${prefix} ${output}`);
      }
    });

    child.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('DeprecationWarning')) {
        console.error(colors.red(`[${config.name} Error] ${output}`));
      }
    });

    // Wait for server to be ready
    if (config.port) {
      await this.waitForPort(config.port, config.name);
    }

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
      
    default:
      console.log(colors.cyan.bold('🛡️  Safe Development Manager\n'));
      console.log('Usage:');
      console.log('  node dev-manager-with-safety.js start   - Start servers with error watching');
      console.log('  node dev-manager-with-safety.js restart - Restart with error watching');
      console.log('  node dev-manager-with-safety.js status  - Check status');
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