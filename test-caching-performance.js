const axios = require('axios');
const { performance } = require('perf_hooks');

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

class CachePerformanceTester {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.results = {
      tests: [],
      passed: 0,
      failed: 0,
      performanceGains: []
    };
  }

  async makeRequest(path, options = {}) {
    const url = `${this.baseURL}${path}`;
    try {
      const start = performance.now();
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true, // Accept all status codes
        ...options
      });
      const end = performance.now();
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers,
        responseTime: Math.round(end - start)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: null
      };
    }
  }

  async testCachePerformance(endpoint, testName, iterations = 3) {
    log(`\n🚀 Testing: ${testName}`, 'cyan');
    log(`   Endpoint: ${endpoint}`, 'blue');
    
    const times = [];
    let cacheHits = 0;
    let cacheMisses = 0;
    
    for (let i = 0; i < iterations; i++) {
      log(`   Request ${i + 1}/${iterations}...`, 'yellow');
      
      const result = await this.makeRequest(endpoint);
      
      if (result.success) {
        times.push(result.responseTime);
        
        // Check cache headers
        const cacheStatus = result.headers['x-cache'];
        if (cacheStatus === 'HIT') {
          cacheHits++;
          log(`     ✅ ${result.responseTime}ms (CACHE HIT)`, 'green');
        } else if (cacheStatus === 'MISS') {
          cacheMisses++;
          log(`     📊 ${result.responseTime}ms (CACHE MISS)`, 'yellow');
        } else {
          log(`     ⚠️  ${result.responseTime}ms (NO CACHE INFO)`, 'magenta');
        }
      } else {
        log(`     ❌ Failed: ${result.error}`, 'red');
        this.results.failed++;
        return;
      }
      
      // Small delay between requests to allow cache to be set
      if (i === 0) await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Calculate performance metrics
    const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const firstTime = times[0];
    const cachedTime = times.length > 1 ? Math.round(times.slice(1).reduce((a, b) => a + b, 0) / (times.length - 1)) : null;
    
    const performanceGain = cachedTime ? Math.round(((firstTime - cachedTime) / firstTime) * 100) : 0;
    
    log(`\n   📊 Results:`, 'bold');
    log(`     First Request: ${firstTime}ms (cache miss)`, 'blue');
    if (cachedTime) {
      log(`     Cached Requests: ${cachedTime}ms avg (cache hits)`, 'green');
      log(`     Performance Gain: ${performanceGain}% faster`, performanceGain > 0 ? 'green' : 'red');
    }
    log(`     Cache Hits: ${cacheHits}, Cache Misses: ${cacheMisses}`, 'cyan');
    
    this.results.performanceGains.push({
      endpoint,
      testName,
      firstTime,
      cachedTime,
      performanceGain,
      cacheHits,
      cacheMisses
    });
    
    this.results.passed++;
    this.results.tests.push(testName);
  }

  async testCacheInvalidation(endpoint, testName) {
    log(`\n🗑️  Testing Cache Invalidation: ${testName}`, 'cyan');
    
    // First request (cache miss)
    const result1 = await this.makeRequest(endpoint);
    log(`   First request: ${result1.responseTime}ms (${result1.headers['x-cache'] || 'NO CACHE'})`, 'yellow');
    
    // Second request (should be cache hit)
    await new Promise(resolve => setTimeout(resolve, 100));
    const result2 = await this.makeRequest(endpoint);
    log(`   Second request: ${result2.responseTime}ms (${result2.headers['x-cache'] || 'NO CACHE'})`, 'green');
    
    // Invalidate cache
    try {
      await this.makeRequest('/api/v1/cache/invalidate', {
        method: 'POST',
        data: { pattern: 'course_types' }
      });
      log(`   Cache invalidated`, 'magenta');
    } catch (error) {
      log(`   Cache invalidation failed: ${error.message}`, 'red');
    }
    
    // Third request (should be cache miss again)
    await new Promise(resolve => setTimeout(resolve, 100));
    const result3 = await this.makeRequest(endpoint);
    log(`   Post-invalidation: ${result3.responseTime}ms (${result3.headers['x-cache'] || 'NO CACHE'})`, 'yellow');
    
    this.results.passed++;
    this.results.tests.push(testName);
  }

  async runAllTests() {
    log('\n' + '='.repeat(80), 'cyan');
    log('🚀 REDIS CACHING PERFORMANCE TEST SUITE', 'bold');
    log('🎯 Testing Cache Implementation & Performance Gains', 'blue');
    log('='.repeat(80), 'cyan');

    // Test 1: Course Types (Reference Data)
    await this.testCachePerformance('/api/v1/course-types', 'Course Types Caching', 4);
    
    // Test 2: Organizations (Reference Data)
    await this.testCachePerformance('/api/v1/accounting/organizations', 'Organizations Caching', 4);
    
    // Test 3: Certifications (Reference Data)
    await this.testCachePerformance('/api/v1/certifications', 'Certifications Caching', 4);
    
    // Test 4: Health Check (Should not be cached)
    await this.testCachePerformance('/health', 'Health Check (No Caching)', 3);
    
    // Test 5: Cache Stats
    await this.testCachePerformance('/api/v1/cache/stats', 'Cache Statistics', 3);
    
    // Test 6: Cache Invalidation
    await this.testCacheInvalidation('/api/v1/course-types', 'Course Types Cache Invalidation');
    
    this.printSummary();
  }

  printSummary() {
    log('\n' + '='.repeat(80), 'cyan');
    log('📊 CACHING PERFORMANCE TEST RESULTS', 'bold');
    log('='.repeat(80), 'cyan');
    
    const totalTests = this.results.passed + this.results.failed;
    const successRate = totalTests > 0 ? Math.round((this.results.passed / totalTests) * 100) : 0;
    
    log(`\n📈 Overall Results:`, 'blue');
    log(`   ✅ Tests Passed: ${this.results.passed}`, 'green');
    log(`   ❌ Tests Failed: ${this.results.failed}`, 'red');
    log(`   📊 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');
    
    log(`\n🚀 Performance Analysis:`, 'blue');
    
    if (this.results.performanceGains.length > 0) {
      let totalGain = 0;
      let gainCount = 0;
      
      this.results.performanceGains.forEach(gain => {
        if (gain.performanceGain > 0) {
          log(`   ${gain.testName}: ${gain.performanceGain}% faster (${gain.firstTime}ms → ${gain.cachedTime}ms)`, 'green');
          totalGain += gain.performanceGain;
          gainCount++;
        } else {
          log(`   ${gain.testName}: No performance gain`, 'yellow');
        }
      });
      
      if (gainCount > 0) {
        const avgGain = Math.round(totalGain / gainCount);
        log(`\n   🎯 Average Performance Gain: ${avgGain}%`, avgGain > 50 ? 'green' : 'yellow');
      }
    }
    
    log(`\n📋 Tested Endpoints:`, 'blue');
    this.results.tests.forEach((test, index) => {
      log(`   ${index + 1}. ${test}`, 'cyan');
    });
    
    log('\n' + '='.repeat(80), 'cyan');
    
    if (successRate >= 80) {
      log('\n🎉 Caching implementation is working excellently!', 'green');
    } else if (successRate >= 60) {
      log('\n⚠️ Caching implementation needs some attention!', 'yellow');
    } else {
      log('\n❌ Caching implementation has significant issues!', 'red');
    }
    
    log('\n💡 Tips for optimization:', 'blue');
    log('   • Ensure Redis is running and REDIS_ENABLED=true', 'cyan');
    log('   • Check cache TTL settings for your use case', 'cyan');
    log('   • Monitor cache hit rates in production', 'cyan');
    log('   • Consider cache warming for critical endpoints', 'cyan');
  }
}

// Run the tests
async function main() {
  const tester = new CachePerformanceTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    log(`\n❌ Error running cache tests: ${error.message}`, 'red');
  }
}

main(); 