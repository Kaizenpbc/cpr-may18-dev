const Redis = require('ioredis');

async function setupRedis() {
  console.log('🔧 Setting up Redis for email queue...');
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  });

  try {
    // Test connection
    await redis.ping();
    console.log('✅ Redis connection successful');
    
    // Test basic operations
    await redis.set('test_key', 'test_value');
    const value = await redis.get('test_key');
    await redis.del('test_key');
    
    if (value === 'test_value') {
      console.log('✅ Redis read/write operations working');
    } else {
      console.log('❌ Redis read/write test failed');
    }
    
    console.log('🎉 Redis is ready for email queue service');
  } catch (error) {
    console.error('❌ Redis setup failed:', error.message);
    console.log('\n📋 To fix this:');
    console.log('1. Install Redis: https://redis.io/download');
    console.log('2. Start Redis server');
    console.log('3. Or use Docker: docker run -d -p 6379:6379 redis:alpine');
  } finally {
    redis.disconnect();
  }
}

setupRedis(); 