/**
 * Worker Manager - Starts all BullMQ workers
 * This ensures both follow-up and event message workers run together
 */

const { fork } = require('child_process');
const path = require('path');

const workers = [
  { name: 'Follow-up Worker', path: './followUpWorker.js' },
  { name: 'Event Message Worker', path: './eventMessageWorker.js' },
  { name: 'Event Orchestration Worker', path: './eventOrchestrationWorker.js' }
];

const childProcesses = [];

console.log('🚀 Starting all BullMQ workers...\n');

workers.forEach(worker => {
  console.log(`📍 Starting ${worker.name}...`);
  const child = fork(path.join(__dirname, worker.path), [], {
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    console.log(`\n❌ ${worker.name} exited with code ${code}`);
    // Restart worker if it crashes
    console.log(`🔄 Restarting ${worker.name}...`);
    setTimeout(() => {
      const newChild = fork(path.join(__dirname, worker.path), [], {
        stdio: 'inherit'
      });
      childProcesses.push(newChild);
    }, 2000);
  });

  childProcesses.push(child);
});

console.log('\n✅ All workers started!\n');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down all workers...');
  childProcesses.forEach(child => child.kill('SIGTERM'));
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down all workers...');
  childProcesses.forEach(child => child.kill('SIGINT'));
  process.exit(0);
});
