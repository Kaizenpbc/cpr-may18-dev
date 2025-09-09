# 🐳 CPR Training System - Docker Deployment Guide

This guide covers deploying the CPR Training System using Docker containers for both development and production environments.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- 4GB+ RAM available
- 10GB+ disk space

## 🚀 Quick Start

### Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd cpr-jun21-dev

# Start development environment
npm run docker:up:dev

# View logs
npm run docker:logs:dev

# Stop development environment
npm run docker:down:dev
```

### Production Environment

```bash
# Build and deploy to production
npm run docker:build
npm run docker:deploy:prod

# View logs
npm run docker:logs

# Stop production environment
npm run docker:down
```

## 🏗️ Architecture

The Docker setup includes:

- **PostgreSQL Database** - Primary data storage
- **Redis Cache** - Session and caching layer
- **CPR Backend** - Node.js API server
- **Nginx** - Reverse proxy and load balancer
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboards

## 📁 File Structure

```
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Production environment
├── docker-compose.dev.yml     # Development environment
├── docker/
│   ├── entrypoint.sh         # Container startup script
│   ├── healthcheck.sh        # Health check script
│   ├── nginx/
│   │   ├── nginx.conf        # Nginx main configuration
│   │   └── conf.d/
│   │       └── cpr-app.conf  # Application configuration
│   └── postgres/
│       ├── init/             # Database initialization
│       └── conf/             # PostgreSQL configuration
├── scripts/
│   ├── docker-build.sh       # Build script
│   └── docker-deploy.sh      # Deployment script
└── config-templates/
    └── production.env.template # Production environment template
```

## 🔧 Configuration

### Environment Variables

Copy the production template and configure:

```bash
cp config-templates/production.env.template .env
```

Key configuration items:

- `DB_PASSWORD` - Secure database password
- `JWT_SECRET` - JWT signing secret (32+ characters)
- `DB_ENCRYPTION_KEY` - Data encryption key (32 characters)
- `EMAIL_*` - Email service configuration
- `REDIS_PASSWORD` - Redis authentication

### SSL Certificates

For production, place your SSL certificates in the `ssl/` directory:

```bash
ssl/
├── server.crt    # SSL certificate
└── server.key    # SSL private key
```

For development, self-signed certificates will be generated automatically.

## 🚀 Deployment Commands

### Development

```bash
# Start development environment
npm run docker:up:dev

# View logs
npm run docker:logs:dev

# Stop development environment
npm run docker:down:dev

# Clean up development environment
docker-compose -f docker-compose.dev.yml down -v
```

### Production

```bash
# Build Docker images
npm run docker:build

# Deploy to production
npm run docker:deploy:prod

# View logs
npm run docker:logs

# Stop production environment
npm run docker:down

# Clean up production environment
npm run docker:clean
```

## 🔍 Monitoring

### Health Checks

- **Backend API**: http://localhost:3001/api/v1/health
- **Database**: Automatic health checks
- **Redis**: Automatic health checks
- **Nginx**: http://localhost/health

### Monitoring Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

### Logs

```bash
# View all logs
npm run docker:logs

# View specific service logs
docker-compose logs -f cpr-backend
docker-compose logs -f postgres
docker-compose logs -f nginx
```

## 🛡️ Security Features

### Container Security

- Non-root user execution
- Read-only filesystems where possible
- Security-optimized base images
- Minimal attack surface

### Network Security

- Internal Docker networks
- SSL/TLS termination at Nginx
- Rate limiting and DDoS protection
- Security headers

### Data Security

- Encrypted data at rest
- Secure environment variables
- Database connection encryption
- Redis authentication

## 🔧 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :3001
   
   # Kill conflicting processes
   sudo lsof -ti:3001 | xargs kill -9
   ```

2. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Test database connection
   docker-compose exec postgres pg_isready -U postgres
   ```

3. **Memory Issues**
   ```bash
   # Check Docker memory usage
   docker stats
   
   # Increase Docker memory limit in Docker Desktop
   ```

4. **SSL Certificate Issues**
   ```bash
   # Generate new certificates
   npm run ssl:generate
   
   # Check certificate validity
   npm run ssl:check
   ```

### Logs and Debugging

```bash
# View detailed logs
docker-compose logs --tail=100 -f

# Access container shell
docker-compose exec cpr-backend sh

# Check container health
docker-compose ps
```

## 📊 Performance Tuning

### Database Optimization

- Connection pooling configured
- Query optimization enabled
- Indexes created automatically
- Regular maintenance scheduled

### Application Optimization

- Gzip compression enabled
- Static file caching
- API response caching
- Memory usage monitoring

### Nginx Optimization

- HTTP/2 enabled
- Gzip compression
- Rate limiting
- Connection keep-alive

## 🔄 Updates and Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and redeploy
npm run docker:build
npm run docker:deploy:prod
```

### Database Backups

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres cpr_may18 > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres cpr_may18 < backup.sql
```

### Cleanup

```bash
# Remove unused containers and images
npm run docker:clean

# Remove all volumes (WARNING: This will delete all data)
docker-compose down -v
docker volume prune -f
```

## 📞 Support

For issues and questions:

1. Check the logs: `npm run docker:logs`
2. Verify configuration: `npm run config:validate`
3. Check health status: `npm run docker:status`
4. Review this documentation

## 🎯 Next Steps

After successful deployment:

1. Configure monitoring dashboards
2. Set up automated backups
3. Configure SSL certificates
4. Set up CI/CD pipeline
5. Configure load balancing for high availability
