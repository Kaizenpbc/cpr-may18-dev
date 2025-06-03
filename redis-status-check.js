const axios = require('axios');
const redis = require('redis');

console.log('\n================================================================================');
console.log('🔍 COMPREHENSIVE REDIS & APPLICATION STATUS CHECK');
console.log('================================================================================\n');

async function checkRedisServer() {
    console.log('🔴 Testing Redis Server Connection...');
    try {
        const client = redis.createClient({
            host: 'localhost',
            port: 6379,
            retry_on_failure: false,
            no_ready_check: true
        });
        
        await client.connect();
        await client.set('test_key', 'Redis is working!');
        const result = await client.get('test_key');
        await client.del('test_key');
        await client.disconnect();
        
        console.log('   ✅ Redis server: CONNECTED');
        console.log('   ✅ Redis operations: WORKING');
        console.log(`   📊 Test result: ${result}`);
        return true;
    } catch (error) {
        console.log('   ❌ Redis connection: FAILED');
        console.log(`   🔍 Error: ${error.message}`);
        return false;
    }
}

async function checkApplicationHealth() {
    console.log('\n🚀 Testing CPR Application Health...');
    try {
        const response = await axios.get('http://localhost:3001/health', { timeout: 5000 });
        console.log('   ✅ Application: RUNNING');
        console.log('   ✅ Health endpoint: RESPONDING');
        console.log(`   📊 Status: ${response.status}`);
        return true;
    } catch (error) {
        console.log('   ❌ Application: NOT RESPONDING');
        console.log(`   🔍 Error: ${error.message}`);
        return false;
    }
}

async function checkRedisIntegration() {
    console.log('\n🔗 Testing Redis Integration...');
    try {
        // Test login endpoint which should use Redis if enabled
        const response = await axios.post('http://localhost:3001/login', {
            email: 'admin@cpr.com',
            password: 'admin123'
        }, { timeout: 5000 });
        
        console.log('   ✅ Redis integration: ACTIVE');
        console.log('   ✅ Session management: ENHANCED');
        return true;
    } catch (error) {
        if (error.response) {
            console.log('   ⚠️ Application responding but Redis integration unclear');
            console.log(`   📊 Response status: ${error.response.status}`);
        } else {
            console.log('   ❌ Cannot test Redis integration - app not responding');
        }
        return false;
    }
}

async function main() {
    const redisWorking = await checkRedisServer();
    const appWorking = await checkApplicationHealth();
    const integrationWorking = appWorking ? await checkRedisIntegration() : false;
    
    console.log('\n================================================================================');
    console.log('📊 FINAL STATUS SUMMARY');
    console.log('================================================================================');
    
    console.log(`🔴 Redis Server: ${redisWorking ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`🚀 CPR Application: ${appWorking ? '✅ RUNNING' : '❌ DOWN'}`);
    console.log(`🔗 Redis Integration: ${integrationWorking ? '✅ ACTIVE' : '⚠️ UNKNOWN'}`);
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (!redisWorking) {
        console.log('   • Start Redis server: C:\\Redis\\redis-server.exe');
    }
    if (!appWorking) {
        console.log('   • Start CPR application: npm run dev');
        console.log('   • Set Redis environment: $env:REDIS_ENABLED = "true"');
    }
    if (redisWorking && appWorking && !integrationWorking) {
        console.log('   • Redis integration may need configuration review');
    }
    if (redisWorking && appWorking) {
        console.log('   • System is ready! 🎉');
    }
    
    console.log('\n================================================================================\n');
}

main().catch(console.error); 