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

class DatabasePerformanceTester {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.results = {
      optimizationTests: [],
      performanceTests: [],
      cacheTests: [],
      maintenanceTests: [],
      passed: 0,
      failed: 0
    };
  }

  async makeRequest(path, options = {}) {
    const url = `${this.baseURL}${path}`;
    try {
      const start = performance.now();
      const response = await axios({
        url,
        timeout: 30000,
        validateStatus: () => true,
        ...options
      });
      const end = performance.now();
      
      return {
        success: response.status >= 200 && response.status < 300,
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

  async testDatabaseOptimization() {
    log('\n🔧 Testing Database Optimization', 'cyan');
    
    const result = await this.makeRequest('/api/v1/database/optimize', {
      method: 'POST'
    });
    
    if (result.success) {
      log(`   ✅ Database optimization completed in ${result.responseTime}ms`, 'green');
      log(`   📊 Results: ${result.data.data.successful} successful, ${result.data.data.failed} failed`, 'blue');
      
      if (result.data.data.results && result.data.data.results.length > 0) {
        log('   📝 Recent optimizations:', 'blue');
        result.data.data.results.slice(-5).forEach(res => {
          const emoji = res.includes('✅') ? '' : res.includes('⚠️') ? '⚠️' : '❌';
          log(`     ${emoji} ${res}`, res.includes('✅') ? 'green' : res.includes('⚠️') ? 'yellow' : 'red');
        });
      }
      
      this.results.optimizationTests.push({
        test: 'Database Optimization',
        status: 'success',
        successful: result.data.data.successful,
        failed: result.data.data.failed,
        responseTime: result.responseTime
      });
      this.results.passed++;
    } else {
      log(`   ❌ Database optimization failed: ${result.error || result.data?.message}`, 'red');
      this.results.optimizationTests.push({
        test: 'Database Optimization',
        status: 'failed',
        error: result.error || result.data?.message
      });
      this.results.failed++;
    }
  }

  async testPerformanceAnalysis() {
    log('\n📊 Testing Performance Analysis', 'cyan');
    
    const result = await this.makeRequest('/api/v1/database/performance-analysis');
    
    if (result.success) {
      const data = result.data.data;
      log(`   ✅ Performance analysis completed in ${result.responseTime}ms`, 'green');
      
      const recommendations = data.performance_recommendations || [];
      const critical = recommendations.filter(r => r.estimatedImprovement?.includes('High')).length;
      const medium = recommendations.filter(r => r.estimatedImprovement?.includes('Medium')).length;
      const low = recommendations.filter(r => r.estimatedImprovement?.includes('Low')).length;
      
      log(`   📈 Performance Issues Found:`, 'blue');
      log(`     🔴 Critical (High Impact): ${critical}`, critical > 0 ? 'red' : 'green');
      log(`     🟡 Medium Impact: ${medium}`, medium > 0 ? 'yellow' : 'green');
      log(`     🟢 Low Impact: ${low}`, 'green');
      
      if (critical > 0) {
        log('   🔴 Critical Issues:', 'red');
        recommendations
          .filter(r => r.estimatedImprovement?.includes('High'))
          .slice(0, 3)
          .forEach(rec => {
            log(`     • ${rec.table}: ${rec.issue}`, 'yellow');
          });
      }
      
      this.results.performanceTests.push({
        test: 'Performance Analysis',
        status: 'success',
        critical_issues: critical,
        medium_issues: medium,
        low_issues: low,
        total_recommendations: recommendations.length,
        responseTime: result.responseTime
      });
      this.results.passed++;
    } else {
      log(`   ❌ Performance analysis failed: ${result.error}`, 'red');
      this.results.performanceTests.push({
        test: 'Performance Analysis',
        status: 'failed',
        error: result.error
      });
      this.results.failed++;
    }
  }

  async testOptimizedQueries() {
    log('\n🧪 Testing Optimized Queries', 'cyan');
    
    const result = await this.makeRequest('/api/v1/database/test-optimized-queries');
    
    if (result.success) {
      const data = result.data.data;
      log(`   ✅ Query optimization tests completed in ${result.responseTime}ms`, 'green');
      log(`   📊 Success Rate: ${data.summary.success_rate}% (${data.summary.successful_tests}/${data.summary.total_tests})`, 
          data.summary.success_rate >= 75 ? 'green' : 'yellow');
      
      data.test_results.forEach(test => {
        if (test.status === 'success') {
          log(`     ✅ ${test.test}: ${test.execution_time}ms, ${test.rows_returned} rows`, 'green');
          if (test.indexes_used && test.indexes_used.length > 0) {
            log(`       📑 Indexes: ${test.indexes_used.join(', ')}`, 'blue');
          }
        } else {
          log(`     ❌ ${test.test}: ${test.error}`, 'red');
        }
      });
      
      this.results.performanceTests.push({
        test: 'Optimized Queries',
        status: 'success',
        success_rate: data.summary.success_rate,
        tests: data.test_results,
        responseTime: result.responseTime
      });
      this.results.passed++;
    } else {
      log(`   ❌ Optimized query tests failed: ${result.error}`, 'red');
      this.results.performanceTests.push({
        test: 'Optimized Queries',
        status: 'failed',
        error: result.error
      });
      this.results.failed++;
    }
  }

  async testDatabaseStatistics() {
    log('\n📈 Testing Database Statistics', 'cyan');
    
    const result = await this.makeRequest('/api/v1/database/stats');
    
    if (result.success) {
      const data = result.data.data;
      log(`   ✅ Database statistics retrieved in ${result.responseTime}ms`, 'green');
      
      if (data.connection_stats) {
        log(`   🔗 Connections: ${data.connection_stats.active_connections} active, ${data.connection_stats.idle_connections} idle`, 'blue');
      }
      
      if (data.size_stats) {
        log(`   💾 Database Size: ${data.size_stats.database_size}`, 'blue');
        log(`   📊 Total Table Size: ${data.size_stats.total_table_size}`, 'blue');
      }
      
      if (data.tableStats && data.tableStats.length > 0) {
        log(`   📋 Tables: ${data.tableStats.length} tracked`, 'blue');
        log(`   🔍 Indexes: ${data.indexStats?.length || 0} tracked`, 'blue');
        
        // Show top 3 tables by size
        const topTables = data.tableStats.slice(0, 3);
        log('   📈 Top Tables by Size:', 'blue');
        topTables.forEach(table => {
          log(`     • ${table.tablename}: ${table.live_tuples} live rows`, 'cyan');
        });
      }
      
      this.results.performanceTests.push({
        test: 'Database Statistics',
        status: 'success',
        table_count: data.tableStats?.length || 0,
        index_count: data.indexStats?.length || 0,
        responseTime: result.responseTime
      });
      this.results.passed++;
    } else {
      log(`   ❌ Database statistics failed: ${result.error}`, 'red');
      this.results.performanceTests.push({
        test: 'Database Statistics',
        status: 'failed',
        error: result.error
      });
      this.results.failed++;
    }
  }

  async testCacheIntegration() {
    log('\n💾 Testing Cache Integration', 'cyan');
    
    // Test cache stats
    const statsResult = await this.makeRequest('/api/v1/database/cache-stats');
    
    if (statsResult.success) {
      const data = statsResult.data.data;
      log(`   ✅ Cache statistics retrieved in ${statsResult.responseTime}ms`, 'green');
      log(`   📊 Cache Status: ${data.enabled ? 'Enabled' : 'Disabled'}`, data.enabled ? 'green' : 'yellow');
      
      if (data.enabled) {
        log(`   🔗 Cache Connected: ${data.isConnected ? 'Yes' : 'No'}`, data.isConnected ? 'green' : 'red');
      }
      
      this.results.cacheTests.push({
        test: 'Cache Statistics',
        status: 'success',
        enabled: data.enabled,
        connected: data.isConnected,
        responseTime: statsResult.responseTime
      });
      this.results.passed++;
    } else {
      log(`   ❌ Cache statistics failed: ${statsResult.error}`, 'red');
      this.results.cacheTests.push({
        test: 'Cache Statistics',
        status: 'failed',
        error: statsResult.error
      });
      this.results.failed++;
    }
    
    // Test cache invalidation
    const invalidateResult = await this.makeRequest('/api/v1/database/invalidate-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { pattern: 'test:*' }
    });
    
    if (invalidateResult.success) {
      log(`   ✅ Cache invalidation test completed in ${invalidateResult.responseTime}ms`, 'green');
      this.results.cacheTests.push({
        test: 'Cache Invalidation',
        status: 'success',
        responseTime: invalidateResult.responseTime
      });
      this.results.passed++;
    } else {
      log(`   ❌ Cache invalidation test failed: ${invalidateResult.error}`, 'red');
      this.results.cacheTests.push({
        test: 'Cache Invalidation',
        status: 'failed',
        error: invalidateResult.error
      });
      this.results.failed++;
    }
  }

  async testMaintenanceOperations() {
    log('\n🔧 Testing Maintenance Operations', 'cyan');
    
    // Test auto maintenance
    const result = await this.makeRequest('/api/v1/database/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { operation: 'auto' }
    });
    
    if (result.success) {
      const data = result.data.data;
      log(`   ✅ Auto maintenance completed in ${result.responseTime}ms`, 'green');
      log(`   📊 Operation: ${data.operation}`, 'blue');
      
      if (data.results && data.results.length > 0) {
        const successful = data.results.filter(r => r.includes('✅')).length;
        const failed = data.results.filter(r => r.includes('❌')).length;
        
        log(`   📈 Results: ${successful} successful, ${failed} failed`, 'blue');
        
        if (data.results.length > 0) {
          log('   📝 Sample Results:', 'blue');
          data.results.slice(0, 3).forEach(res => {
            log(`     ${res}`, res.includes('✅') ? 'green' : 'red');
          });
        }
      }
      
      this.results.maintenanceTests.push({
        test: 'Auto Maintenance',
        status: 'success',
        operation: data.operation,
        responseTime: result.responseTime
      });
      this.results.passed++;
    } else {
      log(`   ❌ Auto maintenance failed: ${result.error}`, 'red');
      this.results.maintenanceTests.push({
        test: 'Auto Maintenance',
        status: 'failed',
        error: result.error
      });
      this.results.failed++;
    }
  }

  async testComprehensiveReport() {
    log('\n📊 Testing Comprehensive Performance Report', 'cyan');
    
    const result = await this.makeRequest('/api/v1/database/performance-report');
    
    if (result.success) {
      const data = result.data.data;
      log(`   ✅ Performance report generated in ${result.responseTime}ms`, 'green');
      
      if (data.summary) {
        log(`   💾 Database Size: ${data.summary.database_size}`, 'blue');
        log(`   📊 Tables: ${data.summary.total_tables}, Indexes: ${data.summary.total_indexes}`, 'blue');
        log(`   🔗 Connections: ${data.summary.current_connections}/${data.summary.max_connections}`, 'blue');
      }
      
      if (data.performance_issues) {
        const { critical, medium, low } = data.performance_issues;
        log(`   🚨 Performance Issues:`, 'blue');
        log(`     Critical: ${critical}, Medium: ${medium}, Low: ${low}`, 
            critical > 0 ? 'red' : medium > 0 ? 'yellow' : 'green');
      }
      
      if (data.cache_performance) {
        log(`   💾 Cache Status: ${data.cache_performance.status}`, 
            data.cache_performance.status === 'Healthy' ? 'green' : 'yellow');
      }
      
      log(`   🔧 Maintenance Required: ${data.maintenance_required ? 'Yes' : 'No'}`, 
          data.maintenance_required ? 'yellow' : 'green');
      
      this.results.performanceTests.push({
        test: 'Comprehensive Report',
        status: 'success',
        performance_issues: data.performance_issues,
        cache_status: data.cache_performance?.status,
        maintenance_required: data.maintenance_required,
        responseTime: result.responseTime
      });
      this.results.passed++;
    } else {
      log(`   ❌ Performance report failed: ${result.error}`, 'red');
      this.results.performanceTests.push({
        test: 'Comprehensive Report',
        status: 'failed',
        error: result.error
      });
      this.results.failed++;
    }
  }

  async runAllTests() {
    log('\n' + '='.repeat(80), 'cyan');
    log('🚀 DATABASE PERFORMANCE OPTIMIZATION TEST SUITE', 'bold');
    log('🎯 Testing Database Indexes, Query Optimization & Caching', 'blue');
    log('='.repeat(80), 'cyan');

    // Test 1: Database Optimization
    await this.testDatabaseOptimization();
    
    // Test 2: Performance Analysis
    await this.testPerformanceAnalysis();
    
    // Test 3: Optimized Queries
    await this.testOptimizedQueries();
    
    // Test 4: Database Statistics
    await this.testDatabaseStatistics();
    
    // Test 5: Cache Integration
    await this.testCacheIntegration();
    
    // Test 6: Maintenance Operations
    await this.testMaintenanceOperations();
    
    // Test 7: Comprehensive Report
    await this.testComprehensiveReport();
    
    this.printSummary();
  }

  printSummary() {
    log('\n' + '='.repeat(80), 'cyan');
    log('📊 DATABASE PERFORMANCE TEST RESULTS', 'bold');
    log('='.repeat(80), 'cyan');
    
    const totalTests = this.results.passed + this.results.failed;
    const successRate = totalTests > 0 ? Math.round((this.results.passed / totalTests) * 100) : 0;
    
    log(`\n📈 Overall Results:`, 'blue');
    log(`   ✅ Tests Passed: ${this.results.passed}`, 'green');
    log(`   ❌ Tests Failed: ${this.results.failed}`, 'red');
    log(`   📊 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');
    
    // Optimization Results
    if (this.results.optimizationTests.length > 0) {
      log(`\n🔧 Database Optimization:`, 'blue');
      this.results.optimizationTests.forEach(test => {
        if (test.status === 'success') {
          log(`   ✅ ${test.test}: ${test.successful} optimizations applied`, 'green');
        } else {
          log(`   ❌ ${test.test}: ${test.error}`, 'red');
        }
      });
    }
    
    // Performance Results
    if (this.results.performanceTests.length > 0) {
      log(`\n📊 Performance Tests:`, 'blue');
      this.results.performanceTests.forEach(test => {
        if (test.status === 'success') {
          if (test.critical_issues !== undefined) {
            log(`   📈 ${test.test}: ${test.critical_issues} critical, ${test.medium_issues} medium issues`, 
                test.critical_issues > 0 ? 'yellow' : 'green');
          } else if (test.success_rate !== undefined) {
            log(`   🧪 ${test.test}: ${test.success_rate}% success rate`, 
                test.success_rate >= 75 ? 'green' : 'yellow');
          } else {
            log(`   ✅ ${test.test}: Completed successfully`, 'green');
          }
        } else {
          log(`   ❌ ${test.test}: ${test.error}`, 'red');
        }
      });
    }
    
    // Cache Results
    if (this.results.cacheTests.length > 0) {
      log(`\n💾 Cache Integration:`, 'blue');
      this.results.cacheTests.forEach(test => {
        if (test.status === 'success') {
          if (test.enabled !== undefined) {
            log(`   💾 ${test.test}: ${test.enabled ? 'Enabled' : 'Disabled'}, ${test.connected ? 'Connected' : 'Disconnected'}`, 
                test.enabled && test.connected ? 'green' : 'yellow');
          } else {
            log(`   ✅ ${test.test}: Completed successfully`, 'green');
          }
        } else {
          log(`   ❌ ${test.test}: ${test.error}`, 'red');
        }
      });
    }
    
    // Maintenance Results
    if (this.results.maintenanceTests.length > 0) {
      log(`\n🔧 Maintenance Operations:`, 'blue');
      this.results.maintenanceTests.forEach(test => {
        if (test.status === 'success') {
          log(`   ✅ ${test.test}: ${test.operation} completed`, 'green');
        } else {
          log(`   ❌ ${test.test}: ${test.error}`, 'red');
        }
      });
    }
    
    log('\n' + '='.repeat(80), 'cyan');
    
    if (successRate >= 80) {
      log('\n🎉 Database optimization implementation is excellent!', 'green');
      log('💡 Your database is well-optimized with proper indexes and caching.', 'green');
    } else if (successRate >= 60) {
      log('\n⚠️ Database optimization needs some attention!', 'yellow');
      log('💡 Consider running the optimization script and addressing performance issues.', 'yellow');
    } else {
      log('\n❌ Database optimization has significant issues!', 'red');
      log('💡 Critical: Run database optimization script and fix performance issues.', 'red');
    }
    
    log('\n💡 Optimization Tips:', 'blue');
    log('   • Run database optimization script regularly', 'cyan');
    log('   • Monitor query performance and add indexes as needed', 'cyan');
    log('   • Use cache for frequently accessed data', 'cyan');
    log('   • Perform regular database maintenance (VACUUM, ANALYZE)', 'cyan');
    log('   • Monitor database size and connection usage', 'cyan');
  }
}

// Run the tests
async function main() {
  const tester = new DatabasePerformanceTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    log(`\n❌ Error running database performance tests: ${error.message}`, 'red');
  }
}

main(); 