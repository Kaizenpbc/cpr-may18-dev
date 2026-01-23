import crypto from 'crypto';
import { logSecurityEvent, AuditEventSeverity } from '../middleware/auditLogger.js';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Get encryption key from environment or generate one
const getEncryptionKey = (): Buffer => {
  const keyString = process.env.DB_ENCRYPTION_KEY;
  
  if (!keyString) {
    console.warn('⚠️ DB_ENCRYPTION_KEY not set, using default key (NOT SECURE FOR PRODUCTION)');
    // In production, you should always set a proper encryption key
    return crypto.scryptSync('default-key-not-secure', 'salt', KEY_LENGTH);
  }
  
  // Convert hex string to buffer
  if (keyString.length === KEY_LENGTH * 2) {
    return Buffer.from(keyString, 'hex');
  }
  
  // Derive key from string
  return crypto.scryptSync(keyString, 'db-encryption-salt', KEY_LENGTH);
};

const ENCRYPTION_KEY = getEncryptionKey();

// Database field encryption utility
export class DatabaseEncryption {
  private static instance: DatabaseEncryption;
  private encryptionCount = 0;
  private decryptionCount = 0;

  private constructor() {}

  public static getInstance(): DatabaseEncryption {
    if (!DatabaseEncryption.instance) {
      DatabaseEncryption.instance = new DatabaseEncryption();
    }
    return DatabaseEncryption.instance;
  }

  // Encrypt sensitive data
  public encrypt(plaintext: string, userId?: string): string {
    try {
      this.encryptionCount++;

      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher with IV (using createCipheriv instead of deprecated createCipher)
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
      cipher.setAAD(Buffer.from('database-encryption', 'utf8'));

      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      const result = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
      
      // Log encryption (without sensitive data)
      if (this.encryptionCount % 100 === 0) { // Log every 100th encryption
        logSecurityEvent(
          'DATABASE_ENCRYPTION_PERFORMED',
          AuditEventSeverity.LOW,
          { userId } as any,
          {
            encryptionCount: this.encryptionCount,
            dataLength: plaintext.length
          }
        );
      }
      
      return result;
      
    } catch (error) {
      console.error('Encryption failed:', error);
      logSecurityEvent(
        'DATABASE_ENCRYPTION_FAILED',
        AuditEventSeverity.HIGH,
        { userId } as any,
        {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw new Error('Encryption failed');
    }
  }

  // Decrypt sensitive data
  public decrypt(encryptedData: string, userId?: string): string {
    try {
      this.decryptionCount++;
      
      // Split the encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      // Create decipher with IV (using createDecipheriv instead of deprecated createDecipher)
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
      decipher.setAAD(Buffer.from('database-encryption', 'utf8'));
      decipher.setAuthTag(tag);
      
      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Log decryption (without sensitive data)
      if (this.decryptionCount % 100 === 0) { // Log every 100th decryption
        logSecurityEvent(
          'DATABASE_DECRYPTION_PERFORMED',
          AuditEventSeverity.LOW,
          { userId } as any,
          {
            decryptionCount: this.decryptionCount,
            dataLength: decrypted.length
          }
        );
      }
      
      return decrypted;
      
    } catch (error) {
      console.error('Decryption failed:', error);
      logSecurityEvent(
        'DATABASE_DECRYPTION_FAILED',
        AuditEventSeverity.HIGH,
        { userId } as any,
        {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw new Error('Decryption failed');
    }
  }

  // Check if data is encrypted
  public isEncrypted(data: string): boolean {
    return data.includes(':') && data.split(':').length === 3;
  }

  // Get encryption statistics
  public getStats() {
    return {
      encryptionCount: this.encryptionCount,
      decryptionCount: this.decryptionCount,
      algorithm: ENCRYPTION_ALGORITHM,
      keyLength: KEY_LENGTH * 8 // Convert to bits
    };
  }
}

// Sensitive field decorator for automatic encryption/decryption
export function EncryptedField(target: any, propertyKey: string) {
  const encryption = DatabaseEncryption.getInstance();
  
  let value: string;
  
  Object.defineProperty(target, propertyKey, {
    get: function() {
      if (encryption.isEncrypted(value)) {
        return encryption.decrypt(value);
      }
      return value;
    },
    set: function(newValue: string) {
      if (newValue && !encryption.isEncrypted(newValue)) {
        value = encryption.encrypt(newValue);
      } else {
        value = newValue;
      }
    },
    enumerable: true,
    configurable: true
  });
}

// Utility functions for common encryption operations
export const encryptSensitiveData = (data: string, userId?: string): string => {
  return DatabaseEncryption.getInstance().encrypt(data, userId);
};

export const decryptSensitiveData = (encryptedData: string, userId?: string): string => {
  return DatabaseEncryption.getInstance().decrypt(encryptedData, userId);
};

export const isDataEncrypted = (data: string): boolean => {
  return DatabaseEncryption.getInstance().isEncrypted(data);
};

// Database backup encryption
export class BackupEncryption {
  public static async encryptBackup(backupData: Buffer): Promise<Buffer> {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      // Use createCipheriv instead of deprecated createCipher
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);

      const encrypted = Buffer.concat([
        cipher.update(backupData),
        cipher.final()
      ]);

      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      return Buffer.concat([iv, tag, encrypted]);
      
    } catch (error) {
      console.error('Backup encryption failed:', error);
      throw new Error('Backup encryption failed');
    }
  }

  public static async decryptBackup(encryptedBackup: Buffer): Promise<Buffer> {
    try {
      const iv = encryptedBackup.subarray(0, IV_LENGTH);
      const tag = encryptedBackup.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = encryptedBackup.subarray(IV_LENGTH + TAG_LENGTH);

      // Use createDecipheriv instead of deprecated createDecipher
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decrypted;
      
    } catch (error) {
      console.error('Backup decryption failed:', error);
      throw new Error('Backup decryption failed');
    }
  }
}

// Initialize encryption system
export const initializeDatabaseEncryption = (): void => {
  console.log('🔐 Initializing database encryption...');
  
  const encryption = DatabaseEncryption.getInstance();
  
  // Log encryption system initialization (without request context)
  console.log('🔐 Database encryption configuration:', {
    algorithm: ENCRYPTION_ALGORITHM,
    keyLength: KEY_LENGTH * 8,
    timestamp: new Date().toISOString()
  });
  
  console.log('✅ Database encryption initialized');
  console.log(`📊 Encryption stats:`, encryption.getStats());
};
