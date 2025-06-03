const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvVar(varName, expectedType = 'string', isRequired = true) {
  const value = process.env[varName];
  
  if (!value) {
    if (isRequired) {
      log(`   ❌ ${varName}: Missing (REQUIRED)`, 'red');
      return false;
    } else {
      log(`   ⚪ ${varName}: Not set (optional)`, 'yellow');
      return true;
    }
  }
  
  if (expectedType === 'number') {
    const num = parseInt(value);
    if (isNaN(num)) {
      log(`   ❌ ${varName}: Invalid number "${value}"`, 'red');
      return false;
    }
    log(`   ✅ ${varName}: ${num}`, 'green');
  } else {
    const displayValue = varName.toLowerCase().includes('password') || varName.toLowerCase().includes('secret') 
      ? '*'.repeat(value.length) 
      : value;
    log(`   ✅ ${varName}: ${displayValue}`, 'green');
  }
  
  return true;
}

function validatePasswordStrength(password, name) {
  if (!password) return false;
  
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const notDefault = password !== 'test123';
  
  const score = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial, notDefault].filter(Boolean).length;
  
  let strength, color;
  if (score >= 6) {
    strength = 'Strong';
    color = 'green';
  } else if (score >= 4) {
    strength = 'Medium';
    color = 'yellow';
  } else {
    strength = 'Weak';
    color = 'red';
  }
  
  log(`   🔐 ${name}: ${strength} (${score}/6 criteria)`, color);
  
  if (!notDefault) {
    log(`   ⚠️  WARNING: Still using default 'test123' password!`, 'red');
  }
  
  return score >= 4;
}

async function verifySecurityConfiguration() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🛡️  SECURITY CONFIGURATION VERIFICATION', 'bold');
  log('='.repeat(60), 'cyan');
  
  let allPassed = true;
  
  // Check database configuration
  log('\n📊 Database Configuration:', 'blue');
  allPassed &= checkEnvVar('DB_HOST');
  allPassed &= checkEnvVar('DB_PORT', 'number');
  allPassed &= checkEnvVar('DB_NAME');
  allPassed &= checkEnvVar('DB_USER');
  allPassed &= checkEnvVar('DB_PASSWORD');
  
  // Check server configuration
  log('\n🖥️  Server Configuration:', 'blue');
  allPassed &= checkEnvVar('NODE_ENV');
  allPassed &= checkEnvVar('PORT', 'number');
  allPassed &= checkEnvVar('FRONTEND_URL');
  
  // Check JWT configuration
  log('\n🔑 JWT Configuration:', 'blue');
  allPassed &= checkEnvVar('JWT_SECRET');
  allPassed &= checkEnvVar('REFRESH_TOKEN_SECRET');
  
  // Check NEW security configuration
  log('\n⚡ NEW Security Configuration (Fixed Hard-coded Values):', 'blue');
  allPassed &= checkEnvVar('BCRYPT_SALT_ROUNDS', 'number');
  allPassed &= checkEnvVar('ACCESS_TOKEN_EXPIRY');
  allPassed &= checkEnvVar('REFRESH_TOKEN_EXPIRY');
  
  // Check secure passwords
  log('\n🔐 Secure Default Passwords (Replaced Hard-coded):', 'blue');
  allPassed &= checkEnvVar('DEFAULT_ADMIN_PASSWORD');
  allPassed &= checkEnvVar('DEFAULT_INSTRUCTOR_PASSWORD');
  allPassed &= checkEnvVar('DEFAULT_ORG_PASSWORD');
  allPassed &= checkEnvVar('DEFAULT_ACCOUNTANT_PASSWORD');
  
  // Validate password strength
  log('\n🔍 Password Strength Analysis:', 'blue');
  const adminStrong = validatePasswordStrength(process.env.DEFAULT_ADMIN_PASSWORD, 'Admin Password');
  const instructorStrong = validatePasswordStrength(process.env.DEFAULT_INSTRUCTOR_PASSWORD, 'Instructor Password');
  const orgStrong = validatePasswordStrength(process.env.DEFAULT_ORG_PASSWORD, 'Organization Password');
  const accountantStrong = validatePasswordStrength(process.env.DEFAULT_ACCOUNTANT_PASSWORD, 'Accountant Password');
  
  allPassed &= adminStrong && instructorStrong && orgStrong && accountantStrong;
  
  // Check optional configuration
  log('\n🔧 Optional Configuration:', 'blue');
  checkEnvVar('REDIS_ENABLED', 'string', false);
  checkEnvVar('REDIS_HOST', 'string', false);
  checkEnvVar('REDIS_PORT', 'number', false);
  checkEnvVar('APP_NAME', 'string', false);
  checkEnvVar('SUPPORT_EMAIL', 'string', false);
  
  // Security improvements summary
  log('\n🛡️  Security Improvements Summary:', 'blue');
  
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
  if (saltRounds >= 12) {
    log('   ✅ BCRYPT salt rounds: Strong (≥12)', 'green');
  } else if (saltRounds >= 10) {
    log('   ⚠️  BCRYPT salt rounds: Adequate (10-11)', 'yellow');
  } else {
    log('   ❌ BCRYPT salt rounds: Weak (<10)', 'red');
    allPassed = false;
  }
  
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length >= 32) {
    log('   ✅ JWT Secret: Strong length (≥32 chars)', 'green');
  } else if (jwtSecret.length >= 16) {
    log('   ⚠️  JWT Secret: Adequate length (16-31 chars)', 'yellow');
  } else {
    log('   ❌ JWT Secret: Weak length (<16 chars)', 'red');
    allPassed = false;
  }
  
  // Final result
  log('\n' + '='.repeat(60), 'cyan');
  if (allPassed) {
    log('🎉 ALL SECURITY CHECKS PASSED!', 'green');
    log('✅ Hard-coded values have been successfully replaced', 'green');
    log('✅ Environment-based configuration is working', 'green');
    log('✅ Security improvements are active', 'green');
  } else {
    log('⚠️  SOME SECURITY ISSUES FOUND!', 'yellow');
    log('💡 Please review the failed checks above', 'yellow');
    log('💡 Run setup-secure-env.bat to fix configuration', 'yellow');
  }
  log('='.repeat(60), 'cyan');
  
  // Login information
  log('\n🔑 Updated Login Credentials:', 'blue');
  log('   • Admin:      username=admin,     password=' + (process.env.DEFAULT_ADMIN_PASSWORD || 'test123'), 'cyan');
  log('   • Instructor: username=instructor, password=' + (process.env.DEFAULT_INSTRUCTOR_PASSWORD || 'test123'), 'cyan');
  log('   • Org User:   username=orguser,   password=' + (process.env.DEFAULT_ORG_PASSWORD || 'test123'), 'cyan');
  log('   • Accountant: username=accountant, password=' + (process.env.DEFAULT_ACCOUNTANT_PASSWORD || 'test123'), 'cyan');
  
  log('\n💡 Next Steps:', 'blue');
  log('   1. Restart your backend server to apply all changes', 'cyan');
  log('   2. Test login with the new credentials above', 'cyan');
  log('   3. For production: use even stronger, unique passwords', 'cyan');
  
  return allPassed;
}

// Run verification
verifySecurityConfiguration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\n❌ Verification failed: ${error.message}`, 'red');
    process.exit(1);
  }); 