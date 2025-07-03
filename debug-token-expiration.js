const jwt = require('jsonwebtoken');

function debugTokenExpiration() {
  console.log('🔍 Debugging Token Expiration...\n');

  // 1. Create a test token
  console.log('1. Creating test token...');
  const payload = {
    id: 1,
    userId: 1,
    username: 'admin',
    role: 'admin'
  };
  
  const token = jwt.sign(payload, 'access_secret', { expiresIn: '15m' });
  console.log(`   Token: ${token.substring(0, 20)}...`);

  // 2. Decode the token
  console.log('\n2. Decoding token...');
  const decoded = jwt.decode(token);
  console.log('   Decoded token:', JSON.stringify(decoded, null, 2));

  // 3. Check the expiration time
  console.log('\n3. Checking expiration time...');
  const expTimestamp = decoded.exp;
  const expDate = new Date(expTimestamp * 1000);
  const now = new Date();
  const nowTimestamp = Math.floor(now.getTime() / 1000);
  
  console.log(`   Expiration timestamp: ${expTimestamp}`);
  console.log(`   Expiration date: ${expDate}`);
  console.log(`   Current timestamp: ${nowTimestamp}`);
  console.log(`   Current date: ${now}`);
  console.log(`   Is expired: ${expTimestamp < nowTimestamp}`);

  // 4. Test the calculation from the logout endpoint
  console.log('\n4. Testing logout endpoint calculation...');
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  console.log(`   Calculated expiresAt: ${expiresAt}`);
  console.log(`   Is in future: ${expiresAt > now}`);

  // 5. Show timezone info
  console.log('\n5. Timezone information:');
  console.log(`   Current timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log(`   Current timezone offset: ${now.getTimezoneOffset()} minutes`);
  console.log(`   Expiration timezone offset: ${expDate.getTimezoneOffset()} minutes`);
}

debugTokenExpiration(); 