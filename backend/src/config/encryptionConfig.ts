import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logSecurityEvent, AuditEventSeverity } from '../middleware/auditLogger.js';

// Encryption Types
export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'aes-192-gcm' | 'aes-128-gcm';
export type KeyRotationStatus = 'active' | 'rotating' | 'deprecated' | 'archived';

// Encryption Configuration
export interface EncryptionConfig {
  enabled: boolean;
  algorithm: EncryptionAlgorithm;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  keyRotation: {
    enabled: boolean;
    rotationIntervalDays: number;
    gracePeriodDays: number;
    maxActiveKeys: number;
  };
  fields: {
    [tableName: string]: {
      [fieldName: string]: {
        encrypt: boolean;
        algorithm?: EncryptionAlgorithm;
        keyId?: string;
      };
    };
  };
  security: {
    requireEncryptionForSensitiveData: boolean;
    auditEncryptionOperations: boolean;
    encryptLogs: boolean;
    keyDerivationIterations: number;
  };
}

// Default Encryption Configuration
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  enabled: true,
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  tagLength: 16, // 128 bits
  keyRotation: {
    enabled: true,
    rotationIntervalDays: 90,
    gracePeriodDays: 30,
    maxActiveKeys: 3
  },
  fields: {
    users: {
      email: { encrypt: true },
      phone: { encrypt: true },
      ssn: { encrypt: true },
      address: { encrypt: true },
      emergency_contact: { encrypt: true }
    },
    instructors: {
      email: { encrypt: true },
      phone: { encrypt: true },
      address: { encrypt: true },
      certification_number: { encrypt: true },
      emergency_contact: { encrypt: true }
    },
    students: {
      email: { encrypt: true },
      phone: { encrypt: true },
      address: { encrypt: true },
      emergency_contact: { encrypt: true },
      medical_info: { encrypt: true }
    },
    organizations: {
      contact_email: { encrypt: true },
      contact_phone: { encrypt: true },
      billing_address: { encrypt: true }
    },
    payments: {
      card_number: { encrypt: true },
      card_holder_name: { encrypt: true },
      billing_address: { encrypt: true }
    }
  },
  security: {
    requireEncryptionForSensitiveData: true,
    auditEncryptionOperations: true,
    auditLogs: true,
    keyDerivationIterations: 100000
  }
};

// Encryption Key Interface
export interface EncryptionKey {
  id: string;
  key: Buffer;
  algorithm: EncryptionAlgorithm;
  status: KeyRotationStatus;
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  usageCount: number;
  metadata: {
    version: string;
    createdBy: string;
    purpose: string;
  };
}

// Encryption Result Interface
export interface EncryptionResult {
  encryptedData: string;
  keyId: string;
  iv: string;
  tag?: string;
  algorithm: EncryptionAlgorithm;
  timestamp: Date;
}

// Decryption Result Interface
export interface DecryptionResult {
  decryptedData: string;
  keyId: string;
  algorithm: EncryptionAlgorithm;
  timestamp: Date;
}

// Key Management Class
export class EncryptionKeyManager {
  private keys: Map<string, EncryptionKey> = new Map();
  private activeKeyId: string | null = null;
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig = DEFAULT_ENCRYPTION_CONFIG) {
    this.config = config;
  }

  // Generate new encryption key
  generateKey(algorithm: EncryptionAlgorithm = this.config.algorithm): EncryptionKey {
    const keyId = crypto.randomUUID();
    const key = crypto.randomBytes(this.config.keyLength);
    
    const encryptionKey: EncryptionKey = {
      id: keyId,
      key,
      algorithm,
      status: 'active',
      createdAt: new Date(),
      usageCount: 0,
      metadata: {
        version: '1.0',
        createdBy: 'system',
        purpose: 'data-encryption'
      }
    };

    this.keys.set(keyId, encryptionKey);
    
    if (!this.activeKeyId) {
      this.activeKeyId = keyId;
    }

    // Log key generation (using console.log during startup)
    if (this.config.security.auditEncryptionOperations) {
      console.log(`🔐 Encryption key generated: ${keyId} (${algorithm})`);
    }

    return encryptionKey;
  }

  // Get active encryption key
  getActiveKey(): EncryptionKey | null {
    if (!this.activeKeyId) {
      return null;
    }
    return this.keys.get(this.activeKeyId) || null;
  }

  // Get key by ID
  getKey(keyId: string): EncryptionKey | null {
    return this.keys.get(keyId) || null;
  }

  // Rotate encryption key
  rotateKey(): EncryptionKey {
    const newKey = this.generateKey();
    
    // Mark old key as rotating
    if (this.activeKeyId) {
      const oldKey = this.keys.get(this.activeKeyId);
      if (oldKey) {
        oldKey.status = 'rotating';
        oldKey.expiresAt = new Date(Date.now() + this.config.keyRotation.gracePeriodDays * 24 * 60 * 60 * 1000);
      }
    }

    // Set new key as active
    this.activeKeyId = newKey.id;

    // Log key rotation (using console.log during startup)
    if (this.config.security.auditEncryptionOperations) {
      console.log(`🔐 Encryption key rotated: ${this.activeKeyId} -> ${newKey.id} (${newKey.algorithm})`);
    }

    return newKey;
  }

  // Update key usage
  updateKeyUsage(keyId: string): void {
    const key = this.keys.get(keyId);
    if (key) {
      key.usageCount++;
      key.lastUsed = new Date();
    }
  }

  // Get all keys
  getAllKeys(): EncryptionKey[] {
    return Array.from(this.keys.values());
  }

  // Cleanup expired keys
  cleanupExpiredKeys(): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [keyId, key] of this.keys.entries()) {
      if (key.expiresAt && key.expiresAt < now && key.status === 'rotating') {
        key.status = 'archived';
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// Encryption Service Class
export class EncryptionService {
  private keyManager: EncryptionKeyManager;
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig = DEFAULT_ENCRYPTION_CONFIG) {
    this.config = config;
    this.keyManager = new EncryptionKeyManager(config);
    
    // Generate initial key if none exists
    if (!this.keyManager.getActiveKey()) {
      this.keyManager.generateKey();
    }
  }

  // Encrypt data
  encrypt(data: string, keyId?: string): EncryptionResult {
    if (!this.config.enabled) {
      throw new Error('Encryption is disabled');
    }

    const key = keyId ? this.keyManager.getKey(keyId) : this.keyManager.getActiveKey();
    if (!key) {
      throw new Error('No encryption key available');
    }

    // Generate random IV
    const iv = crypto.randomBytes(this.config.ivLength);
    
    // Create cipher
    const cipher = crypto.createCipher(key.algorithm, key.key);
    cipher.setAAD(Buffer.from(key.id, 'utf8'));

    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag (for GCM mode)
    let tag: string | undefined;
    if (key.algorithm.includes('gcm')) {
      tag = cipher.getAuthTag().toString('hex');
    }

    // Update key usage
    this.keyManager.updateKeyUsage(key.id);

    const result: EncryptionResult = {
      encryptedData: encrypted,
      keyId: key.id,
      iv: iv.toString('hex'),
      tag,
      algorithm: key.algorithm,
      timestamp: new Date()
    };

    // Log encryption operation (using console.log during startup)
    if (this.config.security.auditEncryptionOperations) {
      console.log(`🔐 Data encrypted: ${data.length} bytes with key ${key.id}`);
    }

    return result;
  }

  // Decrypt data
  decrypt(encryptedData: string, keyId: string, iv: string, tag?: string): DecryptionResult {
    if (!this.config.enabled) {
      throw new Error('Encryption is disabled');
    }

    const key = this.keyManager.getKey(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    // Create decipher
    const decipher = crypto.createDecipher(key.algorithm, key.key);
    decipher.setAAD(Buffer.from(key.id, 'utf8'));

    // Set authentication tag (for GCM mode)
    if (tag && key.algorithm.includes('gcm')) {
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
    }

    // Decrypt data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Update key usage
    this.keyManager.updateKeyUsage(keyId);

    const result: DecryptionResult = {
      decryptedData: decrypted,
      keyId,
      algorithm: key.algorithm,
      timestamp: new Date()
    };

    // Log decryption operation (using console.log during startup)
    if (this.config.security.auditEncryptionOperations) {
      console.log(`🔐 Data decrypted: ${decrypted.length} bytes with key ${keyId}`);
    }

    return result;
  }

  // Check if field should be encrypted
  shouldEncryptField(tableName: string, fieldName: string): boolean {
    return this.config.fields[tableName]?.[fieldName]?.encrypt || false;
  }

  // Get encryption key for field
  getFieldEncryptionKey(tableName: string, fieldName: string): string | null {
    const fieldConfig = this.config.fields[tableName]?.[fieldName];
    if (fieldConfig?.keyId) {
      return fieldConfig.keyId;
    }
    return this.keyManager.getActiveKey()?.id || null;
  }

  // Rotate encryption keys
  rotateKeys(): EncryptionKey {
    return this.keyManager.rotateKey();
  }

  // Get active encryption key
  getActiveKey(): EncryptionKey | null {
    return this.keyManager.getActiveKey();
  }

  // Get encryption statistics
  getEncryptionStats(): {
    totalKeys: number;
    activeKeys: number;
    rotatingKeys: number;
    archivedKeys: number;
    totalEncryptions: number;
    totalDecryptions: number;
  } {
    const keys = this.keyManager.getAllKeys();
    const activeKeys = keys.filter(k => k.status === 'active').length;
    const rotatingKeys = keys.filter(k => k.status === 'rotating').length;
    const archivedKeys = keys.filter(k => k.status === 'archived').length;
    const totalEncryptions = keys.reduce((sum, k) => sum + k.usageCount, 0);

    return {
      totalKeys: keys.length,
      activeKeys,
      rotatingKeys,
      archivedKeys,
      totalEncryptions,
      totalDecryptions: totalEncryptions // Assuming equal encrypt/decrypt operations
    };
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();

// Export default configuration
export default DEFAULT_ENCRYPTION_CONFIG;
