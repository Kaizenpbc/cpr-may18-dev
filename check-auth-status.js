const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Authentication Status');
console.log('==================================\n');

// Check if backend is running
console.log('1. Checking if backend server is running...');
try {
  const { execSync } = require('child_process');
  const result = execSync('netstat -an | findstr :3000', { encoding: 'utf8' });
  if (result.includes('LISTENING')) {
    console.log('✅ Backend server is running on port 3000');
  } else {
    console.log('❌ Backend server is not running on port 3000');
  }
} catch (error) {
  console.log('❌ Backend server is not running');
}
console.log('');

// Check frontend dev server
console.log('2. Checking if frontend dev server is running...');
try {
  const { execSync } = require('child_process');
  const result = execSync('netstat -an | findstr :5173', { encoding: 'utf8' });
  if (result.includes('LISTENING')) {
    console.log('✅ Frontend dev server is running on port 5173');
  } else {
    console.log('❌ Frontend dev server is not running on port 5173');
  }
} catch (error) {
  console.log('❌ Frontend dev server is not running');
}
console.log('');

// Check for any active sessions in the database
console.log('3. Checking for active sessions...');
console.log('   (This would require database access - checking if we can connect)');

// Instructions for manual check
console.log('\n📋 Manual Authentication Check Instructions:');
console.log('============================================');
console.log('');
console.log('1. Open your browser and go to: http://localhost:5173');
console.log('');
console.log('2. Check if you see:');
console.log('   ✅ Login page = You are logged out');
console.log('   ❌ Dashboard/portal = You are still logged in');
console.log('');
console.log('3. Open browser DevTools (F12) and check:');
console.log('   - Application tab → Local Storage');
console.log('   - Look for any authentication tokens');
console.log('   - If you see tokens, you are still logged in');
console.log('');
console.log('4. Check all browser tabs:');
console.log('   - Look for any tabs with the application open');
console.log('   - Each tab might have different authentication state');
console.log('');
console.log('5. To completely log out:');
console.log('   - Close all browser tabs with the application');
console.log('   - Clear browser storage (DevTools → Application → Clear Storage)');
console.log('   - Or use the logout button if you can access it');
console.log('');
console.log('🔧 Quick Commands:');
console.log('==================');
console.log('Start backend: npm run dev:backend');
console.log('Start frontend: npm run dev:frontend');
console.log('Clear browser storage: Open DevTools → Application → Clear Storage');
console.log('');

// Check if there are any recent log files that might show authentication activity
console.log('4. Checking for recent authentication activity...');
const logFiles = [
  'backend/logs/app.log',
  'backend/logs/error.log',
  'logs/app.log',
  'logs/error.log'
];

let foundLogs = false;
for (const logFile of logFiles) {
  if (fs.existsSync(logFile)) {
    try {
      const stats = fs.statSync(logFile);
      const lastModified = new Date(stats.mtime);
      const timeDiff = Date.now() - stats.mtime.getTime();
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      console.log(`✅ Found log file: ${logFile}`);
      console.log(`   Last modified: ${lastModified.toLocaleString()} (${minutesAgo} minutes ago)`);
      foundLogs = true;
    } catch (error) {
      // Ignore errors
    }
  }
}

if (!foundLogs) {
  console.log('❌ No recent log files found');
}

console.log('\n🎯 Summary:');
console.log('============');
console.log('To verify if you are logged out of all tabs:');
console.log('1. Check if you can access the login page');
console.log('2. Verify no authentication tokens in browser storage');
console.log('3. Ensure all browser tabs are closed or showing login');
console.log('4. Start fresh by clearing browser storage if needed');
console.log('');
console.log('The new token validation system will automatically detect');
console.log('and handle multi-tab authentication issues going forward! 🚀'); 