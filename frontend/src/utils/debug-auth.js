// Debug script to check authentication state
console.log('🔍 Debugging authentication state...');

// Check sessionStorage
console.log('SessionStorage contents:');
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  const value = sessionStorage.getItem(key);
  console.log(`  ${key}: ${value ? 'present' : 'null'}`);
}

// Check localStorage
console.log('LocalStorage contents:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`  ${key}: ${value ? 'present' : 'null'}`);
}

// Check if tokenService is available
if (window.tokenService) {
  console.log('TokenService available:', !!window.tokenService);
  console.log('Access token exists:', !!window.tokenService.getAccessToken());
  console.log('Auth header:', window.tokenService.getAuthHeader());
} else {
  console.log('TokenService not available');
}

// Check if user is logged in
const user = sessionStorage.getItem('user') || localStorage.getItem('user');
console.log('User data:', user ? JSON.parse(user) : 'No user data');

console.log('🔍 Authentication debug complete'); 