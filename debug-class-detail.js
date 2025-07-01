const axios = require('axios');

async function debugClassDetail() {
    try {
        // Login first
        const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
            username: 'instructor',
            password: 'test123'
        });
        const token = loginResponse.data.data.accessToken;
        console.log('Login successful, token:', token.substring(0, 30) + '...');

        // Now get class detail
        const response = await axios.get('http://localhost:3001/api/v1/instructor/classes/1', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Class detail response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.error('Error status:', error.response.status);
            console.error('Error data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

debugClassDetail(); 