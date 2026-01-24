import { pool } from '../config/database.js';
import { encryptionService, EncryptionResult, DecryptionResult } from '../config/encryptionConfig.js';
import { logSecurityEvent, AuditEventSeverity } from '../middleware/auditLogger.js';
import { Request } from 'express';

// Database Encryption Service
export class DatabaseEncryptionService {
  
  // Encrypt data before storing in database
  async encryptDataForStorage(data: unknown, tableName: string, fieldName: string): Promise<string> {
    try {
      if (!data || typeof data !== 'string') {
        return data as string;
      }

      // Check if field should be encrypted
      if (!encryptionService.shouldEncryptField(tableName, fieldName)) {
        return data;
      }

      // Encrypt the data
      const encryptionResult = encryptionService.encrypt(data);
      
      // Log encryption operation
      logSecurityEvent(
        'DATA_ENCRYPTED_FOR_STORAGE',
        AuditEventSeverity.LOW,
        {} as Request,
        {
          tableName,
          fieldName,
          keyId: encryptionResult.keyId,
          algorithm: encryptionResult.algorithm
        }
      );

      return JSON.stringify(encryptionResult);
    } catch (error) {
      console.error(`Failed to encrypt data for ${tableName}.${fieldName}:`, error);
      throw new Error(`Encryption failed for ${tableName}.${fieldName}`);
    }
  }

  // Decrypt data after retrieving from database
  async decryptDataFromStorage(encryptedData: string, tableName: string, fieldName: string): Promise<string> {
    try {
      if (!encryptedData || typeof encryptedData !== 'string') {
        return encryptedData;
      }

      // Check if this looks like encrypted data
      try {
        const parsed = JSON.parse(encryptedData);
        if (!parsed.encryptedData || !parsed.keyId) {
          return encryptedData; // Not encrypted data
        }

        // Decrypt the data
        const decryptionResult = encryptionService.decrypt(
          parsed.encryptedData,
          parsed.keyId,
          parsed.iv,
          parsed.tag
        );

        // Log decryption operation
        logSecurityEvent(
          'DATA_DECRYPTED_FROM_STORAGE',
          AuditEventSeverity.LOW,
          {} as Request,
          {
            tableName,
            fieldName,
            keyId: parsed.keyId,
            algorithm: parsed.algorithm
          }
        );

        return decryptionResult.decryptedData;
      } catch (parseError) {
        // Not JSON, return as is
        return encryptedData;
      }
    } catch (error) {
      console.error(`Failed to decrypt data for ${tableName}.${fieldName}:`, error);
      return encryptedData; // Return original data if decryption fails
    }
  }

  // Encrypt entire record
  async encryptRecord(record: Record<string, unknown>, tableName: string): Promise<Record<string, unknown>> {
    const encryptedRecord: Record<string, unknown> = { ...record };

    for (const [fieldName, value] of Object.entries(record)) {
      if (value && typeof value === 'string' && encryptionService.shouldEncryptField(tableName, fieldName)) {
        encryptedRecord[fieldName] = await this.encryptDataForStorage(value, tableName, fieldName);
      }
    }

    return encryptedRecord;
  }

  // Decrypt entire record
  async decryptRecord(record: Record<string, unknown>, tableName: string): Promise<Record<string, unknown>> {
    const decryptedRecord: Record<string, unknown> = { ...record };

    for (const [fieldName, value] of Object.entries(record)) {
      if (value && typeof value === 'string') {
        decryptedRecord[fieldName] = await this.decryptDataFromStorage(value, tableName, fieldName);
      }
    }

    return decryptedRecord;
  }

  // Encrypt array of records
  async encryptRecords(records: Record<string, unknown>[], tableName: string): Promise<Record<string, unknown>[]> {
    return Promise.all(records.map(record => this.encryptRecord(record, tableName)));
  }

  // Decrypt array of records
  async decryptRecords(records: Record<string, unknown>[], tableName: string): Promise<Record<string, unknown>[]> {
    return Promise.all(records.map(record => this.decryptRecord(record, tableName)));
  }

  // Get encrypted field statistics
  async getEncryptionStats(): Promise<{
    totalEncryptedFields: number;
    totalDecryptedFields: number;
    encryptionRate: number;
    keyUsage: { [keyId: string]: number };
  }> {
    try {
      // Get encryption statistics from the encryption service
      const stats = encryptionService.getEncryptionStats();
      
      // Get key usage statistics
      const keyUsage: { [keyId: string]: number } = {};
      // This would require additional implementation to track key usage per field
      
      return {
        totalEncryptedFields: stats.totalEncryptions,
        totalDecryptedFields: stats.totalDecryptions,
        encryptionRate: stats.totalEncryptions > 0 ? (stats.totalDecryptions / stats.totalEncryptions) * 100 : 0,
        keyUsage
      };
    } catch (error) {
      console.error('Failed to get encryption stats:', error);
      return {
        totalEncryptedFields: 0,
        totalDecryptedFields: 0,
        encryptionRate: 0,
        keyUsage: {}
      };
    }
  }

  // Rotate encryption keys
  async rotateEncryptionKeys(): Promise<{
    success: boolean;
    newKeyId: string;
    message: string;
  }> {
    try {
      const newKey = encryptionService.rotateKeys();
      
      // Log key rotation
      logSecurityEvent(
        'ENCRYPTION_KEYS_ROTATED',
        AuditEventSeverity.MEDIUM,
        {} as Request,
        {
          newKeyId: newKey.id,
          algorithm: newKey.algorithm,
          keyLength: newKey.key.length
        }
      );

      return {
        success: true,
        newKeyId: newKey.id,
        message: 'Encryption keys rotated successfully'
      };
    } catch (error) {
      console.error('Failed to rotate encryption keys:', error);
      return {
        success: false,
        newKeyId: '',
        message: 'Failed to rotate encryption keys'
      };
    }
  }

  // Validate encryption configuration
  async validateEncryptionConfig(): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if encryption service is available
      const activeKey = encryptionService.getActiveKey();
      if (!activeKey) {
        issues.push('No active encryption key found');
      }

      // Check key rotation configuration
      const stats = encryptionService.getEncryptionStats();
      if (stats.totalKeys === 0) {
        issues.push('No encryption keys configured');
      }

      // Check for deprecated keys
      if (stats.archivedKeys > 0) {
        warnings.push(`${stats.archivedKeys} archived keys found`);
      }

      // Validate encryption algorithms
      const supportedAlgorithms = ['aes-256-gcm', 'aes-256-cbc', 'aes-192-gcm', 'aes-128-gcm'];
      if (activeKey && !supportedAlgorithms.includes(activeKey.algorithm)) {
        issues.push(`Unsupported encryption algorithm: ${activeKey.algorithm}`);
      }

      return {
        valid: issues.length === 0,
        issues,
        warnings
      };
    } catch (error) {
      console.error('Failed to validate encryption config:', error);
      return {
        valid: false,
        issues: ['Failed to validate encryption configuration'],
        warnings: []
      };
    }
  }

  // Test encryption/decryption
  async testEncryption(): Promise<{
    success: boolean;
    testData: string;
    encryptedData: string;
    decryptedData: string;
    message: string;
  }> {
    try {
      const testData = 'Test encryption data - ' + new Date().toISOString();
      
      // Encrypt test data
      const encryptionResult = encryptionService.encrypt(testData);
      const encryptedData = JSON.stringify(encryptionResult);
      
      // Decrypt test data
      const parsed = JSON.parse(encryptedData);
      const decryptionResult = encryptionService.decrypt(
        parsed.encryptedData,
        parsed.keyId,
        parsed.iv,
        parsed.tag
      );

      const success = testData === decryptionResult.decryptedData;

      return {
        success,
        testData,
        encryptedData,
        decryptedData: decryptionResult.decryptedData,
        message: success ? 'Encryption test passed' : 'Encryption test failed'
      };
    } catch (error) {
      console.error('Encryption test failed:', error);
      return {
        success: false,
        testData: '',
        encryptedData: '',
        decryptedData: '',
        message: 'Encryption test failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }
}

// Export singleton instance
export const databaseEncryptionService = new DatabaseEncryptionService();
