#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates that all production requirements are met
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ProductionValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.checks = [];
    }

    /**
     * Add a check result
     */
    addCheck(name, passed, message, isWarning = false) {
        this.checks.push({ name, passed, message, isWarning });
        if (passed) {
            console.log(`✅ ${name}: ${message}`);
        } else if (isWarning) {
            console.log(`⚠️  ${name}: ${message}`);
            this.warnings.push(message);
        } else {
            console.log(`❌ ${name}: ${message}`);
            this.errors.push(message);
        }
    }

    /**
     * Check if file exists
     */
    checkFileExists(filePath, description) {
        const exists = fs.existsSync(filePath);
        this.addCheck(
            `File: ${description}`,
            exists,
            exists ? 'File exists' : `File not found: ${filePath}`
        );
        return exists;
    }

    /**
     * Check if directory exists
     */
    checkDirectoryExists(dirPath, description) {
        const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
        this.addCheck(
            `Directory: ${description}`,
            exists,
            exists ? 'Directory exists' : `Directory not found: ${dirPath}`
        );
        return exists;
    }

    /**
     * Validate environment configuration
     */
    validateEnvironmentConfig() {
        console.log('\n🔧 Validating Environment Configuration...');
        
        const configFile = path.join(__dirname, '..', 'configs', 'production.env');
        const templateFile = path.join(__dirname, '..', 'config-templates', 'production.env.template');
        
        // Check if template exists
        this.checkFileExists(templateFile, 'Production environment template');
        
        // Check if config exists
        const configExists = this.checkFileExists(configFile, 'Production environment configuration');
        
        if (configExists) {
            // Validate configuration content
            const config = fs.readFileSync(configFile, 'utf8');
            const lines = config.split('\n');
            
            // Check for placeholder values
            const hasPlaceholders = lines.some(line => 
                line.includes('your_') && line.includes('_here')
            );
            
            this.addCheck(
                'Configuration placeholders',
                !hasPlaceholders,
                hasPlaceholders ? 'Configuration contains placeholder values' : 'No placeholder values found'
            );
            
            // Check for required variables
            const requiredVars = [
                'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
                'JWT_SECRET', 'SESSION_SECRET', 'DB_ENCRYPTION_KEY',
                'REDIS_HOST', 'REDIS_PASSWORD'
            ];
            
            requiredVars.forEach(varName => {
                const hasVar = lines.some(line => line.startsWith(`${varName}=`) && line.split('=')[1].trim());
                this.addCheck(
                    `Required variable: ${varName}`,
                    hasVar,
                    hasVar ? 'Variable is set' : `Variable ${varName} is missing or empty`
                );
            });
            
            // Check for production-specific settings
            const hasProductionNodeEnv = lines.some(line => line.startsWith('NODE_ENV=production'));
            this.addCheck(
                'NODE_ENV setting',
                hasProductionNodeEnv,
                hasProductionNodeEnv ? 'NODE_ENV is set to production' : 'NODE_ENV should be set to production'
            );
            
            const hasSecureLogLevel = lines.some(line => 
                line.startsWith('LOG_LEVEL=') && 
                !line.includes('debug') && 
                !line.includes('trace')
            );
            this.addCheck(
                'LOG_LEVEL security',
                hasSecureLogLevel,
                hasSecureLogLevel ? 'LOG_LEVEL is secure for production' : 'LOG_LEVEL should not be debug/trace in production'
            );
        }
    }

    /**
     * Validate SSL/TLS configuration
     */
    validateSSLConfiguration() {
        console.log('\n🔒 Validating SSL/TLS Configuration...');
        
        const sslDir = path.join(__dirname, '..', 'ssl');
        const certFile = path.join(sslDir, 'server.crt');
        const keyFile = path.join(sslDir, 'server.key');
        const caFile = path.join(sslDir, 'ca.crt');
        
        // Check SSL directory
        this.checkDirectoryExists(sslDir, 'SSL certificates directory');
        
        // Check certificate files
        this.checkFileExists(certFile, 'SSL certificate file');
        this.checkFileExists(keyFile, 'SSL private key file');
        
        // Check if CA file exists (optional)
        const caExists = this.checkFileExists(caFile, 'SSL CA certificate file');
        
        // Validate certificate if it exists
        if (fs.existsSync(certFile)) {
            try {
                const cert = fs.readFileSync(certFile);
                // Basic validation - check if it looks like a certificate
                const isCert = cert.toString().includes('BEGIN CERTIFICATE');
                this.addCheck(
                    'Certificate format',
                    isCert,
                    isCert ? 'Certificate file format is valid' : 'Certificate file format is invalid'
                );
            } catch (error) {
                this.addCheck(
                    'Certificate validation',
                    false,
                    `Error reading certificate: ${error.message}`
                );
            }
        }
    }

    /**
     * Validate Docker configuration
     */
    validateDockerConfiguration() {
        console.log('\n🐳 Validating Docker Configuration...');
        
        const dockerFiles = [
            'Dockerfile',
            'docker-compose.yml',
            'docker-compose.dev.yml',
            'docker/entrypoint.sh',
            'docker/healthcheck.sh',
            'docker/nginx/nginx.conf',
            'docker/nginx/conf.d/cpr-app.conf'
        ];
        
        dockerFiles.forEach(file => {
            const filePath = path.join(__dirname, '..', file);
            this.checkFileExists(filePath, `Docker file: ${file}`);
        });
        
        // Check if Docker scripts are executable
        const dockerScripts = [
            'scripts/docker-build.sh',
            'scripts/docker-deploy.sh'
        ];
        
        dockerScripts.forEach(script => {
            const scriptPath = path.join(__dirname, '..', script);
            const exists = this.checkFileExists(scriptPath, `Docker script: ${script}`);
            
            if (exists) {
                try {
                    const stats = fs.statSync(scriptPath);
                    const isExecutable = !!(stats.mode & parseInt('111', 8));
                    this.addCheck(
                        `Script executable: ${script}`,
                        isExecutable,
                        isExecutable ? 'Script is executable' : 'Script should be executable'
                    );
                } catch (error) {
                    this.addCheck(
                        `Script permissions: ${script}`,
                        false,
                        `Error checking script permissions: ${error.message}`
                    );
                }
            }
        });
    }

    /**
     * Validate security configuration
     */
    validateSecurityConfiguration() {
        console.log('\n🛡️ Validating Security Configuration...');
        
        // Check security middleware files
        const securityFiles = [
            'backend/src/middleware/apiSecurity.ts',
            'backend/src/middleware/requestValidator.ts',
            'backend/src/middleware/mfaMiddleware.ts',
            'backend/src/middleware/databaseEncryption.ts',
            'backend/src/config/sslConfig.ts',
            'backend/src/config/environmentConfig.ts'
        ];
        
        securityFiles.forEach(file => {
            const filePath = path.join(__dirname, '..', file);
            this.checkFileExists(filePath, `Security file: ${file}`);
        });
        
        // Check if security monitoring is configured
        const monitoringFiles = [
            'backend/src/services/securityMonitoringService.ts',
            'backend/src/routes/v1/securityMonitoring.ts',
            'backend/src/config/securityMonitoringDatabase.ts'
        ];
        
        monitoringFiles.forEach(file => {
            const filePath = path.join(__dirname, '..', file);
            this.checkFileExists(filePath, `Monitoring file: ${file}`);
        });
    }

    /**
     * Validate backup configuration
     */
    validateBackupConfiguration() {
        console.log('\n💾 Validating Backup Configuration...');
        
        const backupDir = path.join(__dirname, '..', 'backups');
        this.checkDirectoryExists(backupDir, 'Backup directory');
        
        // Check if backup scripts exist
        const backupScripts = [
            'scripts/backup-database.js',
            'scripts/restore-database.js'
        ];
        
        backupScripts.forEach(script => {
            const scriptPath = path.join(__dirname, '..', script);
            this.checkFileExists(scriptPath, `Backup script: ${script}`);
        });
    }

    /**
     * Validate monitoring configuration
     */
    validateMonitoringConfiguration() {
        console.log('\n📊 Validating Monitoring Configuration...');
        
        const monitoringFiles = [
            'docker/prometheus/prometheus.yml',
            'docker/grafana/provisioning/datasources/prometheus.yml',
            'docker/grafana/provisioning/dashboards/cpr-dashboard.json'
        ];
        
        monitoringFiles.forEach(file => {
            const filePath = path.join(__dirname, '..', file);
            this.checkFileExists(filePath, `Monitoring file: ${file}`);
        });
    }

    /**
     * Run all validations
     */
    async validate() {
        console.log('🚀 Starting Production Environment Validation...\n');
        
        this.validateEnvironmentConfig();
        this.validateSSLConfiguration();
        this.validateDockerConfiguration();
        this.validateSecurityConfiguration();
        this.validateBackupConfiguration();
        this.validateMonitoringConfiguration();
        
        // Summary
        console.log('\n📋 Validation Summary:');
        console.log(`Total checks: ${this.checks.length}`);
        console.log(`Passed: ${this.checks.filter(c => c.passed).length}`);
        console.log(`Warnings: ${this.warnings.length}`);
        console.log(`Errors: ${this.errors.length}`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ Production validation failed!');
            console.log('Errors that must be fixed:');
            this.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️  Warnings (should be reviewed):');
            this.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        if (this.errors.length === 0) {
            console.log('\n✅ Production environment validation passed!');
            console.log('Your application is ready for production deployment.');
        }
        
        return this.errors.length === 0;
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new ProductionValidator();
    validator.validate().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Validation error:', error);
        process.exit(1);
    });
}

module.exports = ProductionValidator;
