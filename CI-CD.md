# CI/CD Pipeline Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the CPR Training System.

## 🚀 Overview

The CI/CD pipeline automates the entire software delivery process, from code commit to production deployment. It ensures code quality, security, and reliability through automated testing, security scanning, and deployment.

## 📋 Pipeline Stages

### 1. Code Quality & Security Checks
- **Dependency Security Scan**: npm audit and Snyk security scanning
- **Code Quality**: ESLint, Prettier, and code formatting checks
- **Security Analysis**: CodeQL, Semgrep, and security rule enforcement

### 2. Testing
- **Unit Tests**: Backend and frontend unit tests
- **Integration Tests**: End-to-end testing with Docker Compose
- **Coverage Reports**: Code coverage analysis and reporting

### 3. Build & Security Scan
- **Docker Build**: Multi-stage Docker image building
- **Container Security**: Trivy and Docker Scout vulnerability scanning
- **Image Registry**: Automated image pushing to GitHub Container Registry

### 4. Deployment
- **Staging Deployment**: Automatic deployment to staging environment
- **Production Deployment**: Manual approval required for production
- **Health Checks**: Post-deployment health monitoring

## 🔧 Configuration

### GitHub Actions Workflows

#### Main CI/CD Pipeline (`.github/workflows/ci-cd.yml`)
- **Triggers**: Push to main/develop branches, pull requests
- **Jobs**: Quality checks, testing, building, deployment
- **Environments**: Staging (automatic), Production (manual approval)

#### Security Scan Pipeline (`.github/workflows/security-scan.yml`)
- **Triggers**: Push, pull requests, daily schedule
- **Jobs**: Dependency scan, code security, infrastructure scan
- **Tools**: Snyk, CodeQL, Semgrep, Trivy

### Environment Configuration

#### Staging Environment
- **Branch**: `develop`
- **Auto-deploy**: Yes
- **URL**: `https://staging.yourdomain.com`
- **Database**: `cpr_staging`

#### Production Environment
- **Branch**: `main`
- **Auto-deploy**: No (requires approval)
- **URL**: `https://yourdomain.com`
- **Database**: `cpr_production`

## 🛠️ Local Development

### Running Tests Locally

```bash
# Run all tests
npm test

# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Running Security Scans Locally

```bash
# Run security audit
npm run security:audit

# Run security CI checks
npm run security:ci

# Run Snyk scan (requires SNYK_TOKEN)
npx snyk test

# Run Trivy scan
trivy fs .
```

### Code Quality Checks

```bash
# Run linting
npm run lint

# Check code formatting
npm run format:check

# Fix code formatting
npm run format:fix
```

## 🐳 Docker Testing

### Test Environment

The test environment uses `docker-compose.test.yml` with:
- **PostgreSQL**: Test database on port 5433
- **Redis**: Test cache on port 6380
- **Backend**: Test API on port 3002
- **Frontend**: Test UI on port 5175
- **Nginx**: Test proxy on port 8080

### Running Integration Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run tests
npm run test:integration

# Stop test environment
docker-compose -f docker-compose.test.yml down
```

## 🔒 Security Features

### Automated Security Scanning

1. **Dependency Scanning**
   - npm audit for known vulnerabilities
   - Snyk for advanced security analysis
   - Automated dependency updates

2. **Code Security Analysis**
   - CodeQL for code vulnerability detection
   - Semgrep for security rule enforcement
   - ESLint security rules

3. **Container Security**
   - Trivy for container vulnerability scanning
   - Docker Scout for image security analysis
   - Base image security validation

4. **Infrastructure Security**
   - Configuration file security checks
   - Secret detection and prevention
   - Security policy compliance

### Security Monitoring

- **Real-time Alerts**: Security scan failures trigger notifications
- **Compliance Reports**: Automated security compliance reporting
- **Vulnerability Tracking**: Track and manage security vulnerabilities

## 📊 Monitoring & Alerting

### Pipeline Monitoring

- **Build Status**: Real-time build and deployment status
- **Test Results**: Test coverage and failure tracking
- **Security Alerts**: Security scan results and alerts
- **Deployment History**: Complete deployment audit trail

### Notification Channels

- **GitHub**: Pull request comments and status checks
- **Slack**: Deployment notifications and alerts
- **Email**: Critical failure notifications
- **Dashboard**: Real-time pipeline status

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
docker-compose logs

# Verify Docker configuration
docker-compose config

# Test Docker build locally
docker build -t test-image .
```

#### Test Failures
```bash
# Run tests locally
npm test

# Check test environment
docker-compose -f docker-compose.test.yml ps

# View test logs
docker-compose -f docker-compose.test.yml logs
```

#### Security Scan Failures
```bash
# Run security audit locally
npm run security:audit

# Check for known vulnerabilities
npm audit

# Update dependencies
npm update
```

### Debugging Commands

```bash
# Check pipeline status
gh run list

# View pipeline logs
gh run view <run-id>

# Rerun failed pipeline
gh run rerun <run-id>

# Cancel running pipeline
gh run cancel <run-id>
```

## 📈 Performance Optimization

### Build Optimization

- **Docker Layer Caching**: Optimized Docker builds with layer caching
- **Parallel Jobs**: Concurrent job execution for faster pipelines
- **Selective Testing**: Run only affected tests based on code changes

### Deployment Optimization

- **Blue-Green Deployment**: Zero-downtime deployments
- **Rolling Updates**: Gradual service updates
- **Health Checks**: Automated rollback on health check failures

## 🔄 Maintenance

### Regular Maintenance Tasks

- **Weekly**: Review security scan results and update dependencies
- **Monthly**: Update base Docker images and security tools
- **Quarterly**: Review and update CI/CD pipeline configuration
- **Annually**: Security audit and penetration testing

### Pipeline Updates

1. **Test Changes**: Always test pipeline changes in a separate branch
2. **Gradual Rollout**: Deploy changes gradually to minimize impact
3. **Rollback Plan**: Have a rollback plan for pipeline changes
4. **Documentation**: Update documentation for any pipeline changes

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Snyk Documentation](https://docs.snyk.io/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [CodeQL Documentation](https://codeql.github.com/docs/)

## 🆘 Support

### Getting Help

- **Documentation**: Check this document and inline code comments
- **GitHub Issues**: Create issues for bugs or feature requests
- **Team Chat**: Use team communication channels for quick questions
- **Escalation**: Contact DevOps team for critical pipeline issues

### Emergency Procedures

- **Pipeline Failure**: Check logs and rerun if necessary
- **Security Alert**: Review security scan results immediately
- **Deployment Issue**: Use rollback procedures if available
- **Critical Bug**: Stop pipeline and investigate immediately

---

For additional support or questions about the CI/CD pipeline, please refer to the project documentation or contact the development team.
