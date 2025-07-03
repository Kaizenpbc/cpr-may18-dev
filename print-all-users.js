const axios = require('axios');

async function printAllUsers() {
  try {
    const response = await axios.get('http://localhost:3001/api/v1/users');
    console.log('Full /api/v1/users response:');
    console.dir(response.data, { depth: null });
  } catch (error) {
    console.error('Error fetching users:', error.response?.data || error.message);
  }
}

printAllUsers(); 