import { Request, Response, NextFunction } from 'express';
import { encryptionService, EncryptionResult, DecryptionResult } from '../config/encryptionConfig.js';
import { logSecurityEvent, AuditEventSeverity } from './auditLogger.js';

// Database Encryption Middleware
export const databaseEncryption = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Override res.json to decrypt response data
    res.json = function(data: any) {
      if (data && typeof data === 'object') {
        data = decryptResponseData(data);
      }
      return originalJson.call(this, data);
    };

    // Override res.send to decrypt response data
    res.send = function(data: any) {
      if (data && typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          if (parsed && typeof parsed === 'object') {
            data = JSON.stringify(decryptResponseData(parsed));
          }
        } catch (e) {
          // Not JSON, leave as is
        }
      }
      return originalSend.call(this, data);
    };

    // Process request body for encryption
    if (req.body && typeof req.body === 'object') {
      req.body = encryptRequestData(req.body, req);
    }

    next();
  } catch (error) {
    console.error('Database encryption middleware error:', error);
    next(error);
  }
};

// Encrypt request data before database operations
function encryptRequestData(data: any, req: Request): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const encryptedData = { ...data };

  // Get table name from request path or body
  const tableName = getTableNameFromRequest(req);
  if (!tableName) {
    return data;
  }

  // Encrypt sensitive fields
  for (const [fieldName, value] of Object.entries(data)) {
    if (value && typeof value === 'string' && encryptionService.shouldEncryptField(tableName, fieldName)) {
      try {
        const encryptionResult = encryptionService.encrypt(value);
        encryptedData[fieldName] = JSON.stringify(encryptionResult);
        
        // Log encryption operation
        logSecurityEvent(
          'FIELD_ENCRYPTED',
          AuditEventSeverity.LOW,
          req,
          {
            tableName,
            fieldName,
            keyId: encryptionResult.keyId,
            algorithm: encryptionResult.algorithm
          }
        );
      } catch (error) {
        console.error(`Failed to encrypt field ${fieldName}:`, error);
        // Keep original value if encryption fails
      }
    }
  }

  return encryptedData;
}

// Decrypt response data after database operations
function decryptResponseData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const decryptedData = { ...data };

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => decryptResponseData(item));
  }

  // Decrypt encrypted fields
  for (const [fieldName, value] of Object.entries(data)) {
    if (value && typeof value === 'string') {
      try {
        // Check if this looks like encrypted data
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && parsed.encryptedData && parsed.keyId) {
          const decryptionResult = encryptionService.decrypt(
            parsed.encryptedData,
            parsed.keyId,
            parsed.iv,
            parsed.tag
          );
          decryptedData[fieldName] = decryptionResult.decryptedData;
        }
      } catch (e) {
        // Not encrypted data, leave as is
      }
    } else if (value && typeof value === 'object') {
      // Recursively decrypt nested objects
      decryptedData[fieldName] = decryptResponseData(value);
    }
  }

  return decryptedData;
}

// Get table name from request
function getTableNameFromRequest(req: Request): string | null {
  const path = req.path;
  const method = req.method;

  // Extract table name from API path
  const pathParts = path.split('/');
  
  // Common API patterns
  if (pathParts.includes('users')) return 'users';
  if (pathParts.includes('instructors')) return 'instructors';
  if (pathParts.includes('students')) return 'students';
  if (pathParts.includes('organizations')) return 'organizations';
  if (pathParts.includes('payments')) return 'payments';
  if (pathParts.includes('courses')) return 'courses';
  if (pathParts.includes('certifications')) return 'certifications';

  // Check request body for table hints
  if (req.body && req.body._table) {
    return req.body._table;
  }

  return null;
}

// Field-level encryption decorator
export function encryptField(tableName: string, fieldName: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      if (result && typeof result === 'object') {
        // Encrypt the specific field
        if (result[fieldName] && typeof result[fieldName] === 'string') {
          try {
            const encryptionResult = encryptionService.encrypt(result[fieldName]);
            result[fieldName] = JSON.stringify(encryptionResult);
          } catch (error) {
            console.error(`Failed to encrypt field ${fieldName}:`, error);
          }
        }
      }
      
      return result;
    };

    return descriptor;
  };
}

// Field-level decryption decorator
export function decryptField(tableName: string, fieldName: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      if (result && typeof result === 'object') {
        // Decrypt the specific field
        if (result[fieldName] && typeof result[fieldName] === 'string') {
          try {
            const parsed = JSON.parse(result[fieldName]);
            if (parsed && typeof parsed === 'object' && parsed.encryptedData && parsed.keyId) {
              const decryptionResult = encryptionService.decrypt(
                parsed.encryptedData,
                parsed.keyId,
                parsed.iv,
                parsed.tag
              );
              result[fieldName] = decryptionResult.decryptedData;
            }
          } catch (error) {
            // Not encrypted data, leave as is
          }
        }
      }
      
      return result;
    };

    return descriptor;
  };
}

// Encryption validation middleware
export const validateEncryption = (req: Request, res: Response, next: NextFunction) => {
  try {
    const tableName = getTableNameFromRequest(req);
    
    if (tableName && req.body) {
      // Check if required fields are encrypted
      for (const [fieldName, value] of Object.entries(req.body)) {
        if (value && typeof value === 'string' && encryptionService.shouldEncryptField(tableName, fieldName)) {
          // Check if field is properly encrypted
          try {
            const parsed = JSON.parse(value);
            if (!parsed.encryptedData || !parsed.keyId) {
              return res.status(400).json({
                success: false,
                error: {
                  code: 'ENCRYPTION_REQUIRED',
                  message: `Field ${fieldName} must be encrypted`,
                  field: fieldName,
                  table: tableName
                }
              });
            }
          } catch (e) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_ENCRYPTION_FORMAT',
                message: `Field ${fieldName} has invalid encryption format`,
                field: fieldName,
                table: tableName
              }
            });
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error('Encryption validation error:', error);
    next(error);
  }
};

// Encryption audit middleware
export const auditEncryption = (req: Request, res: Response, next: NextFunction) => {
  try {
    const tableName = getTableNameFromRequest(req);
    
    if (tableName && req.body) {
      // Count encrypted fields
      let encryptedFields = 0;
      let totalFields = 0;
      
      for (const [fieldName, value] of Object.entries(req.body)) {
        if (value && typeof value === 'string') {
          totalFields++;
          if (encryptionService.shouldEncryptField(tableName, fieldName)) {
            try {
              const parsed = JSON.parse(value);
              if (parsed.encryptedData && parsed.keyId) {
                encryptedFields++;
              }
            } catch (e) {
              // Not encrypted
            }
          }
        }
      }

      // Log encryption audit
      if (totalFields > 0) {
        logSecurityEvent(
          'ENCRYPTION_AUDIT',
          AuditEventSeverity.LOW,
          req,
          {
            tableName,
            encryptedFields,
            totalFields,
            encryptionRate: (encryptedFields / totalFields) * 100
          }
        );
      }
    }

    next();
  } catch (error) {
    console.error('Encryption audit error:', error);
    next(); // Continue with normal flow
  }
};

// Export all middleware
export default {
  databaseEncryption,
  encryptField,
  decryptField,
  validateEncryption,
  auditEncryption
};
