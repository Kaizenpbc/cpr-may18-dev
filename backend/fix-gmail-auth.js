const fs = require('fs');
const path = require('path');

console.log('🔧 Gmail SMTP Authentication Fix');
console.log('================================');
console.log('');

console.log('📧 Current Email Configuration:');
console.log('SMTP_HOST: smtp.gmail.com');
console.log('SMTP_USER: kpbcma@gmail.com');
console.log('SMTP_PASS: [current password]');
console.log('');

console.log('❌ Problem: Gmail requires App Password for SMTP');
console.log('✅ Solution: Generate App Password and update .env');
console.log('');

console.log('🔧 Steps to Fix:');
console.log('1. Go to https://myaccount.google.com/security');
console.log('2. Enable 2-Step Verification if not already enabled');
console.log('3. Go to "App passwords" (under 2-Step Verification)');
console.log('4. Select "Mail" and "Other (Custom name)"');
console.log('5. Enter "CPR Training System" as the name');
console.log('6. Click "Generate"');
console.log('7. Copy the 16-character App Password');
console.log('');

console.log('📝 Once you have the App Password:');
console.log('1. Update the .env file with the new password');
console.log('2. Restart the backend server');
console.log('3. Test email functionality');
console.log('');

// Function to update .env file with new App Password
function updateEnvFile(newAppPassword) {
  const envPath = path.join(__dirname, '.env');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the SMTP_PASS line
    envContent = envContent.replace(
      /SMTP_PASS=.*/,
      `SMTP_PASS=${newAppPassword}`
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated successfully!');
    console.log('🔄 Please restart the backend server');
    
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
  }
}

// If App Password is provided as command line argument
if (process.argv[2]) {
  const newAppPassword = process.argv[2];
  console.log(`🔧 Updating .env file with new App Password...`);
  updateEnvFile(newAppPassword);
} else {
  console.log('💡 To automatically update .env file:');
  console.log('   node fix-gmail-auth.js "YOUR_16_CHAR_APP_PASSWORD"');
  console.log('');
  console.log('📧 Example:');
  console.log('   node fix-gmail-auth.js "abcd efgh ijkl mnop"');
} 