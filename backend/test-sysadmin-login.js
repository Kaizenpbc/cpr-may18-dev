import fetch from 'node-fetch';

async function testSysadminLogin() {
  try {
    console.log('Testing sysadmin login with password "test123"...');
    
    const response = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'sysadmin',
        password: 'test123'
      })
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ SUCCESS: Sysadmin login works!');
      console.log('User ID:', data.user?.id);
      console.log('Username:', data.user?.username);
      console.log('Role:', data.user?.role);
    } else {
      console.log('❌ FAILED: Login failed');
      console.log('Error:', data.error?.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  }
}

testSysadminLogin(); 