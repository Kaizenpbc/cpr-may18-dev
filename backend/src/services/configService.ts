import { pool } from '../config/database.js';

interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  description: string;
  category: string;
  updated_by?: number;
  updated_at: Date;
  created_at: Date;
}

interface ConfigUpdate {
  config_value: string;
  updated_by: number;
}

class ConfigService {
  private static instance: ConfigService;
  private cache: Map<string, string> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate: number = 0;

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Get all configurations grouped by category
   */
  async getAllConfigurations(): Promise<Record<string, SystemConfig[]>> {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          config_key,
          config_value,
          description,
          category,
          updated_by,
          updated_at,
          created_at
        FROM system_configurations 
        ORDER BY category, config_key
      `);

      // Group by category
      const grouped: Record<string, SystemConfig[]> = {};
      result.rows.forEach((row: SystemConfig) => {
        if (!grouped[row.category]) {
          grouped[row.category] = [];
        }
        grouped[row.category].push(row);
      });

      return grouped;
    } catch (error) {
      console.error('Error getting all configurations:', error);
      throw error;
    }
  }

  /**
   * Get configurations by category
   */
  async getConfigurationsByCategory(category: string): Promise<SystemConfig[]> {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          config_key,
          config_value,
          description,
          category,
          updated_by,
          updated_at,
          created_at
        FROM system_configurations 
        WHERE category = $1
        ORDER BY config_key
      `, [category]);

      return result.rows;
    } catch (error) {
      console.error(`Error getting configurations for category ${category}:`, error);
      throw error;
    }
  }

  // Map config keys to environment variable names (for sensitive values)
  private static readonly ENV_VAR_MAPPING: Record<string, string> = {
    'email_smtp_host': 'SMTP_HOST',
    'email_smtp_port': 'SMTP_PORT',
    'email_smtp_user': 'SMTP_USER',
    'email_smtp_pass': 'SMTP_PASS',
    'email_from_address': 'EMAIL_FROM',
    'email_api_key': 'EMAIL_API_KEY',
  };

  /**
   * Get a single configuration value
   * Sensitive values (SMTP credentials) are read from environment variables first
   */
  async getConfigValue(key: string): Promise<string | null> {
    try {
      // For sensitive keys, prefer environment variables (security best practice)
      const envVarName = ConfigService.ENV_VAR_MAPPING[key];
      if (envVarName && process.env[envVarName]) {
        return process.env[envVarName] || null;
      }

      // Check cache first
      if (this.isCacheValid() && this.cache.has(key)) {
        return this.cache.get(key) || null;
      }

      const result = await pool.query(`
        SELECT config_value
        FROM system_configurations
        WHERE config_key = $1
      `, [key]);

      if (result.rows.length > 0) {
        const value = result.rows[0].config_value;
        // Don't cache values that should come from env vars
        if (!envVarName) {
          this.cache.set(key, value);
        }
        return value;
      }

      return null;
    } catch (error) {
      console.error(`Error getting config value for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Update a configuration value
   */
  async updateConfig(key: string, update: ConfigUpdate): Promise<SystemConfig> {
    try {
      const result = await pool.query(`
        UPDATE system_configurations 
        SET 
          config_value = $1,
          updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE config_key = $3
        RETURNING *
      `, [update.config_value, update.updated_by, key]);

      if (result.rows.length === 0) {
        throw new Error(`Configuration key '${key}' not found`);
      }

      // Clear cache for this key
      this.cache.delete(key);
      this.invalidateCache();

      console.log(`✅ [CONFIG] Updated ${key} = ${update.config_value}`);

      return result.rows[0];
    } catch (error) {
      console.error(`Error updating config ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get configuration categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const result = await pool.query(`
        SELECT DISTINCT category 
        FROM system_configurations 
        ORDER BY category
      `);

      return result.rows.map(row => row.category);
    } catch (error) {
      console.error('Error getting configuration categories:', error);
      throw error;
    }
  }

  /**
   * Validate SMTP configuration
   */
  async validateSMTPConfig(): Promise<{ valid: boolean; error?: string }> {
    try {
      const smtpHost = await this.getConfigValue('email_smtp_host');
      const smtpPort = await this.getConfigValue('email_smtp_port');
      const smtpUser = await this.getConfigValue('email_smtp_user');
      const smtpPass = await this.getConfigValue('email_smtp_pass');

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        return { valid: false, error: 'Missing required SMTP configuration' };
      }

      // Test SMTP connection
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.verify();
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'SMTP validation failed' 
      };
    }
  }

  /**
   * Cache management
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheExpiry;
  }

  private invalidateCache(): void {
    this.cache.clear();
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Get invoice due days (with fallback to hardcoded value)
   */
  async getInvoiceDueDays(): Promise<number> {
    const value = await this.getConfigValue('invoice_due_days');
    return value ? parseInt(value) : 30; // Fallback to hardcoded 30 days
  }

  /**
   * Get late fee percentage (with fallback to hardcoded value)
   */
  async getLateFeePercent(): Promise<number> {
    const value = await this.getConfigValue('invoice_late_fee_percent');
    return value ? parseFloat(value) : 1.5; // Fallback to hardcoded 1.5%
  }
}

export default ConfigService; 