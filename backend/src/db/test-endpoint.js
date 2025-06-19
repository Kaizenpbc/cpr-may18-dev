import fetch from 'node-fetch';

const endpoint = process.argv[2] || '/courses/pending';
const method = process.argv.includes('-X') ? process.argv[process.argv.indexOf('-X') + 1] : 'GET';
const body = process.argv.includes('-d') ? process.argv[process.argv.indexOf('-d') + 1] : null;

async function getToken() {
  const response = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'orguser',
      password: 'test123'
    })
  });
  const data = await response.json();
  console.log('Login response:', data);
  if (!data.success) {
    throw new Error('Login failed: ' + JSON.stringify(data));
  }
  return data.data.accessToken;
}

async function testEndpoint(token) {
  const url = 'http://localhost:3001/api/v1' + endpoint;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    ...(body && { body })
  });
  const data = await response.json();
  console.log(`Response from ${endpoint}:`, data);
}

async function main() {
  try {
    const token = await getToken();
    console.log('Token obtained:', token);
    await testEndpoint(token);
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 