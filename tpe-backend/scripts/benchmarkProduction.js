/**
 * Production Performance Benchmark Script
 * Phase 5 Day 4: Load Testing - Performance Baseline Measurement
 *
 * Measures current performance of production endpoints to establish baselines
 * before and after optimizations
 */

const axios = require('axios');

const PRODUCTION_URL = 'https://tpx.power100.io';
const ITERATIONS = 50; // Number of requests per endpoint

/**
 * Benchmark a single endpoint
 * @param {string} url - Full URL to benchmark
 * @param {string} name - Friendly name for the endpoint
 * @param {number} iterations - Number of requests to make
 * @returns {Promise<object>} Statistics object
 */
async function benchmarkEndpoint(url, name, iterations = ITERATIONS) {
  console.log(`\n📊 Benchmarking: ${name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Iterations: ${iterations}`);

  const latencies = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < iterations; i++) {
    try {
      const start = Date.now();
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true // Don't throw on any status
      });
      const latency = Date.now() - start;

      latencies.push(latency);

      if (response.status >= 200 && response.status < 300) {
        successCount++;
      } else {
        errorCount++;
      }

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`   Progress: ${i + 1}/${iterations} requests...\r`);
      }
    } catch (error) {
      errorCount++;
      // Still count errors with a high latency
      latencies.push(10000);
    }
  }

  console.log(`   Progress: ${iterations}/${iterations} requests... ✓`);

  // Calculate statistics
  latencies.sort((a, b) => a - b);
  const min = latencies[0];
  const max = latencies[latencies.length - 1];
  const median = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const successRate = (successCount / iterations * 100).toFixed(2);

  return {
    name,
    url,
    iterations,
    successCount,
    errorCount,
    successRate,
    min,
    max,
    median,
    p95,
    p99,
    avg: parseFloat(avg.toFixed(2))
  };
}

/**
 * Display benchmark results
 */
function displayResults(results) {
  console.log('\n' + '='.repeat(70));
  console.log('📈 BENCHMARK RESULTS SUMMARY');
  console.log('='.repeat(70));

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   Success Rate: ${result.successRate}% (${result.successCount}/${result.iterations})`);
    console.log(`   Latency (ms):`);
    console.log(`     Min:    ${result.min}ms`);
    console.log(`     Median: ${result.median}ms`);
    console.log(`     Avg:    ${result.avg}ms`);
    console.log(`     p95:    ${result.p95}ms`);
    console.log(`     p99:    ${result.p99}ms`);
    console.log(`     Max:    ${result.max}ms`);

    // Performance assessment
    if (result.p95 < 200) {
      console.log(`   ✅ EXCELLENT - p95 under 200ms`);
    } else if (result.p95 < 500) {
      console.log(`   ✅ GOOD - p95 under 500ms`);
    } else if (result.p95 < 1000) {
      console.log(`   ⚠️  ACCEPTABLE - p95 under 1s`);
    } else {
      console.log(`   ❌ NEEDS OPTIMIZATION - p95 over 1s`);
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('📊 OVERALL ASSESSMENT');
  console.log('='.repeat(70));

  const totalRequests = results.reduce((sum, r) => sum + r.iterations, 0);
  const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const overallSuccessRate = (totalSuccess / totalRequests * 100).toFixed(2);
  const avgP95 = (results.reduce((sum, r) => sum + r.p95, 0) / results.length).toFixed(2);

  console.log(`\nTotal Requests: ${totalRequests}`);
  console.log(`Success Rate: ${overallSuccessRate}%`);
  console.log(`Average p95 Latency: ${avgP95}ms`);

  console.log('\n📋 Performance Targets:');
  console.log(`  Target p95: < 500ms`);
  console.log(`  Target Success Rate: > 99%`);
  console.log(`  Current Status: ${avgP95 < 500 && overallSuccessRate > 99 ? '✅ PASSING' : '⚠️  NEEDS IMPROVEMENT'}`);
}

/**
 * Main benchmark execution
 */
async function runBenchmarks() {
  console.log('🚀 Production Performance Benchmark');
  console.log('='.repeat(70));
  console.log(`Environment: ${PRODUCTION_URL}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  const results = [];

  try {
    // Benchmark 1: State Machine Diagram
    results.push(await benchmarkEndpoint(
      `${PRODUCTION_URL}/api/state-machine/diagram`,
      'State Machine Diagram',
      ITERATIONS
    ));

    // Benchmark 2: State Machine Metadata
    results.push(await benchmarkEndpoint(
      `${PRODUCTION_URL}/api/state-machine/metadata`,
      'State Machine Metadata',
      ITERATIONS
    ));

    // Benchmark 3: Health Check
    results.push(await benchmarkEndpoint(
      `${PRODUCTION_URL}/api/health`,
      'Health Check',
      ITERATIONS
    ));

    // Display results
    displayResults(results);

    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-results-${timestamp}.json`;
    const fs = require('fs');
    const path = require('path');

    const outputDir = path.join(__dirname, '..', 'tests', 'load');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: PRODUCTION_URL,
      results: results
    }, null, 2));

    console.log(`\n💾 Results saved to: ${outputPath}`);
    console.log('\n✅ Benchmark complete!');

  } catch (error) {
    console.error('\n❌ Benchmark Error:', error.message);
    process.exit(1);
  }
}

// Run benchmarks
runBenchmarks()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
