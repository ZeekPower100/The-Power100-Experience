#!/usr/bin/env node

/**
 * Development Server Manager for TPE Workspace
 * Handles clean starting, stopping, and restarting of development servers
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG = {
  frontend: {
    port: 3002,
    dir: 'tpe-front-end',
    startCmd: 'npm',
    startArgs: ['run', 'dev'],
    name: 'Frontend Dev Server',
    pidFile: '.frontend.pid'
  },
  backend: {
    port: 5000,
    dir: 'tpe-backend',
    startCmd: 'npm',
    startArgs: ['start'],
    name: 'Backend Server',
    pidFile: '.backend.pid'
  }
};

class DevManager {
  constructor() {
    this.processes = {};
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  // Find process using a specific port
  async findProcessByPort(port) {
    return new Promise((resolve) => {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          if (line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            resolve(pid);
            return;
          }
        }
        resolve(null);
      });
    });
  }

  // Kill process by PID (gracefully if possible)
  async killProcess(pid, name) {
    return new Promise((resolve) => {
      if (!pid) {
        resolve(true);
        return;
      }

      console.log(`🛑 Stopping ${name} (PID: ${pid})...`);
      
      // Try graceful shutdown first
      try {
        process.kill(pid, 'SIGTERM');
        setTimeout(() => {
          try {
            process.kill(pid, 0); // Check if still running
            // If still running, force kill
            exec(`taskkill /PID ${pid} /F`, () => {
              console.log(`✅ ${name} stopped (forced)`);
              resolve(true);
            });
          } catch (e) {
            console.log(`✅ ${name} stopped gracefully`);
            resolve(true);
          }
        }, 3000);
      } catch (error) {
        // Process might not exist
        exec(`taskkill /PID ${pid} /F`, () => {
          resolve(true);
        });
      }
    });
  }

  // Clean build artifacts
  async cleanBuildArtifacts() {
    console.log('🧹 Cleaning build artifacts...');
    
    // Clean .next folder
    const nextPath = path.join(CONFIG.frontend.dir, '.next');
    if (fs.existsSync(nextPath)) {
      try {
        await this.removeDir(nextPath);
        console.log('✅ Cleaned .next folder');
      } catch (error) {
        console.log('⚠️ Could not clean .next folder (may be in use)');
      }
    }

    // Clean node_modules/.cache if needed
    const cachePath = path.join('node_modules', '.cache');
    if (fs.existsSync(cachePath)) {
      try {
        await this.removeDir(cachePath);
        console.log('✅ Cleaned node_modules cache');
      } catch (error) {
        console.log('⚠️ Could not clean cache folder');
      }
    }
  }

  // Remove directory (Windows compatible)
  async removeDir(dirPath) {
    return new Promise((resolve, reject) => {
      exec(`rmdir /s /q "${dirPath}"`, (error) => {
        if (error) {
          // Try with PowerShell if cmd fails
          exec(`powershell -Command "Remove-Item -Path '${dirPath}' -Recurse -Force"`, (psError) => {
            if (psError) reject(psError);
            else resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }

  // Start a server
  async startServer(config) {
    console.log(`🚀 Starting ${config.name}...`);
    
    const child = spawn(config.startCmd, config.startArgs, {
      cwd: config.dir,
      stdio: 'pipe',
      shell: true,
      detached: true
    });

    // Save PID
    fs.writeFileSync(config.pidFile, child.pid.toString());
    this.processes[config.name] = child;
    
    // Allow the child to continue running independently
    child.unref();

    // Handle output
    child.stdout.on('data', (data) => {
      console.log(`[${config.name}] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      // Filter out non-critical warnings
      if (!msg.includes('ExperimentalWarning') && !msg.includes('npm WARN')) {
        console.error(`[${config.name} Error] ${msg}`);
      }
    });

    child.on('close', (code) => {
      console.log(`[${config.name}] Process exited with code ${code}`);
      delete this.processes[config.name];
      // Clean up PID file
      if (fs.existsSync(config.pidFile)) {
        fs.unlinkSync(config.pidFile);
      }
    });

    // Wait for server to be ready
    await this.waitForServer(config.port, config.name);
  }

  // Wait for server to be ready
  async waitForServer(port, name, maxAttempts = 30) {
    console.log(`⏳ Waiting for ${name} to be ready on port ${port}...`);
    
    for (let i = 0; i < maxAttempts; i++) {
      const pid = await this.findProcessByPort(port);
      if (pid) {
        console.log(`✅ ${name} is ready!`);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`⚠️ ${name} did not start within expected time`);
    return false;
  }

  // Stop all servers
  async stopAll() {
    console.log('🛑 Stopping all servers...');
    
    // Try to stop using saved PIDs first
    for (const [name, config] of Object.entries(CONFIG)) {
      if (fs.existsSync(config.pidFile)) {
        const pid = fs.readFileSync(config.pidFile, 'utf8').trim();
        await this.killProcess(pid, config.name);
        fs.unlinkSync(config.pidFile);
      }
    }

    // Also check ports in case PIDs weren't saved
    for (const [name, config] of Object.entries(CONFIG)) {
      const pid = await this.findProcessByPort(config.port);
      if (pid) {
        await this.killProcess(pid, config.name);
      }
    }

    // Kill any managed processes
    for (const [name, child] of Object.entries(this.processes)) {
      if (child && !child.killed) {
        child.kill('SIGTERM');
        console.log(`✅ Stopped ${name}`);
      }
    }
    
    this.processes = {};
  }

  // Start all servers
  async startAll() {
    console.log('🚀 Starting all servers...\n');
    
    // Start backend first
    await this.startServer(CONFIG.backend);
    
    // Small delay before starting frontend
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start frontend
    await this.startServer(CONFIG.frontend);
    
    console.log('\n✅ All servers started successfully!');
    console.log('📍 Frontend: http://localhost:3002');
    console.log('📍 Backend: http://localhost:5000');
    console.log('\nPress Ctrl+C to stop all servers\n');
  }

  // Restart all servers
  async restartAll() {
    console.log('♻️ Restarting all servers...\n');
    console.log('⚠️  WARNING: Use "npm run safe" for restarts with error protection!');
    console.log('    Current restart does not include error watching.\n');
    await this.stopAll();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.cleanBuildArtifacts();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.startAll();
    console.log('\n⚠️  Consider running "npm run safe" instead for error protection!');
  }

  // Handle graceful shutdown
  setupShutdownHandlers() {
    const shutdown = async () => {
      console.log('\n\n👋 Shutting down gracefully...');
      await this.stopAll();
      this.rl.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('exit', () => {
      // Clean up PID files on exit
      for (const config of Object.values(CONFIG)) {
        if (fs.existsSync(config.pidFile)) {
          fs.unlinkSync(config.pidFile);
        }
      }
    });
  }

  // Interactive menu
  async showMenu() {
    console.log('\n🛠️  TPE Development Manager\n');
    console.log('1. Start all servers');
    console.log('2. Stop all servers');
    console.log('3. Restart all servers');
    console.log('4. Clean build artifacts');
    console.log('5. Status check');
    console.log('6. Exit\n');

    this.rl.question('Choose an option: ', async (answer) => {
      switch(answer) {
        case '1':
          await this.startAll();
          break;
        case '2':
          await this.stopAll();
          await this.showMenu();
          break;
        case '3':
          await this.restartAll();
          break;
        case '4':
          await this.cleanBuildArtifacts();
          await this.showMenu();
          break;
        case '5':
          await this.checkStatus();
          await this.showMenu();
          break;
        case '6':
          await this.stopAll();
          this.rl.close();
          process.exit(0);
          break;
        default:
          console.log('Invalid option');
          await this.showMenu();
      }
    });
  }

  // Check status of servers
  async checkStatus() {
    console.log('\n📊 Server Status:\n');
    
    for (const [name, config] of Object.entries(CONFIG)) {
      const pid = await this.findProcessByPort(config.port);
      if (pid) {
        console.log(`✅ ${config.name}: Running (PID: ${pid}, Port: ${config.port})`);
      } else {
        console.log(`❌ ${config.name}: Not running (Port: ${config.port})`);
      }
    }
  }

  // Main run method
  async run() {
    const args = process.argv.slice(2);
    
    this.setupShutdownHandlers();
    
    if (args.length === 0) {
      await this.showMenu();
    } else {
      const command = args[0];
      const target = args[1]; // Optional target (backend, frontend, all)
      
      switch(command) {
        case 'start':
          await this.startAll();
          // Exit cleanly after starting servers
          console.log('\n📝 Servers started in background mode.');
          console.log('Use "node dev-manager.js status" to check their status.');
          console.log('Use "node dev-manager.js stop" to stop them.');
          process.exit(0);
          break;
        case 'stop':
          await this.stopAll();
          process.exit(0);
          break;
        case 'restart':
          // Support restart with specific target or all
          if (target === 'backend' || target === 'frontend') {
            console.log(`♻️ Restarting ${target} server...`);
            // For now, restart all (can be enhanced to restart specific server)
            await this.restartAll();
          } else {
            await this.restartAll();
          }
          // Exit cleanly after restarting servers
          console.log('\n📝 Servers restarted in background mode.');
          console.log('Use "node dev-manager.js status" to check their status.');
          console.log('Use "node dev-manager.js stop" to stop them.');
          process.exit(0);
          break;
        case 'clean':
          await this.cleanBuildArtifacts();
          process.exit(0);
          break;
        case 'status':
          await this.checkStatus();
          process.exit(0);
          break;
        default:
          console.log('Usage: node dev-manager.js [start|stop|restart|clean|status] [backend|frontend|all]');
          console.log('  start     - Start servers');
          console.log('  stop      - Stop all servers');
          console.log('  restart   - Restart all servers (or specify backend/frontend)');
          console.log('  clean     - Clean build artifacts');
          console.log('  status    - Check server status');
          process.exit(1);
      }
    }
  }
}

// Run the manager
const manager = new DevManager();
manager.run().catch(console.error);