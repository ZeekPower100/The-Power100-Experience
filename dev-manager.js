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
    startCmd: 'node',
    startArgs: ['../node_modules/next/dist/bin/next', 'dev', '--port', '3002'],
    name: 'Frontend Dev Server',
    pidFile: '.frontend.pid',
    logFile: 'frontend.log'
  },
  backend: {
    port: 5000,
    dir: 'tpe-backend',
    startCmd: 'npm',
    startArgs: ['start'],
    name: 'Backend Server',
    pidFile: '.backend.pid',
    logFile: 'backend.log'
  },
  worker: {
    port: null, // Worker doesn't listen on a port
    dir: 'tpe-backend',
    startCmd: 'npm',
    startArgs: ['run', 'worker:dev'],
    name: 'Bull Worker',
    pidFile: '.worker.pid',
    noPortCheck: true, // Skip port checking for worker
    logFile: 'worker.log'
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

    // Clear N8N_API_KEY from environment to force .env file to load
    const env = { ...process.env };
    delete env.N8N_API_KEY;

    // Create log file streams
    const logDir = config.dir;
    const logFile = path.join(logDir, config.logFile);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' }); // Append mode

    const child = spawn(config.startCmd, config.startArgs, {
      cwd: config.dir,
      stdio: 'pipe',
      shell: true,
      detached: true,
      env: env
    });

    // Save PID
    fs.writeFileSync(config.pidFile, child.pid.toString());
    this.processes[config.name] = child;

    // Allow the child to continue running independently
    child.unref();

    // Handle output - log to both console AND file
    child.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log(`[${config.name}] ${msg.trim()}`);
      logStream.write(`[${new Date().toISOString()}] ${msg}`);
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString();
      logStream.write(`[${new Date().toISOString()}] [ERROR] ${msg}`);
      // Filter out non-critical warnings from console
      if (!msg.includes('ExperimentalWarning') && !msg.includes('npm WARN')) {
        console.error(`[${config.name} Error] ${msg.trim()}`);
      }
    });

    child.on('close', (code) => {
      const msg = `Process exited with code ${code}`;
      console.log(`[${config.name}] ${msg}`);
      logStream.write(`[${new Date().toISOString()}] ${msg}\n`);
      logStream.end();
      delete this.processes[config.name];
      // Clean up PID file
      if (fs.existsSync(config.pidFile)) {
        fs.unlinkSync(config.pidFile);
      }
    });

    // Wait for server to be ready (default 300 seconds = 5 minutes)
    await this.waitForServer(config.port, config.name, 300, config.noPortCheck);
  }

  // Wait for server to be ready
  async waitForServer(port, name, maxAttempts = 120, noPortCheck = false) {
    // If no port check needed (like for worker), just wait a bit and assume ready
    if (noPortCheck) {
      console.log(`⏳ Waiting for ${name} to start...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log(`✅ ${name} is ready!`);
      return true;
    }

    console.log(`⏳ Waiting for ${name} to be ready on port ${port}...`);
    console.log(`   (Timeout: ${maxAttempts} seconds - Next.js compilation can take time)`);

    for (let i = 0; i < maxAttempts; i++) {
      const pid = await this.findProcessByPort(port);
      if (pid) {
        console.log(`✅ ${name} is ready! (Started in ${i} seconds)`);
        return true;
      }

      // Show progress every 15 seconds
      if (i > 0 && i % 15 === 0) {
        console.log(`   ⏳ Still waiting... (${i}/${maxAttempts} seconds)`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`⚠️ ${name} did not start within ${maxAttempts} seconds`);
    console.log(`   This may indicate an error - check the logs in ${name.toLowerCase().replace(/\s+/g, '-')}.log`);
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

    // Small delay before starting worker
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start Bull worker
    await this.startServer(CONFIG.worker);

    // Small delay before starting frontend
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start frontend
    await this.startServer(CONFIG.frontend);

    console.log('\n✅ All servers started successfully!');
    console.log('📍 Frontend: http://localhost:3002');
    console.log('📍 Backend: http://localhost:5000');
    console.log('📍 Bull Worker: Running in background');
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
      if (config.noPortCheck) {
        // For worker, check PID file
        if (fs.existsSync(config.pidFile)) {
          const pid = fs.readFileSync(config.pidFile, 'utf8').trim();
          console.log(`✅ ${config.name}: Running (PID: ${pid})`);
        } else {
          console.log(`❌ ${config.name}: Not running`);
        }
      } else {
        const pid = await this.findProcessByPort(config.port);
        if (pid) {
          console.log(`✅ ${config.name}: Running (PID: ${pid}, Port: ${config.port})`);
        } else {
          console.log(`❌ ${config.name}: Not running (Port: ${config.port})`);
        }
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