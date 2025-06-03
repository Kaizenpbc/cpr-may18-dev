const { spawn } = require('child_process');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class MasterPerformanceTester {
  constructor() {
    this.results = {
      cacheTest: { status: 'pending', duration: 0 },
      databaseTest: { status: 'pending', duration: 0 },
      startTime: Date.now()
    };
  }

  async runTest(scriptName, testName) {
    return new Promise((resolve, reject) => {
      log(`\n🚀 Starting ${testName}...`, 'cyan');
      const startTime = Date.now();
      
      const child = spawn('node', [scriptName], {
        stdio: 'inherit',
        shell: true
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const durationSeconds = Math.round(duration / 1000);
        
        if (code === 0) {
          log(`\n✅ ${testName} completed successfully in ${durationSeconds}s`, 'green');
          resolve({ status: 'success', duration: durationSeconds });
        } else {
          log(`\n❌ ${testName} failed with exit code ${code}`, 'red');
          resolve({ status: 'failed', duration: durationSeconds, exitCode: code });
        }
      });

      child.on('error', (error) => {
        log(`\n❌ ${testName} error: ${error.message}`, 'red');
        reject(error);
      });
    });
  }

  async runAllTests() {
    log('\n' + '='.repeat(80), 'cyan');
    log('🎯 COMPREHENSIVE PERFORMANCE TEST SUITE', 'bold');
    log('🚀 Testing Cache Performance + Database Optimization', 'blue');
    log('='.repeat(80), 'cyan');

    try {
      // Test 1: Cache Performance
      this.results.cacheTest = await this.runTest('test-caching-performance.js', 'Redis Cache Performance Test');
      
      // Small delay between tests
      log('\n⏳ Preparing for database optimization tests...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test 2: Database Optimization
      this.results.databaseTest = await this.runTest('test-database-performance.js', 'Database Optimization Test');
      
      this.printSummary();
      
    } catch (error) {
      log(`\n❌ Critical error in test suite: ${error.message}`, 'red');
    }
  }

  printSummary() {
    const totalDuration = Math.round((Date.now() - this.results.startTime) / 1000);
    
    log('\n' + '='.repeat(80), 'cyan');
    log('📊 COMPREHENSIVE PERFORMANCE TEST RESULTS', 'bold');
    log('='.repeat(80), 'cyan');
    
    log(`\n⏱️ Total Test Duration: ${totalDuration} seconds`, 'blue');
    
    // Cache Test Results
    log(`\n💾 Cache Performance Test:`, 'blue');
    if (this.results.cacheTest.status === 'success') {
      log(`   ✅ Completed successfully in ${this.results.cacheTest.duration}s`, 'green');
    } else {
      log(`   ❌ Failed after ${this.results.cacheTest.duration}s`, 'red');
      if (this.results.cacheTest.exitCode) {
        log(`   📊 Exit Code: ${this.results.cacheTest.exitCode}`, 'yellow');
      }
    }
    
    // Database Test Results
    log(`\n🗄️ Database Optimization Test:`, 'blue');
    if (this.results.databaseTest.status === 'success') {
      log(`   ✅ Completed successfully in ${this.results.databaseTest.duration}s`, 'green');
    } else {
      log(`   ❌ Failed after ${this.results.databaseTest.duration}s`, 'red');
      if (this.results.databaseTest.exitCode) {
        log(`   📊 Exit Code: ${this.results.databaseTest.exitCode}`, 'yellow');
      }
    }
    
    // Overall Assessment
    const successfulTests = [this.results.cacheTest, this.results.databaseTest]
      .filter(test => test.status === 'success').length;
    const totalTests = 2;
    const successRate = Math.round((successfulTests / totalTests) * 100);
    
    log(`\n📈 Overall Performance Assessment:`, 'blue');
    log(`   ✅ Tests Passed: ${successfulTests}/${totalTests}`, successfulTests === totalTests ? 'green' : 'yellow');
    log(`   📊 Success Rate: ${successRate}%`, successRate === 100 ? 'green' : successRate >= 50 ? 'yellow' : 'red');
    
    if (successRate === 100) {
      log('\n🎉 EXCELLENT! Your system is fully optimized!', 'green');
      log('💡 Both caching and database optimization are working perfectly.', 'green');
      log('🚀 Your CPR Training System is ready for production scale!', 'green');
    } else if (successRate >= 50) {
      log('\n⚠️ GOOD! Most optimizations are working.', 'yellow');
      log('💡 Review the failed tests and address any issues.', 'yellow');
      log('🔧 Your system has solid performance foundations.', 'yellow');
    } else {
      log('\n❌ NEEDS ATTENTION! Performance optimizations need work.', 'red');
      log('💡 Both caching and database optimization need attention.', 'red');
      log('🔧 Consider reviewing the setup and configuration.', 'red');
    }
    
    log('\n📋 Performance Optimization Checklist:', 'blue');
    
    // Cache checklist
    if (this.results.cacheTest.status === 'success') {
      log('   ✅ Redis caching is working correctly', 'green');
    } else {
      log('   ❌ Redis caching needs configuration', 'red');
      log('     • Ensure Redis is running on port 6379', 'cyan');
      log('     • Check REDIS_ENABLED=true in environment', 'cyan');
      log('     • Verify network connectivity to Redis', 'cyan');
    }
    
    // Database checklist
    if (this.results.databaseTest.status === 'success') {
      log('   ✅ Database optimization is working correctly', 'green');
    } else {
      log('   ❌ Database optimization needs attention', 'red');
      log('     • Run database optimization script manually', 'cyan');
      log('     • Check PostgreSQL connection and permissions', 'cyan');
      log('     • Verify database schema exists', 'cyan');
    }
    
    log('\n🔧 Next Steps:', 'blue');
    log('   1. If any tests failed, review the error messages above', 'cyan');
    log('   2. Run individual test scripts for detailed analysis', 'cyan');
    log('   3. Check server logs for additional troubleshooting info', 'cyan');
    log('   4. Consider running tests after addressing any issues', 'cyan');
    
    log('\n💡 Pro Tips:', 'blue');
    log('   • Run these tests regularly to monitor performance', 'cyan');
    log('   • Set up monitoring alerts based on test results', 'cyan');
    log('   • Consider automating these tests in your CI/CD pipeline', 'cyan');
    log('   • Document any performance improvements over time', 'cyan');
    
    log('\n' + '='.repeat(80), 'cyan');
    
    // Exit with appropriate code
    if (successRate === 100) {
      log('🎯 All performance tests passed! System is optimized.\n', 'green');
      process.exit(0);
    } else if (successRate >= 50) {
      log('⚠️ Some performance issues detected. Review and improve.\n', 'yellow');
      process.exit(1);
    } else {
      log('❌ Significant performance issues detected. Immediate attention required.\n', 'red');
      process.exit(2);
    }
  }
}

// Helper function to check if scripts exist
const fs = require('fs');

function checkTestScripts() {
  const scripts = ['test-caching-performance.js', 'test-database-performance.js'];
  const missing = scripts.filter(script => !fs.existsSync(script));
  
  if (missing.length > 0) {
    log(`\n❌ Missing test scripts: ${missing.join(', ')}`, 'red');
    log('💡 Make sure all test scripts are in the current directory.', 'yellow');
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    checkTestScripts();
    
    const tester = new MasterPerformanceTester();
    await tester.runAllTests();
    
  } catch (error) {
    log(`\n❌ Fatal error in performance test suite: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Add command line argument handling
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('\n🎯 Comprehensive Performance Test Suite', 'cyan');
  log('📊 Tests both Redis caching and database optimization', 'blue');
  log('\nUsage:', 'blue');
  log('  node test-all-performance.js', 'cyan');
  log('\nOptions:', 'blue');
  log('  --help, -h    Show this help message', 'cyan');
  log('\nPrerequisites:', 'blue');
  log('  • Redis server running on port 6379', 'cyan');
  log('  • PostgreSQL database accessible', 'cyan');
  log('  • Backend server running on port 3001', 'cyan');
  log('  • test-caching-performance.js in current directory', 'cyan');
  log('  • test-database-performance.js in current directory', 'cyan');
  log('\nTest Components:', 'blue');
  log('  1. Redis Cache Performance Test', 'cyan');
  log('     • Cache hit/miss ratios', 'cyan');
  log('     • Response time improvements', 'cyan');
  log('     • Cache invalidation testing', 'cyan');
  log('  2. Database Optimization Test', 'cyan');
  log('     • Index creation and usage', 'cyan');
  log('     • Query performance analysis', 'cyan');
  log('     • Maintenance operations', 'cyan');
  log('     • Comprehensive reporting', 'cyan');
  process.exit(0);
}

main(); 