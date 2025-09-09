#!/usr/bin/env node

/**
 * Configuration Manager for CPR Training System
 * Handles environment configuration generation, validation, and management
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ConfigManager {
    constructor() {
        this.templatesDir = path.join(__dirname, '..', 'config-templates');
        this.configsDir = path.join(__dirname, '..', 'configs');
        this.validEnvironments = ['development', 'staging', 'production'];
    }

    /**
     * Generate a secure random string
     */
    generateSecureSecret(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Generate environment configuration from template
     */
    generateConfig(environment) {
        if (!this.validEnvironments.includes(environment)) {
            throw new Error(`Invalid environment: ${environment}. Valid environments: ${this.validEnvironments.join(', ')}`);
        }

        const templateFile = path.join(this.templatesDir, `${environment}.env.template`);
        const outputFile = path.join(this.configsDir, `${environment}.env`);

        if (!fs.existsSync(templateFile)) {
            throw new Error(`Template file not found: ${templateFile}`);
        }

        // Create configs directory if it doesn't exist
        if (!fs.existsSync(this.configsDir)) {
            fs.mkdirSync(this.configsDir, { recursive: true });
        }

        let template = fs.readFileSync(templateFile, 'utf8');

        // Replace placeholder values with generated secrets
        const replacements = {
            'your_32_character_encryption_key': this.generateSecureSecret(16),
            'your_super_secure_jwt_secret_key_for_production': this.generateSecureSecret(32),
            'your_staging_jwt_secret_key': this.generateSecureSecret(32),
            'your_session_secret_key': this.generateSecureSecret(32),
            'your_staging_session_secret': this.generateSecureSecret(32),
            'your_secure_production_password': this.generateSecureSecret(16),
            'your_staging_password': this.generateSecureSecret(16),
            'your_secure_redis_password': this.generateSecureSecret(16),
            'your_staging_redis_password': this.generateSecureSecret(16),
            'your_email_password': this.generateSecureSecret(16),
            'your_staging_email_password': this.generateSecureSecret(16),
            'your_s3_access_key': this.generateSecureSecret(20),
            'your_s3_secret_key': this.generateSecureSecret(40),
            'your_staging_s3_access_key': this.generateSecureSecret(20),
            'your_staging_s3_secret_key': this.generateSecureSecret(40)
        };

        // Apply replacements
        Object.entries(replacements).forEach(([placeholder, value]) => {
            template = template.replace(new RegExp(placeholder, 'g'), value);
        });

        // Write the generated configuration
        fs.writeFileSync(outputFile, template);
        console.log(`✅ Generated ${environment} configuration: ${outputFile}`);
        
        return outputFile;
    }

    /**
     * Validate environment configuration
     */
    validateConfig(environment) {
        const configFile = path.join(this.configsDir, `${environment}.env`);
        
        if (!fs.existsSync(configFile)) {
            throw new Error(`Configuration file not found: ${configFile}`);
        }

        const config = fs.readFileSync(configFile, 'utf8');
        const lines = config.split('\n');
        const errors = [];
        const warnings = [];

        // Validation rules
        const validationRules = {
            'DB_PASSWORD': { minLength: 8, required: true },
            'JWT_SECRET': { minLength: 32, required: true },
            'SESSION_SECRET': { minLength: 32, required: true },
            'DB_ENCRYPTION_KEY': { minLength: 32, required: true },
            'REDIS_PASSWORD': { minLength: 8, required: true },
            'EMAIL_PASSWORD': { minLength: 8, required: false },
            'BACKUP_S3_SECRET_KEY': { minLength: 20, required: false }
        };

        // Parse configuration
        const configValues = {};
        lines.forEach(line => {
            if (line.trim() && !line.startsWith('#')) {
                const [key, value] = line.split('=');
                if (key && value) {
                    configValues[key.trim()] = value.trim();
                }
            }
        });

        // Validate each rule
        Object.entries(validationRules).forEach(([key, rule]) => {
            const value = configValues[key];
            
            if (rule.required && !value) {
                errors.push(`${key} is required but not set`);
            } else if (value && value.length < rule.minLength) {
                errors.push(`${key} must be at least ${rule.minLength} characters long`);
            } else if (value && value.includes('your_') && value.includes('_here')) {
                warnings.push(`${key} appears to be a placeholder value`);
            }
        });

        // Check for common security issues
        if (configValues.NODE_ENV === 'production') {
            if (configValues.LOG_LEVEL === 'debug') {
                warnings.push('LOG_LEVEL should not be debug in production');
            }
            if (configValues.CORS_ORIGIN === '*') {
                errors.push('CORS_ORIGIN should not be * in production');
            }
        }

        // Output results
        if (errors.length > 0) {
            console.log(`❌ Validation failed for ${environment}:`);
            errors.forEach(error => console.log(`  - ${error}`));
            return false;
        }

        if (warnings.length > 0) {
            console.log(`⚠️  Warnings for ${environment}:`);
            warnings.forEach(warning => console.log(`  - ${warning}`));
        }

        console.log(`✅ Configuration validation passed for ${environment}`);
        return true;
    }

    /**
     * List all available configurations
     */
    listConfigs() {
        console.log('📋 Available configurations:');
        
        this.validEnvironments.forEach(env => {
            const configFile = path.join(this.configsDir, `${env}.env`);
            const templateFile = path.join(this.templatesDir, `${env}.env.template`);
            
            const configExists = fs.existsSync(configFile);
            const templateExists = fs.existsSync(templateFile);
            
            console.log(`  ${env}:`);
            console.log(`    Template: ${templateExists ? '✅' : '❌'} ${templateFile}`);
            console.log(`    Config:   ${configExists ? '✅' : '❌'} ${configFile}`);
        });
    }

    /**
     * Generate secrets for all environments
     */
    generateSecrets() {
        console.log('🔐 Generating secure secrets...');
        
        const secrets = {
            'DB_ENCRYPTION_KEY': this.generateSecureSecret(16),
            'JWT_SECRET': this.generateSecureSecret(32),
            'SESSION_SECRET': this.generateSecureSecret(32),
            'DB_PASSWORD': this.generateSecureSecret(16),
            'REDIS_PASSWORD': this.generateSecureSecret(16),
            'EMAIL_PASSWORD': this.generateSecureSecret(16),
            'BACKUP_S3_ACCESS_KEY': this.generateSecureSecret(20),
            'BACKUP_S3_SECRET_KEY': this.generateSecureSecret(40)
        };

        console.log('Generated secrets:');
        Object.entries(secrets).forEach(([key, value]) => {
            console.log(`${key}=${value}`);
        });

        return secrets;
    }
}

// CLI interface
if (require.main === module) {
    const configManager = new ConfigManager();
    const command = process.argv[2];
    const environment = process.argv[3];

    try {
        switch (command) {
            case 'generate':
                if (!environment) {
                    console.log('Usage: node config-manager.js generate <environment>');
                    console.log(`Valid environments: ${configManager.validEnvironments.join(', ')}`);
                    process.exit(1);
                }
                configManager.generateConfig(environment);
                break;

            case 'validate':
                if (!environment) {
                    console.log('Usage: node config-manager.js validate <environment>');
                    console.log(`Valid environments: ${configManager.validEnvironments.join(', ')}`);
                    process.exit(1);
                }
                configManager.validateConfig(environment);
                break;

            case 'list':
                configManager.listConfigs();
                break;

            case 'secrets':
                configManager.generateSecrets();
                break;

            default:
                console.log('CPR Training System Configuration Manager');
                console.log('');
                console.log('Usage:');
                console.log('  node config-manager.js generate <environment>  - Generate config from template');
                console.log('  node config-manager.js validate <environment>  - Validate configuration');
                console.log('  node config-manager.js list                    - List available configurations');
                console.log('  node config-manager.js secrets                 - Generate secure secrets');
                console.log('');
                console.log(`Valid environments: ${configManager.validEnvironments.join(', ')}`);
                break;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

module.exports = ConfigManager;