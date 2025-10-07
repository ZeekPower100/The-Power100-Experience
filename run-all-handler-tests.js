/**
 * Master Test Runner
 * Runs all handler test suites sequentially and provides overall summary
 */

const { spawn } = require('child_process');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const testSuites = [
  {
    name: 'Speaker Handlers',
    file: 'test-speaker-handlers.js',
    handlers: ['speaker_details', 'speaker_feedback']
  },
  {
    name: 'Sponsor & PCR Handlers',
    file: 'test-sponsor-pcr-handlers.js',
    handlers: ['sponsor_details', 'pcr_response', 'attendance_confirmation']
  },
  {
    name: 'Peer Matching & Check-In',
    file: 'test-peer-checkin-handlers.js',
    handlers: ['peer_match_response', 'event_checkin']
  },
  {
    name: 'Admin Commands & AI Concierge',
    file: 'test-admin-ai-handlers.js',
    handlers: ['admin_command', 'general_question']
  }
];

async function runTestSuite(suite) {
  return new Promise((resolve) => {
    log('cyan', `\n${'='.repeat(60)}`);
    log('bold', `\n🧪 Running: ${suite.name}`);
    log('blue', `   Handlers: ${suite.handlers.join(', ')}`);
    log('cyan', `${'='.repeat(60)}\n`);

    const child = spawn('node', [suite.file], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      const passed = code === 0;

      if (passed) {
        log('green', `\n✅ ${suite.name} - ALL TESTS PASSED`);
      } else {
        log('red', `\n❌ ${suite.name} - SOME TESTS FAILED`);
      }

      resolve({
        suite: suite.name,
        passed,
        handlers: suite.handlers
      });
    });

    child.on('error', (error) => {
      log('red', `\n❌ Error running ${suite.name}: ${error.message}`);
      resolve({
        suite: suite.name,
        passed: false,
        error: error.message,
        handlers: suite.handlers
      });
    });
  });
}

async function runAllTests() {
  log('cyan', '\n╔════════════════════════════════════════════════════════════╗');
  log('cyan', '║                                                            ║');
  log('cyan', '║        EVENT MESSAGE HANDLER - MASTER TEST SUITE           ║');
  log('cyan', '║                                                            ║');
  log('cyan', '╚════════════════════════════════════════════════════════════╝\n');

  log('yellow', `Running ${testSuites.length} test suites...`);
  log('yellow', `Testing ${testSuites.reduce((acc, s) => acc + s.handlers.length, 0)} handlers total\n`);

  const results = [];

  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);
  }

  // Final Summary
  log('cyan', '\n\n╔════════════════════════════════════════════════════════════╗');
  log('cyan', '║                    FINAL SUMMARY                           ║');
  log('cyan', '╚════════════════════════════════════════════════════════════╝\n');

  const totalSuites = results.length;
  const passedSuites = results.filter(r => r.passed).length;
  const failedSuites = results.filter(r => !r.passed).length;

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(color, `${status} ${result.suite}`);
    log('blue', `   Handlers: ${result.handlers.join(', ')}`);
  });

  log('cyan', `\n${'='.repeat(60)}`);
  log('blue', `\nTotal Test Suites: ${totalSuites}`);
  log('green', `Passed: ${passedSuites}`);
  log('red', `Failed: ${failedSuites}`);

  const passRate = Math.round((passedSuites / totalSuites) * 100);

  if (passRate === 100) {
    log('green', `\n🎉🎉🎉 PERFECT SCORE: ${passRate}%`);
    log('green', '🚀 ALL HANDLERS WORKING CORRECTLY!');
    log('green', '✨ N8N-to-Backend Migration: SUCCESSFUL');
  } else if (passRate >= 75) {
    log('yellow', `\n⚠️  Pass Rate: ${passRate}%`);
    log('yellow', 'Most handlers working, some issues to address');
  } else {
    log('red', `\n❌ Pass Rate: ${passRate}%`);
    log('red', 'Significant issues detected - needs debugging');
  }

  log('cyan', `\n${'='.repeat(60)}\n`);

  process.exit(passRate === 100 ? 0 : 1);
}

// Run all tests
runAllTests().catch(error => {
  log('red', `\n❌ Test runner failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
