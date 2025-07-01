const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing login...');
        const response = await axios.post('http://localhost:3001/api/v1/auth/login', {
            username: 'instructor',
            password: 'test123'
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        console.log('Response headers:', response.headers);
        
        if (response.data.accessToken) {
            console.log('✅ accessToken found');
        } else if (response.data.token) {
            console.log('✅ token found');
        } else if (response.data.session) {
            console.log('✅ session found');
        } else {
            console.log('❌ No token found in response');
            console.log('Available keys:', Object.keys(response.data));
        }
        
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
    }
}

testLogin(); 