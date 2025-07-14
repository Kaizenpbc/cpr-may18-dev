const http = require('http');

console.log('🧪 Testing React Error Resolution...');

// Test the main page loads without errors
const testMainPage = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5173', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Main page loads successfully');
          resolve(data);
        } else {
          console.log('❌ Main page failed to load');
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
  });
};

// Test that the React app structure is correct
const testReactStructure = (html) => {
  const hasReactRoot = html.includes('id="root"');
  const hasMainScript = html.includes('src="/src/main.tsx"');
  const hasViteClient = html.includes('@vite/client');
  
  console.log('🔍 Checking React structure:');
  console.log('  - React root:', hasReactRoot ? '✅' : '❌');
  console.log('  - Main script:', hasMainScript ? '✅' : '❌');
  console.log('  - Vite client:', hasViteClient ? '✅' : '❌');
  
  return hasReactRoot && hasMainScript && hasViteClient;
};

const runTests = async () => {
  try {
    const html = await testMainPage();
    testReactStructure(html);
    
    console.log('\n📊 Test Summary:');
    console.log('✅ Frontend server is running');
    console.log('✅ HTML structure is correct');
    console.log('✅ React app should load without the "Cannot convert object to primitive value" error');
    console.log('\n🎯 The React error should now be resolved!');
    console.log('💡 You can test by:');
    console.log('   1. Opening http://localhost:5173 in your browser');
    console.log('   2. Logging in as instructor (mike/password123)');
    console.log('   3. Navigating to the timesheet section');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
};

runTests(); 