# Standard Operating Procedures (SOP)
## CPR Training Management System

**Version:** 1.1
**Last Updated:** January 31, 2026  
**Document Owner:** System Administrator

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Development Workflow](#development-workflow)
3. [Emergency Procedures](#emergency-procedures)
4. [Maintenance Tasks](#maintenance-tasks)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Security Procedures](#security-procedures)
7. [Backup & Recovery](#backup--recovery)
8. [Monitoring & Alerting](#monitoring--alerting)

---

## Daily Operations

### 1.1 System Startup Procedures

#### Backend Server Startup
```bash
# Navigate to project root
cd C:\Users\gerog\Documents\cpr-jun21-dev

# Start backend server
npm run dev:backend

# Verify backend is running
curl -s http://localhost:3001/api/v1/health
```

#### Frontend Server Startup
```bash
# Start frontend server (in new terminal)
npm run dev:frontend

# Verify frontend is running
curl -s http://localhost:5173
```

#### Database Connection Check
```bash
# Check database health
curl -s http://localhost:3001/api/v1/health/database

# Expected response: {"status":"healthy","database":{...}}
```

### 1.2 System Shutdown Procedures

#### Graceful Shutdown
```bash
# Stop frontend (Ctrl+C in terminal)
Ctrl+C

# Stop backend (Ctrl+C in terminal)
Ctrl+C

# Force kill if needed
taskkill /F /IM node.exe
```

### 1.3 Daily Health Checks

#### System Status Check
```bash
# Check all services
curl -s http://localhost:3001/api/v1/health
curl -s http://localhost:3001/api/v1/health/database
curl -s http://localhost:3001/api/v1/health/security-monitoring
```

#### Log Review
```bash
# Check recent logs
tail -f logs/application.log
tail -f logs/error.log
tail -f logs/security.log
```

---

## Development Workflow

### 2.1 Code Deployment Process

#### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Security scan completed
- [ ] Database migrations ready
- [ ] Backup completed

#### Deployment Steps
```bash
# 1. Pull latest changes
git pull origin master

# 2. Install dependencies
npm install

# 3. Run tests
npm test

# 4. Build for production
npm run build

# 5. Deploy
npm run deploy:production
```

### 2.2 Environment Setup

#### Development Environment
```bash
# Clone repository
git clone <repository-url>
cd cpr-jun21-dev

# Install dependencies
npm install

# Setup environment variables
cp config-templates/development.env.template .env

# Start services
npm run dev:backend
npm run dev:frontend
```

#### Production Environment
```bash
# Validate production configuration
npm run prod:validate

# Deploy with Docker
docker-compose up -d

# Verify deployment
npm run health:check
```

### 2.3 Testing Procedures

#### Unit Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testPathPattern=accessibility

# Run with coverage
npm test -- --coverage
```

#### Integration Tests
```bash
# Test API endpoints
npm run test:api

# Test database connections
npm run test:database

# Test security features
npm run test:security
```

#### Manual Testing
```bash
# Follow manual testing guide
cat frontend/MANUAL_TESTING_GUIDE.md
```

---

## Emergency Procedures

### 3.1 Server Restart Procedures

#### Emergency Restart
```bash
# 1. Kill all processes
taskkill /F /IM node.exe

# 2. Clear any locks
rm -f logs/*.lock

# 3. Restart services
npm run dev:backend
npm run dev:frontend

# 4. Verify services
curl -s http://localhost:3001/api/v1/health
```

#### Database Recovery
```bash
# 1. Stop all services
taskkill /F /IM node.exe

# 2. Restore from backup
npm run restore:database

# 3. Restart services
npm run dev:backend
```

### 3.2 Security Incident Response

#### Immediate Actions
1. **Isolate affected systems**
2. **Document the incident**
3. **Notify stakeholders**
4. **Preserve evidence**

#### Response Steps
```bash
# 1. Check security logs
tail -f logs/security.log

# 2. Review audit trail
npm run audit:review

# 3. Check for unauthorized access
npm run security:scan

# 4. Update security measures
npm run security:update
```

### 3.3 Rollback Procedures

#### Code Rollback
```bash
# 1. Identify last stable commit
git log --oneline

# 2. Rollback to stable version
git reset --hard <commit-hash>

# 3. Restart services
npm run dev:backend
npm run dev:frontend
```

#### Database Rollback
```bash
# 1. Stop services
taskkill /F /IM node.exe

# 2. Restore database
npm run restore:database --backup=<backup-file>

# 3. Restart services
npm run dev:backend
```

---

## Maintenance Tasks

### 4.1 Regular Updates

#### Weekly Tasks
- [ ] Review system logs
- [ ] Check disk space
- [ ] Update dependencies
- [ ] Run security scans
- [ ] Backup database

#### Monthly Tasks
- [ ] Review security policies
- [ ] Update documentation
- [ ] Performance optimization
- [ ] Capacity planning
- [ ] Disaster recovery test

### 4.2 Dependency Management

#### Update Dependencies
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

#### Security Updates
```bash
# Run security scan
npm run security:scan

# Update security packages
npm run security:update

# Verify security
npm run security:verify
```

### 4.3 Performance Monitoring

#### System Performance
```bash
# Check system resources
npm run monitor:system

# Check database performance
npm run monitor:database

# Check API performance
npm run monitor:api
```

#### Optimization
```bash
# Analyze performance
npm run analyze:performance

# Optimize database
npm run optimize:database

# Clear caches
npm run cache:clear
```

---

## Troubleshooting Guide

### 5.1 Common Issues

#### API Configuration Issues
**Problem:** Frontend calling wrong port (5173 instead of 3001)
**Solution:**
```bash
# 1. Check configuration
cat frontend/src/config.ts

# 2. Restart frontend
taskkill /F /IM node.exe
npm run dev:frontend

# 3. Clear browser cache
Ctrl+Shift+R
```

#### Database Connection Issues
**Problem:** Database connection failed
**Solution:**
```bash
# 1. Check database status
curl -s http://localhost:3001/api/v1/health/database

# 2. Restart database
# (If using Docker)
docker-compose restart postgres

# 3. Check connection string
cat backend/.env
```

#### Authentication Issues
**Problem:** 401 Unauthorized errors
**Solution:**
```bash
# 1. Check authentication logs
tail -f logs/auth.log

# 2. Verify JWT configuration
cat backend/.env | grep JWT

# 3. Clear authentication cache
npm run auth:clear
```

### 5.2 Error Codes Reference

| Error Code | Description | Solution |
|------------|-------------|----------|
| AUTH_1005 | No token provided | Check authentication |
| AUTH_1006 | Token expired | Refresh token |
| DB_2001 | Database connection failed | Restart database |
| API_3001 | Rate limit exceeded | Wait and retry |
| SEC_4001 | Security violation | Check security logs |

### 5.3 Log Analysis

#### Log Locations
```bash
# Application logs
logs/application.log

# Error logs
logs/error.log

# Security logs
logs/security.log

# Access logs
logs/access.log
```

#### Log Analysis Commands
```bash
# Search for errors
grep "ERROR" logs/application.log

# Search for security events
grep "SECURITY" logs/security.log

# Monitor real-time logs
tail -f logs/application.log
```

---

## Security Procedures

### 6.1 Access Control

#### User Management
```bash
# Create new user
npm run user:create --username=<username> --role=<role>

# Update user permissions
npm run user:update --username=<username> --permissions=<permissions>

# Deactivate user
npm run user:deactivate --username=<username>
```

#### Role Management
```bash
# List all roles
npm run role:list

# Create new role
npm run role:create --name=<role-name> --permissions=<permissions>

# Update role permissions
npm run role:update --name=<role-name> --permissions=<permissions>
```

### 6.3 Organization Location Management

Organizations can have multiple locations (branches, offices, sites). Locations are managed through the admin portals.

#### Managing Locations (SystemAdmin Portal)
1. Navigate to **Organizations** in SystemAdmin Portal
2. Click the **Location pin icon** in the Actions column for the target organization
3. Use the dialog to add, edit, or delete locations

#### Managing Locations (SuperAdmin Portal)
1. Navigate to **Manage Organizations** in SuperAdmin Portal
2. Click **Edit** on an existing organization
3. Scroll to the **Locations** section
4. Use "Add Location" to create new locations

#### Location Access Permissions
| Role | View | Add/Edit/Delete |
|------|------|-----------------|
| sysadmin | Yes | Yes |
| admin | Yes | Yes |
| accountant | Yes | No |
| organization | No | No |

**Note**: Locations with assigned users or courses cannot be deleted. See `docs/ORGANIZATION_LOCATIONS_USER_GUIDE.md` for detailed instructions.

### 6.2 Security Monitoring

#### Security Checks
```bash
# Run security scan
npm run security:scan

# Check for vulnerabilities
npm audit

# Review security logs
npm run security:review

# Update security policies
npm run security:update
```

#### Incident Response
```bash
# Report security incident
npm run security:report --incident=<incident-id>

# Generate security report
npm run security:report --type=monthly

# Update security measures
npm run security:update
```

---

## Backup & Recovery

### 7.1 Backup Procedures

#### Database Backup
```bash
# Create backup
npm run backup:database

# Schedule automatic backups
npm run backup:schedule --frequency=daily

# Verify backup
npm run backup:verify --backup=<backup-file>
```

#### Configuration Backup
```bash
# Backup configuration
npm run backup:config

# Backup environment files
npm run backup:env

# Backup SSL certificates
npm run backup:ssl
```

### 7.2 Recovery Procedures

#### Database Recovery
```bash
# List available backups
npm run backup:list

# Restore from backup
npm run restore:database --backup=<backup-file>

# Verify restoration
npm run restore:verify
```

#### Full System Recovery
```bash
# 1. Stop all services
taskkill /F /IM node.exe

# 2. Restore database
npm run restore:database --backup=<backup-file>

# 3. Restore configuration
npm run restore:config --backup=<config-backup>

# 4. Restart services
npm run dev:backend
npm run dev:frontend
```

---

## Monitoring & Alerting

### 8.1 System Monitoring

#### Health Checks
```bash
# Check system health
npm run health:check

# Check database health
npm run health:database

# Check API health
npm run health:api

# Check security health
npm run health:security
```

#### Performance Monitoring
```bash
# Monitor system performance
npm run monitor:system

# Monitor database performance
npm run monitor:database

# Monitor API performance
npm run monitor:api

# Generate performance report
npm run monitor:report
```

### 8.2 Alerting

#### Alert Configuration
```bash
# Configure alerts
npm run alert:configure

# Test alerts
npm run alert:test

# View alert history
npm run alert:history
```

#### Alert Response
```bash
# Acknowledge alert
npm run alert:acknowledge --alert=<alert-id>

# Resolve alert
npm run alert:resolve --alert=<alert-id>

# Escalate alert
npm run alert:escalate --alert=<alert-id>
```

---

## Contact Information

### Emergency Contacts
- **System Administrator:** [Contact Info]
- **Database Administrator:** [Contact Info]
- **Security Officer:** [Contact Info]

### Support Channels
- **Internal Support:** [Contact Info]
- **External Support:** [Contact Info]
- **Emergency Hotline:** [Contact Info]

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-09-10 | System Administrator | Initial creation |

---

**Note:** This document should be reviewed and updated regularly to ensure accuracy and relevance.
