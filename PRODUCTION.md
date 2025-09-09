# Production Environment Guide

This guide covers the complete setup and deployment of the CPR Training System in a production environment.

## 🚀 Quick Start

### 1. Generate Production Configuration
```bash
npm run config:generate production
```

### 2. Validate Production Setup
```bash
npm run prod:validate
```

### 3. Deploy to Production
```bash
npm run prod:deploy
```

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended) or Windows Server
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended

### Software Requirements
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (for build tools)
- **PostgreSQL**: 15+ (if not using Docker)
- **Redis**: 7+ (if not using Docker)

### Network Requirements
- **Ports**: 80, 443, 3001, 5432, 6379, 9090, 3000
- **SSL Certificate**: Valid SSL certificate for your domain
- **Firewall**: Properly configured firewall rules

## 🔧 Configuration

### Environment Variables

The production environment uses the following key configuration files:

- `configs/production.env` - Main production configuration
- `config-templates/production.env.template` - Template for generating configs
- `ssl/` - SSL certificates directory
- `docker-compose.yml` - Production Docker services

### Required Environment Variables

```bash
# Database
DB_HOST=your_production_db_host
DB_NAME=cpr_production
DB_USER=your_production_db_user
DB_PASSWORD=your_secure_production_password
DB_ENCRYPTION_KEY=your_32_character_encryption_key

# Security
JWT_SECRET=your_super_secure_jwt_secret_key
SESSION_SECRET=your_session_secret_key
NODE_ENV=production

# SSL/TLS
SSL_ENABLED=true
SSL_CERT_PATH=/app/ssl/server.crt
SSL_KEY_PATH=/app/ssl/server.key

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
```

### SSL/TLS Configuration

1. **Generate SSL Certificates**:
   ```bash
   npm run ssl:generate
   ```

2. **For Production**: Replace with valid certificates from a trusted CA

3. **Certificate Requirements**:
   - Valid SSL certificate for your domain
   - Private key file
   - Certificate chain (if applicable)

## 🐳 Docker Deployment

### Production Services

The production deployment includes the following services:

- **cpr-backend**: Main application backend
- **postgres**: PostgreSQL database
- **redis**: Redis cache and session store
- **nginx**: Reverse proxy and load balancer
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboard

### Docker Commands

```bash
# Build production image
docker build -t cpr-training-system:latest .

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Update services
docker-compose pull
docker-compose up -d
```

## 🔒 Security Configuration

### Security Features

- **API Security**: Rate limiting, request validation, suspicious activity detection
- **Authentication**: JWT-based authentication with MFA support
- **Data Encryption**: Field-level encryption for sensitive data
- **SSL/TLS**: End-to-end encryption
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Input Validation**: Comprehensive input sanitization
- **Audit Logging**: Complete audit trail of all activities

### Security Checklist

- [ ] SSL certificates are valid and properly configured
- [ ] All default passwords have been changed
- [ ] Environment variables are properly secured
- [ ] Firewall rules are configured
- [ ] Regular security updates are scheduled
- [ ] Monitoring and alerting are configured
- [ ] Backup and recovery procedures are tested

## 📊 Monitoring and Alerting

### Prometheus Metrics

- **Application Metrics**: Request rates, response times, error rates
- **System Metrics**: CPU, memory, disk usage
- **Database Metrics**: Connection pools, query performance
- **Security Metrics**: Failed logins, suspicious activities

### Grafana Dashboards

- **System Overview**: Overall system health
- **Application Performance**: API performance metrics
- **Security Dashboard**: Security events and alerts
- **Database Performance**: Database metrics and queries

### Alerting Rules

- **High Error Rate**: >5% error rate for 5 minutes
- **High Response Time**: >2s average response time
- **Database Issues**: Connection pool exhaustion
- **Security Events**: Multiple failed login attempts
- **System Resources**: High CPU/memory usage

## 💾 Backup and Recovery

### Automated Backups

- **Database Backups**: Daily automated backups
- **Configuration Backups**: Before each deployment
- **Log Archives**: Weekly log rotation and archiving

### Backup Commands

```bash
# Create database backup
docker-compose exec postgres pg_dump -U postgres cpr_production > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres cpr_production < backup.sql
```

### Recovery Procedures

1. **Database Recovery**: Restore from latest backup
2. **Configuration Recovery**: Restore from deployment backup
3. **Full System Recovery**: Rebuild from Docker images and restore data

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service logs
docker-compose logs [service-name]

# Check service status
docker-compose ps

# Restart service
docker-compose restart [service-name]
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready -U postgres

# Check database logs
docker-compose logs postgres
```

#### SSL Certificate Issues
```bash
# Check certificate validity
npm run ssl:check

# Regenerate certificates
npm run ssl:generate
```

### Health Checks

```bash
# Application health
curl http://localhost:3001/api/v1/health

# Database health
curl http://localhost:3001/api/v1/health/database

# Security monitoring health
curl http://localhost:3001/api/v1/health/security-monitoring
```

## 📈 Performance Optimization

### Database Optimization

- **Connection Pooling**: Configured for production load
- **Query Optimization**: Indexed queries and optimized schemas
- **Caching**: Redis caching for frequently accessed data

### Application Optimization

- **Compression**: Gzip compression enabled
- **Static Assets**: CDN-ready static asset serving
- **API Rate Limiting**: Prevents abuse and ensures fair usage

### Monitoring Performance

- **Response Time Monitoring**: Track API response times
- **Resource Usage**: Monitor CPU, memory, and disk usage
- **Error Rate Tracking**: Monitor and alert on error rates

## 🔄 Maintenance

### Regular Maintenance Tasks

- **Weekly**: Review security logs and update dependencies
- **Monthly**: Update SSL certificates and security patches
- **Quarterly**: Review and update backup procedures
- **Annually**: Security audit and penetration testing

### Update Procedures

1. **Test Updates**: Deploy to staging environment first
2. **Backup**: Create full system backup before updates
3. **Deploy**: Use rolling deployment strategy
4. **Verify**: Run health checks and monitor for issues
5. **Rollback**: Have rollback plan ready if issues occur

## 📞 Support

### Monitoring URLs

- **Application**: https://yourdomain.com
- **API Health**: https://yourdomain.com/api/v1/health
- **Prometheus**: http://yourdomain.com:9090
- **Grafana**: http://yourdomain.com:3000

### Log Locations

- **Application Logs**: `/app/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **Docker Logs**: `docker-compose logs`

### Emergency Contacts

- **System Administrator**: [Your contact info]
- **Security Team**: [Security contact info]
- **Database Administrator**: [DBA contact info]

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

For additional support or questions, please refer to the project documentation or contact the development team.
