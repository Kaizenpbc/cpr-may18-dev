#!/usr/bin/env node

/**
 * Production Deployment Script
 * Handles the complete production deployment process
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProductionDeployer {
    constructor() {
        this.deploymentSteps = [];
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Add a deployment step
     */
    addStep(name, action) {
        this.deploymentSteps.push({ name, action, completed: false, error: null });
    }

    /**
     * Execute a command safely
     */
    executeCommand(command, description) {
        try {
            console.log(`🔄 ${description}...`);
            const output = execSync(command, { 
                encoding: 'utf8', 
                stdio: 'pipe',
                cwd: path.join(__dirname, '..')
            });
            console.log(`✅ ${description} completed`);
            return { success: true, output };
        } catch (error) {
            console.log(`❌ ${description} failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if file exists
     */
    fileExists(filePath) {
        return fs.existsSync(path.join(__dirname, '..', filePath));
    }

    /**
     * Pre-deployment validation
     */
    async validatePreDeployment() {
        console.log('🔍 Pre-deployment validation...\n');
        
        const requiredFiles = [
            'configs/production.env',
            'ssl/server.crt',
            'ssl/server.key',
            'Dockerfile',
            'docker-compose.yml'
        ];
        
        const missingFiles = requiredFiles.filter(file => !this.fileExists(file));
        
        if (missingFiles.length > 0) {
            console.log('❌ Missing required files:');
            missingFiles.forEach(file => console.log(`  - ${file}`));
            return false;
        }
        
        console.log('✅ Pre-deployment validation passed');
        return true;
    }

    /**
     * Build Docker images
     */
    async buildDockerImages() {
        console.log('\n🐳 Building Docker images...\n');
        
        const buildResult = this.executeCommand(
            'docker build -t cpr-training-system:latest .',
            'Building production Docker image'
        );
        
        if (!buildResult.success) {
            this.errors.push('Docker image build failed');
            return false;
        }
        
        return true;
    }

    /**
     * Deploy with Docker Compose
     */
    async deployWithDockerCompose() {
        console.log('\n🚀 Deploying with Docker Compose...\n');
        
        // Stop existing containers
        this.executeCommand(
            'docker-compose down',
            'Stopping existing containers'
        );
        
        // Pull latest images
        const pullResult = this.executeCommand(
            'docker-compose pull',
            'Pulling latest images'
        );
        
        if (!pullResult.success) {
            this.warnings.push('Failed to pull some images, using local images');
        }
        
        // Start services
        const startResult = this.executeCommand(
            'docker-compose up -d',
            'Starting production services'
        );
        
        if (!startResult.success) {
            this.errors.push('Failed to start production services');
            return false;
        }
        
        return true;
    }

    /**
     * Wait for services to be healthy
     */
    async waitForServices() {
        console.log('\n⏳ Waiting for services to be healthy...\n');
        
        const maxAttempts = 30;
        const delay = 2000; // 2 seconds
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`Health check attempt ${attempt}/${maxAttempts}...`);
            
            try {
                const healthResult = this.executeCommand(
                    'docker-compose ps',
                    'Checking service status'
                );
                
                if (healthResult.success) {
                    // Check if all services are running
                    const output = healthResult.output;
                    const runningServices = (output.match(/Up/g) || []).length;
                    const totalServices = (output.match(/cpr-/g) || []).length;
                    
                    if (runningServices >= totalServices) {
                        console.log('✅ All services are running');
                        return true;
                    }
                }
            } catch (error) {
                console.log(`Health check failed: ${error.message}`);
            }
            
            if (attempt < maxAttempts) {
                console.log(`Waiting ${delay/1000} seconds before next check...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        this.errors.push('Services failed to become healthy within timeout');
        return false;
    }

    /**
     * Run post-deployment tests
     */
    async runPostDeploymentTests() {
        console.log('\n🧪 Running post-deployment tests...\n');
        
        const testEndpoints = [
            'http://localhost:3001/api/v1/health',
            'http://localhost:3001/api/v1/health/database',
            'http://localhost:3001/api/v1/health/security-monitoring'
        ];
        
        for (const endpoint of testEndpoints) {
            const testResult = this.executeCommand(
                `curl -f ${endpoint}`,
                `Testing endpoint: ${endpoint}`
            );
            
            if (!testResult.success) {
                this.warnings.push(`Health check failed for ${endpoint}`);
            }
        }
        
        return true;
    }

    /**
     * Setup monitoring
     */
    async setupMonitoring() {
        console.log('\n📊 Setting up monitoring...\n');
        
        // Check if monitoring services are running
        const monitoringResult = this.executeCommand(
            'docker-compose ps | grep -E "(prometheus|grafana)"',
            'Checking monitoring services'
        );
        
        if (monitoringResult.success) {
            console.log('✅ Monitoring services are running');
            console.log('📈 Prometheus: http://localhost:9090');
            console.log('📊 Grafana: http://localhost:3000 (admin/admin)');
        } else {
            this.warnings.push('Monitoring services may not be running');
        }
        
        return true;
    }

    /**
     * Create deployment backup
     */
    async createDeploymentBackup() {
        console.log('\n💾 Creating deployment backup...\n');
        
        const backupDir = path.join(__dirname, '..', 'backups', 'deployments');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `deployment-${timestamp}`);
        
        // Create backup directory
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Backup current configuration
        const configBackup = this.executeCommand(
            `cp -r configs ${backupPath}/`,
            'Backing up configuration files'
        );
        
        if (configBackup.success) {
            console.log(`✅ Configuration backed up to: ${backupPath}`);
        } else {
            this.warnings.push('Failed to backup configuration');
        }
        
        return true;
    }

    /**
     * Run complete deployment
     */
    async deploy() {
        console.log('🚀 Starting Production Deployment...\n');
        
        try {
            // Pre-deployment validation
            const validationPassed = await this.validatePreDeployment();
            if (!validationPassed) {
                console.log('❌ Pre-deployment validation failed');
                return false;
            }
            
            // Create backup
            await this.createDeploymentBackup();
            
            // Build Docker images
            const buildSuccess = await this.buildDockerImages();
            if (!buildSuccess) {
                console.log('❌ Docker build failed');
                return false;
            }
            
            // Deploy with Docker Compose
            const deploySuccess = await this.deployWithDockerCompose();
            if (!deploySuccess) {
                console.log('❌ Docker Compose deployment failed');
                return false;
            }
            
            // Wait for services
            const servicesHealthy = await this.waitForServices();
            if (!servicesHealthy) {
                console.log('❌ Services failed to become healthy');
                return false;
            }
            
            // Run tests
            await this.runPostDeploymentTests();
            
            // Setup monitoring
            await this.setupMonitoring();
            
            // Deployment summary
            console.log('\n🎉 Production Deployment Completed!\n');
            console.log('📋 Deployment Summary:');
            console.log(`  - Errors: ${this.errors.length}`);
            console.log(`  - Warnings: ${this.warnings.length}`);
            
            if (this.errors.length > 0) {
                console.log('\n❌ Errors:');
                this.errors.forEach(error => console.log(`  - ${error}`));
            }
            
            if (this.warnings.length > 0) {
                console.log('\n⚠️  Warnings:');
                this.warnings.forEach(warning => console.log(`  - ${warning}`));
            }
            
            console.log('\n🌐 Application URLs:');
            console.log('  - Backend API: http://localhost:3001');
            console.log('  - Prometheus: http://localhost:9090');
            console.log('  - Grafana: http://localhost:3000');
            
            return this.errors.length === 0;
            
        } catch (error) {
            console.error('❌ Deployment failed:', error.message);
            return false;
        }
    }
}

// Run deployment if called directly
if (require.main === module) {
    const deployer = new ProductionDeployer();
    deployer.deploy().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Deployment error:', error);
        process.exit(1);
    });
}

module.exports = ProductionDeployer;
