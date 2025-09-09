#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔧 CPR Training System - Configuration Manager\n');

// Generate secure random strings
function generateSecureString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate JWT secret
function generateJWTSecret() {
  return generateSecureString(32);
}

// Generate encryption key
function generateEncryptionKey() {
  return generateSecureString(16); // 32 characters
}

// Generate session secret
function generateSessionSecret() {
  return generateSecureString(32);
}

// Create environment file from template
function createEnvironmentFile(environment, templatePath, outputPath) {
  try {
    if (!fs.existsSync(templatePath)) {
      console.error(`❌ Template file not found: ${templatePath}`);
      return false;
    }

    let content = fs.readFileSync(templatePath, 'utf8');
    
    // Replace placeholder values with generated secure values
    const replacements = {
      'your-super-secure-jwt-secret-minimum-32-characters-long': generateJWTSecret(),
      'your-super-secure-refresh-token-secret-minimum-32-characters-long': generateJWTSecret(),
      'your-32-character-encryption-key-for-db': generateEncryptionKey(),
      'your-super-secure-session-secret-minimum-32-characters-long': generateSessionSecret(),
      'your-staging-jwt-secret-minimum-32-characters-long': generateJWTSecret(),
      'your-staging-refresh-token-secret-minimum-32-characters-long': generateJWTSecret(),
      'your-staging-32-character-encryption-key': generateEncryptionKey(),
      'your-staging-session-secret-minimum-32-characters-long': generateSessionSecret()
    };

    // Apply replacements
    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    // Write the file
    fs.writeFileSync(outputPath, content);
    console.log(`✅ Created ${environment} environment file: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create ${environment} environment file:`, error.message);
    return false;
  }
}

// Validate environment file
function validateEnvironmentFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Environment file not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues = [];

    // Check for placeholder values
    const placeholders = [
      'your-production-db-host',
      'your-production-db-user',
      'your-strong-production-db-password',
      'your-sendgrid-api-key',
      'yourdomain.com',
      'your-redis-host',
      'your-redis-password'
    ];

    for (const line of lines) {
      for (const placeholder of placeholders) {
        if (line.includes(placeholder)) {
          issues.push(`Line contains placeholder: ${placeholder}`);
        }
      }
    }

    if (issues.length > 0) {
      console.warn(`⚠️ ${filePath} contains placeholder values:`);
      issues.forEach(issue => console.warn(`   - ${issue}`));
      return false;
    }

    console.log(`✅ ${filePath} validation passed`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to validate ${filePath}:`, error.message);
    return false;
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const templatesDir = path.join(__dirname, '..', 'config-templates');
  const backendDir = path.join(__dirname, '..', 'backend');

  switch (command) {
    case 'generate':
      const env = args[1] || 'production';
      const templateFile = path.join(templatesDir, `${env}.env.template`);
      const outputFile = path.join(backendDir, `.env.${env}`);
      
      console.log(`🔧 Generating ${env} environment configuration...`);
      
      if (createEnvironmentFile(env, templateFile, outputFile)) {
        console.log(`\n📋 Next steps:`);
        console.log(`1. Review and update ${outputFile} with your actual values`);
        console.log(`2. Replace placeholder values (yourdomain.com, your-db-host, etc.)`);
        console.log(`3. Set proper file permissions: chmod 600 ${outputFile}`);
        console.log(`4. Test the configuration: npm run config:validate`);
      }
      break;

    case 'validate':
      const envToValidate = args[1] || 'production';
      const envFile = path.join(backendDir, `.env.${envToValidate}`);
      
      console.log(`🔍 Validating ${envToValidate} environment configuration...`);
      validateEnvironmentFile(envFile);
      break;

    case 'list':
      console.log('📋 Available environment templates:');
      const templateFiles = fs.readdirSync(templatesDir)
        .filter(file => file.endsWith('.env.template'))
        .map(file => file.replace('.env.template', ''));
      
      templateFiles.forEach(template => {
        console.log(`   - ${template}`);
      });
      break;

    case 'secrets':
      console.log('🔐 Generated secure secrets:');
      console.log(`JWT Secret: ${generateJWTSecret()}`);
      console.log(`Refresh Token Secret: ${generateJWTSecret()}`);
      console.log(`Encryption Key: ${generateEncryptionKey()}`);
      console.log(`Session Secret: ${generateSessionSecret()}`);
      break;

    default:
      console.log('🔧 CPR Training System - Configuration Manager');
      console.log('\nUsage:');
      console.log('  node scripts/config-manager.js generate [environment]  - Generate environment file from template');
      console.log('  node scripts/config-manager.js validate [environment]  - Validate environment file');
      console.log('  node scripts/config-manager.js list                    - List available templates');
      console.log('  node scripts/config-manager.js secrets                 - Generate secure secrets');
      console.log('\nExamples:');
      console.log('  node scripts/config-manager.js generate production');
      console.log('  node scripts/config-manager.js validate production');
      console.log('  node scripts/config-manager.js secrets');
      break;
  }
}

main();
