#!/usr/bin/env node

/**
 * CI/CD Deployment Script
 * Handles automated deployment for different environments
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CICDDeployer {
    constructor() {
        this.environment = process.env.DEPLOY_ENV || 'staging';
        this.branch = process.env.GITHUB_REF_NAME || 'develop';
        this.commitSha = process.env.GITHUB_SHA || 'local';
        this.deploymentSteps = [];
        this.errors = [];
        this.warnings = [];
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
     * Validate deployment environment
     */
    validateEnvironment() {
        console.log(`🔍 Validating deployment environment: ${this.environment}`);
        
        const validEnvironments = ['staging', 'production'];
        if (!validEnvironments.includes(this.environment)) {
            this.errors.push(`Invalid deployment environment: ${this.environment}`);
            return false;
        }

        // Check if environment configuration exists
        const configFile = path.join(__dirname, '..', 'configs', `${this.environment}.env`);
        if (!fs.existsSync(configFile)) {
            this.errors.push(`Environment configuration not found: ${configFile}`);
            return false;
        }

        console.log(`✅ Environment validation passed`);
        return true;
    }

    /**
     * Run pre-deployment tests
     */
    async runPreDeploymentTests() {
        console.log('\n🧪 Running pre-deployment tests...\n');
        
        // Run unit tests
        const unitTests = this.executeCommand(
            'npm test',
            'Running unit tests'
        );
        
        if (!unitTests.success) {
            this.errors.push('Unit tests failed');
            return false;
        }

        // Run integration tests
        const integrationTests = this.executeCommand(
            'npm run test:integration',
            'Running integration tests'
        );
        
        if (!integrationTests.success) {
            this.warnings.push('Integration tests failed or not configured');
        }

        // Run security tests
        const securityTests = this.executeCommand(
            'npm run security:audit',
            'Running security audit'
        );
        
        if (!securityTests.success) {
            this.warnings.push('Security audit failed');
        }

        return true;
    }

    /**
     * Build and push Docker image
     */
    async buildAndPushImage() {
        console.log('\n🐳 Building and pushing Docker image...\n');
        
        const imageTag = `${this.environment}-${this.commitSha.substring(0, 7)}`;
        const fullImageName = `cpr-training-system:${imageTag}`;
        
        // Build Docker image
        const buildResult = this.executeCommand(
            `docker build -t ${fullImageName} .`,
            'Building Docker image'
        );
        
        if (!buildResult.success) {
            this.errors.push('Docker image build failed');
            return false;
        }

        // Tag image for registry
        const registryImageName = `ghcr.io/your-org/cpr-training-system:${imageTag}`;
        const tagResult = this.executeCommand(
            `docker tag ${fullImageName} ${registryImageName}`,
            'Tagging Docker image'
        );
        
        if (!tagResult.success) {
            this.errors.push('Docker image tagging failed');
            return false;
        }

        // Push to registry (if not local)
        if (process.env.CI) {
            const pushResult = this.executeCommand(
                `docker push ${registryImageName}`,
                'Pushing Docker image to registry'
            );
            
            if (!pushResult.success) {
                this.errors.push('Docker image push failed');
                return false;
            }
        }

        return true;
    }

    /**
     * Deploy to environment
     */
    async deployToEnvironment() {
        console.log(`\n🚀 Deploying to ${this.environment} environment...\n`);
        
        let composeFile = 'docker-compose.yml';
        if (this.environment === 'staging') {
            composeFile = 'docker-compose.staging.yml';
        } else if (this.environment === 'production') {
            composeFile = 'docker-compose.prod.yml';
        }

        // Check if environment-specific compose file exists
        if (!fs.existsSync(path.join(__dirname, '..', composeFile))) {
            console.log(`⚠️  Environment-specific compose file not found: ${composeFile}`);
            console.log('Using default docker-compose.yml');
            composeFile = 'docker-compose.yml';
        }

        // Stop existing services
        this.executeCommand(
            `docker-compose -f ${composeFile} down`,
            'Stopping existing services'
        );

        // Pull latest images
        const pullResult = this.executeCommand(
            `docker-compose -f ${composeFile} pull`,
            'Pulling latest images'
        );
        
        if (!pullResult.success) {
            this.warnings.push('Failed to pull some images, using local images');
        }

        // Start services
        const startResult = this.executeCommand(
            `docker-compose -f ${composeFile} up -d`,
            `Starting ${this.environment} services`
        );
        
        if (!startResult.success) {
            this.errors.push(`Failed to start ${this.environment} services`);
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
        
        const baseUrl = this.environment === 'production' 
            ? 'https://yourdomain.com' 
            : 'http://localhost:3001';
        
        const testEndpoints = [
            `${baseUrl}/api/v1/health`,
            `${baseUrl}/api/v1/health/database`,
            `${baseUrl}/api/v1/health/security-monitoring`
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
     * Send deployment notification
     */
    async sendNotification() {
        console.log('\n📢 Sending deployment notification...\n');
        
        const status = this.errors.length === 0 ? '✅ SUCCESS' : '❌ FAILED';
        const message = `Deployment to ${this.environment} ${status}\n` +
                       `Branch: ${this.branch}\n` +
                       `Commit: ${this.commitSha}\n` +
                       `Errors: ${this.errors.length}\n` +
                       `Warnings: ${this.warnings.length}`;
        
        console.log(message);
        
        // Add notification logic here (Slack, email, etc.)
        if (process.env.SLACK_WEBHOOK_URL) {
            try {
                const notification = {
                    text: message,
                    channel: '#deployments',
                    username: 'CI/CD Bot'
                };
                
                // Send to Slack
                // const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(notification)
                // });
                
                console.log('📢 Notification sent to Slack');
            } catch (error) {
                console.log('⚠️  Failed to send Slack notification');
            }
        }
        
        return true;
    }

    /**
     * Run complete deployment
     */
    async deploy() {
        console.log(`🚀 Starting CI/CD Deployment to ${this.environment}...\n`);
        console.log(`Branch: ${this.branch}`);
        console.log(`Commit: ${this.commitSha}\n`);
        
        try {
            // Validate environment
            const validationPassed = this.validateEnvironment();
            if (!validationPassed) {
                console.log('❌ Environment validation failed');
                return false;
            }
            
            // Run pre-deployment tests
            const testsPassed = await this.runPreDeploymentTests();
            if (!testsPassed) {
                console.log('❌ Pre-deployment tests failed');
                return false;
            }
            
            // Build and push image
            const buildSuccess = await this.buildAndPushImage();
            if (!buildSuccess) {
                console.log('❌ Docker build failed');
                return false;
            }
            
            // Deploy to environment
            const deploySuccess = await this.deployToEnvironment();
            if (!deploySuccess) {
                console.log('❌ Deployment failed');
                return false;
            }
            
            // Wait for services
            const servicesHealthy = await this.waitForServices();
            if (!servicesHealthy) {
                console.log('❌ Services failed to become healthy');
                return false;
            }
            
            // Run post-deployment tests
            await this.runPostDeploymentTests();
            
            // Send notification
            await this.sendNotification();
            
            // Deployment summary
            console.log('\n🎉 CI/CD Deployment Completed!\n');
            console.log('📋 Deployment Summary:');
            console.log(`  - Environment: ${this.environment}`);
            console.log(`  - Branch: ${this.branch}`);
            console.log(`  - Commit: ${this.commitSha}`);
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
            
            return this.errors.length === 0;
            
        } catch (error) {
            console.error('❌ Deployment failed:', error.message);
            return false;
        }
    }
}

// Run deployment if called directly
if (require.main === module) {
    const deployer = new CICDDeployer();
    deployer.deploy().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Deployment error:', error);
        process.exit(1);
    });
}

module.exports = CICDDeployer;
