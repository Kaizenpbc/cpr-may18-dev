import fs from 'fs';
import path from 'path';
import { logSecurityEvent, AuditEventSeverity } from '../middleware/auditLogger.js';

// SSL/TLS Configuration
export interface SSLConfig {
  enabled: boolean;
  keyPath: string;
  certPath: string;
  caPath?: string;
  passphrase?: string;
  secureProtocol: string;
  ciphers: string[];
  honorCipherOrder: boolean;
  secureOptions: number[];
  minVersion: string;
  maxVersion: string;
  sessionTimeout: number;
  sessionIdContext: string;
  rejectUnauthorized: boolean;
  requestCert: boolean;
  agent: boolean;
}

// Production SSL configuration
export const PRODUCTION_SSL_CONFIG: SSLConfig = {
  enabled: process.env.NODE_ENV === 'production',
  keyPath: process.env.SSL_KEY_PATH || '/etc/ssl/private/server.key',
  certPath: process.env.SSL_CERT_PATH || '/etc/ssl/certs/server.crt',
  caPath: process.env.SSL_CA_PATH || '/etc/ssl/certs/ca.crt',
  passphrase: process.env.SSL_PASSPHRASE,
  secureProtocol: 'TLSv1_2_method',
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA',
    'ECDHE-RSA-AES128-SHA',
    'DHE-RSA-AES256-GCM-SHA384',
    'DHE-RSA-AES128-GCM-SHA256',
    'DHE-RSA-AES256-SHA256',
    'DHE-RSA-AES128-SHA256',
    'DHE-RSA-AES256-SHA',
    'DHE-RSA-AES128-SHA'
  ].join(':'),
  honorCipherOrder: true,
  secureOptions: [
    0x00000004, // SSL_OP_NO_SSLv2
    0x00000008, // SSL_OP_NO_SSLv3
    0x00000010, // SSL_OP_NO_TLSv1
    0x00000020, // SSL_OP_NO_TLSv1_1
    0x00000040, // SSL_OP_NO_TLSv1_2 (if needed)
    0x00000080, // SSL_OP_NO_TLSv1_3 (if needed)
    0x00000200, // SSL_OP_CIPHER_SERVER_PREFERENCE
    0x00000400, // SSL_OP_NO_TICKET
    0x00000800, // SSL_OP_NO_COMPRESSION
    0x00001000, // SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION
    0x00002000, // SSL_OP_SINGLE_ECDH_USE
    0x00004000, // SSL_OP_SINGLE_DH_USE
    0x00008000, // SSL_OP_EPHEMERAL_RSA
    0x00010000, // SSL_OP_CIPHER_SERVER_PREFERENCE
    0x00020000, // SSL_OP_TLS_ROLLBACK_BUG
    0x00040000, // SSL_OP_NO_SSLv2
    0x00080000, // SSL_OP_NO_SSLv3
    0x00100000, // SSL_OP_NO_TLSv1
    0x00200000, // SSL_OP_NO_TLSv1_1
    0x00400000, // SSL_OP_NO_TLSv1_2
    0x00800000, // SSL_OP_NO_TLSv1_3
    0x01000000, // SSL_OP_NO_RENEGOTIATION
    0x02000000, // SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION
    0x04000000, // SSL_OP_NO_COMPRESSION
    0x08000000, // SSL_OP_NO_TICKET
    0x10000000, // SSL_OP_ALLOW_NO_DHE_KEX
    0x20000000, // SSL_OP_PREFER_NO_SESSION_CACHE
    0x40000000, // SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION
    0x80000000  // SSL_OP_NO_RENEGOTIATION
  ],
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  sessionTimeout: 300, // 5 minutes
  sessionIdContext: 'cpr-training-system',
  rejectUnauthorized: true,
  requestCert: true,
  agent: false
};

// Development SSL configuration (self-signed)
export const DEVELOPMENT_SSL_CONFIG: SSLConfig = {
  enabled: false, // Disabled in development
  keyPath: '',
  certPath: '',
  secureProtocol: 'TLSv1_2_method',
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256'
  ].join(':'),
  honorCipherOrder: true,
  secureOptions: [
    0x00000004, // SSL_OP_NO_SSLv2
    0x00000008, // SSL_OP_NO_SSLv3
    0x00000010, // SSL_OP_NO_TLSv1
    0x00000020, // SSL_OP_NO_TLSv1_1
  ],
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  sessionTimeout: 300,
  sessionIdContext: 'cpr-training-dev',
  rejectUnauthorized: false, // Allow self-signed in development
  requestCert: false,
  agent: false
};

// Get SSL configuration based on environment
export function getSSLConfig(): SSLConfig {
  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_SSL_CONFIG;
  }
  return DEVELOPMENT_SSL_CONFIG;
}

// Validate SSL certificate files
export function validateSSLCertificates(config: SSLConfig): boolean {
  if (!config.enabled) {
    return true;
  }

  try {
    // Check if key file exists
    if (!fs.existsSync(config.keyPath)) {
      console.error(`❌ SSL key file not found: ${config.keyPath}`);
      return false;
    }

    // Check if cert file exists
    if (!fs.existsSync(config.certPath)) {
      console.error(`❌ SSL certificate file not found: ${config.certPath}`);
      return false;
    }

    // Check if CA file exists (if specified)
    if (config.caPath && !fs.existsSync(config.caPath)) {
      console.error(`❌ SSL CA file not found: ${config.caPath}`);
      return false;
    }

    // Check file permissions
    const keyStats = fs.statSync(config.keyPath);
    const certStats = fs.statSync(config.certPath);

    // Key file should be readable only by owner
    if (keyStats.mode & 0o077) {
      console.warn(`⚠️ SSL key file has overly permissive permissions: ${config.keyPath}`);
    }

    console.log('✅ SSL certificate files validated');
    return true;
  } catch (error) {
    console.error('❌ SSL certificate validation failed:', error);
    return false;
  }
}

// Generate SSL options for Node.js
export function generateSSLOptions(config: SSLConfig): any {
  if (!config.enabled) {
    return null;
  }

  const sslOptions: any = {
    key: fs.readFileSync(config.keyPath),
    cert: fs.readFileSync(config.certPath),
    secureProtocol: config.secureProtocol,
    ciphers: config.ciphers,
    honorCipherOrder: config.honorCipherOrder,
    secureOptions: config.secureOptions.reduce((a, b) => a | b, 0),
    minVersion: config.minVersion,
    maxVersion: config.maxVersion,
    sessionTimeout: config.sessionTimeout,
    sessionIdContext: config.sessionIdContext,
    rejectUnauthorized: config.rejectUnauthorized,
    requestCert: config.requestCert,
    agent: config.agent
  };

  // Add CA certificate if provided
  if (config.caPath && fs.existsSync(config.caPath)) {
    sslOptions.ca = fs.readFileSync(config.caPath);
  }

  // Add passphrase if provided
  if (config.passphrase) {
    sslOptions.passphrase = config.passphrase;
  }

  return sslOptions;
}

// SSL/TLS security headers
export function getSSLSecurityHeaders(): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' https:; object-src 'none'; media-src 'self'; frame-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
  };
}

// Initialize SSL/TLS configuration
export async function initializeSSL(): Promise<boolean> {
  try {
    const config = getSSLConfig();
    
    if (!config.enabled) {
      console.log('🔒 SSL/TLS is disabled in development mode');
      return true;
    }

    console.log('🔒 Initializing SSL/TLS configuration...');
    
    // Validate certificates
    if (!validateSSLCertificates(config)) {
      console.error('❌ SSL certificate validation failed');
      return false;
    }

    // Log SSL configuration
    console.log('🔒 SSL/TLS Configuration:');
    console.log(`   Protocol: ${config.secureProtocol}`);
    console.log(`   Min Version: ${config.minVersion}`);
    console.log(`   Max Version: ${config.maxVersion}`);
    console.log(`   Ciphers: ${config.ciphers.split(':').length} ciphers configured`);
    console.log(`   Key File: ${config.keyPath}`);
    console.log(`   Cert File: ${config.certPath}`);
    if (config.caPath) {
      console.log(`   CA File: ${config.caPath}`);
    }

    // Log security event
    logSecurityEvent(
      'SSL_TLS_INITIALIZED',
      AuditEventSeverity.MEDIUM,
      {} as any,
      {
        protocol: config.secureProtocol,
        minVersion: config.minVersion,
        maxVersion: config.maxVersion,
        ciphersCount: config.ciphers.split(':').length
      }
    );

    console.log('✅ SSL/TLS configuration initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize SSL/TLS:', error);
    return false;
  }
}

// SSL/TLS health check
export function checkSSLHealth(): {
  enabled: boolean;
  valid: boolean;
  config: Partial<SSLConfig>;
} {
  const config = getSSLConfig();
  
  return {
    enabled: config.enabled,
    valid: config.enabled ? validateSSLCertificates(config) : true,
    config: {
      secureProtocol: config.secureProtocol,
      minVersion: config.minVersion,
      maxVersion: config.maxVersion,
      ciphers: config.ciphers.split(':').length
    }
  };
}

// Export default configuration
export default getSSLConfig;
