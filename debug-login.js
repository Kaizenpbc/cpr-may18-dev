const axios = require('axios');

async function debugLogin() {
    try {
        console.log('Testing login...');
        const response = await axios.post('http://localhost:3001/api/v1/auth/login', {
            username: 'instructor',
            password: 'test123'
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        
        if (response.data.data && response.data.data.accessToken) {
            console.log('✅ Token found:', response.data.data.accessToken.substring(0, 50) + '...');
        } else {
            console.log('❌ No token found');
            console.log('Available keys:', Object.keys(response.data));
        }
        
    } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
    }
}

debugLogin(); 