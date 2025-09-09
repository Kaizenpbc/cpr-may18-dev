#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔐 Generating SSL/TLS Certificates...\n');

// Create SSL directory
const sslDir = path.join(__dirname, '..', 'ssl');
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
  console.log('✅ Created SSL directory');
}

// Generate private key
console.log('1. Generating private key...');
try {
  execSync(`openssl genrsa -out ${sslDir}/server.key 2048`, { stdio: 'inherit' });
  console.log('✅ Private key generated');
} catch (error) {
  console.error('❌ Failed to generate private key:', error.message);
  process.exit(1);
}

// Generate certificate signing request
console.log('\n2. Generating certificate signing request...');
try {
  const csrConfig = `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C=US
ST=State
L=City
O=CPR Training System
OU=IT Department
CN=localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
`;

  fs.writeFileSync(`${sslDir}/csr.conf`, csrConfig);
  execSync(`openssl req -new -key ${sslDir}/server.key -out ${sslDir}/server.csr -config ${sslDir}/csr.conf`, { stdio: 'inherit' });
  console.log('✅ Certificate signing request generated');
} catch (error) {
  console.error('❌ Failed to generate CSR:', error.message);
  process.exit(1);
}

// Generate self-signed certificate
console.log('\n3. Generating self-signed certificate...');
try {
  execSync(`openssl x509 -req -in ${sslDir}/server.csr -signkey ${sslDir}/server.key -out ${sslDir}/server.crt -days 365 -extensions v3_req -extfile ${sslDir}/csr.conf`, { stdio: 'inherit' });
  console.log('✅ Self-signed certificate generated');
} catch (error) {
  console.error('❌ Failed to generate certificate:', error.message);
  process.exit(1);
}

// Set proper permissions
console.log('\n4. Setting file permissions...');
try {
  // Make key file readable only by owner
  fs.chmodSync(`${sslDir}/server.key`, 0o600);
  fs.chmodSync(`${sslDir}/server.crt`, 0o644);
  console.log('✅ File permissions set');
} catch (error) {
  console.error('❌ Failed to set permissions:', error.message);
}

// Clean up temporary files
console.log('\n5. Cleaning up temporary files...');
try {
  fs.unlinkSync(`${sslDir}/csr.conf`);
  fs.unlinkSync(`${sslDir}/server.csr`);
  console.log('✅ Temporary files cleaned up');
} catch (error) {
  console.warn('⚠️ Failed to clean up temporary files:', error.message);
}

// Display certificate information
console.log('\n6. Certificate information:');
try {
  execSync(`openssl x509 -in ${sslDir}/server.crt -text -noout | grep -E "(Subject:|Issuer:|Not Before|Not After|DNS:|IP:)"`, { stdio: 'inherit' });
} catch (error) {
  console.log('Could not display certificate information');
}

console.log('\n🎉 SSL/TLS certificates generated successfully!');
console.log(`📁 Certificate files location: ${sslDir}`);
console.log('📋 Files created:');
console.log('   - server.key (private key)');
console.log('   - server.crt (certificate)');
console.log('\n⚠️  Note: These are self-signed certificates for development only.');
console.log('   For production, use certificates from a trusted Certificate Authority.');

// Create environment file for SSL paths
const envContent = `
# SSL/TLS Configuration
SSL_KEY_PATH=${sslDir}/server.key
SSL_CERT_PATH=${sslDir}/server.crt
SSL_ENABLED=true
`;

fs.writeFileSync(path.join(__dirname, '..', '.env.ssl'), envContent);
console.log('\n✅ Created .env.ssl file with SSL configuration');
