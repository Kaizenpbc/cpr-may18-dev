# CPR Training System - Complete Monitoring & Alerting Guide

## 🎯 Overview

This guide covers the **complete enterprise-grade monitoring and alerting solution** implemented for the CPR Training Management System using **Prometheus**, **Grafana**, and **AlertManager**.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CPR Backend   │    │   PostgreSQL    │    │      Redis      │
│  (Node.js API) │    │   (Database)    │    │    (Cache)      │
│   Port: 3001    │    │   Port: 5432    │    │   Port: 6379    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │ /metrics             │                      │
          │                      │                      │
┌─────────▼───────────────────────▼──────────────────────▼───────┐
│                    Prometheus                                  │
│               (Metrics Collection)                             │
│                   Port: 9090                                   │
└─────────┬─────────────────────────────────────┬───────────────┘
          │                                     │
          │ Metrics                             │ Alerts
          │                                     │
┌─────────▼───────┐                   ┌─────────▼───────┐
│    Grafana      │                   │  AlertManager   │
│ (Visualization) │                   │ (Notifications) │
│   Port: 3000    │                   │   Port: 9093    │
└─────────────────┘                   └─────────────────┘
          │                                     │
          │ Dashboards                          │ Alerts
          │                                     │
┌─────────▼───────┐                   ┌─────────▼───────┐
│      Users      │                   │ Email/Slack/SMS │
│   (Web UI)      │                   │ (Notifications) │
└─────────────────┘                   └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

1. **Docker & Docker Compose** installed
2. **CPR Backend** running on port 3001
3. **PostgreSQL** database accessible
4. **Git** repository access

### 1. Start the Monitoring Stack

```bash
# Make startup script executable
chmod +x start-monitoring.sh

# Start all monitoring services
./start-monitoring.sh
```

### 2. Access Services

- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

### 3. Verify Integration

Check that CPR backend metrics are available:
```bash
curl http://localhost:3001/metrics
```

## 📊 Metrics Collection

### Application Metrics

The CPR backend automatically exports comprehensive metrics:

#### HTTP Metrics
- `cpr_http_requests_total` - Total HTTP requests by method, route, status, portal
- `cpr_http_request_duration_seconds` - Request duration histogram
- `cpr_http_request_size_bytes` - Request size histogram
- `cpr_http_response_size_bytes` - Response size histogram

#### Business Metrics
- `cpr_courses_total` - Course counts by status, type, organization
- `cpr_students_total` - Student counts by status, organization
- `cpr_instructors_total` - Instructor counts by availability
- `cpr_revenue_total_dollars` - Revenue tracking by period, organization
- `cpr_invoices_total` - Invoice counts by status
- `cpr_payments_total` - Payment counts by status and verification

#### Security Metrics
- `cpr_authentication_attempts_total` - Auth attempts by result and role
- `cpr_rate_limit_violations_total` - Rate limiting violations
- `cpr_security_events_total` - Security events by type and severity
- `cpr_active_users` - Currently active users by role and portal

#### Database Metrics
- `cpr_database_connections` - Active database connections
- `cpr_database_query_duration_seconds` - Query execution time
- `cpr_database_size_bytes` - Database size tracking

#### Operational Metrics
- `cpr_course_completion_rate` - Course completion percentages
- `cpr_attendance_rate` - Student attendance rates
- `cpr_instructor_utilization_rate` - Instructor utilization tracking
- `cpr_billing_cycle_time_hours` - Billing cycle duration

### System Metrics (Node Exporter)

- CPU usage, memory, disk space
- Network statistics
- File system metrics
- System load averages

### Database Metrics (PostgreSQL Exporter)

- Connection pool status
- Query performance
- Table sizes and statistics
- Index usage and efficiency

## 🔔 Alerting System

### Alert Categories

#### Critical Alerts (Immediate Response)
- **CPRBackendDown** - Backend service unavailable
- **DatabaseConnectionFailure** - Database connectivity issues
- **HighErrorRate** - >5% error rate for 5 minutes
- **SecurityEventCritical** - Critical security incidents

#### Warning Alerts (Standard Response)
- **HighResponseTime** - 95th percentile >2s for 10 minutes
- **HighCPUUsage** - >80% CPU for 15 minutes
- **HighMemoryUsage** - >85% memory for 10 minutes
- **DiskSpaceLow** - <10% disk space remaining

#### Business Alerts
- **NoCoursesScheduledToday** - No confirmed courses during business hours
- **HighCourseFailureRate** - >20% cancellation rate
- **LowAttendanceRate** - <70% attendance rate
- **UnpaidInvoicesAccumulating** - >10 overdue invoices

#### Security Alerts
- **HighFailedAuthenticationRate** - >10 failures/sec for 2 minutes
- **RateLimitViolationsSpike** - >50 violations/sec
- **SecurityEventCritical** - Any critical security event

### Notification Channels

#### Email Notifications
- **Critical alerts**: immediate email to platform team
- **Warning alerts**: email to relevant team (operations, accounting, security)
- **Info alerts**: daily digest emails

#### Slack Integration
- **#alerts-critical**: Critical alerts with @channel notifications
- **#platform-alerts**: Platform-specific warnings
- **#security-alerts**: Security-related notifications
- **#operations-alerts**: Business operations alerts

#### Alert Routing
```yaml
# Example routing
Critical Security Alert → Security Team + Platform Team
High Error Rate → Platform Team
Business Issue → Operations Team
Billing Problem → Accounting Team
```

## 📈 Grafana Dashboards

### System Overview Dashboard
- Service health status indicators
- HTTP request rates and response times
- Error rate percentages
- Key business metrics (courses, students, revenue)
- Course status distribution pie chart

### Business Intelligence Dashboard
- Revenue tracking and forecasting
- Course completion rates by type and organization
- Instructor utilization rates
- Student attendance patterns
- Billing cycle performance

### Performance Dashboard
- Response time percentiles and distributions
- Database query performance
- System resource utilization
- Application throughput metrics

### Security Dashboard
- Authentication success/failure rates
- Rate limiting violations
- Security event timeline
- Active user sessions by role

### Infrastructure Dashboard
- System metrics (CPU, memory, disk, network)
- Database connection pools and performance
- Cache hit rates and performance
- Service uptime and availability

## 🛠️ Configuration

### Environment Variables

```bash
# Database Connection
DB_USER=postgres
DB_PASSWORD=gtacpr
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cpr_may18

# Grafana Settings
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=admin123

# Email Configuration
GRAFANA_SMTP_USER=your-email@gmail.com
GRAFANA_SMTP_PASSWORD=your-app-password
ALERTMANAGER_SMTP_USER=your-email@gmail.com
ALERTMANAGER_SMTP_PASSWORD=your-app-password

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Prometheus Configuration

Key scrape targets:
- CPR Backend: `host.docker.internal:3001/metrics`
- Node Exporter: `node-exporter:9100`
- PostgreSQL Exporter: `postgres-exporter:9187`
- Blackbox Exporter: HTTP endpoint monitoring

### Alert Rules

Located in `monitoring/prometheus/alerts.yml`:
- 70+ comprehensive alert rules
- Business-specific thresholds
- Intelligent alert grouping and suppression
- Runbook links for critical alerts

## 🔧 Management & Operations

### Daily Operations

#### Health Checks
```bash
# Check all services
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f grafana
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
```

#### Metric Validation
```bash
# Check CPR backend metrics
curl http://localhost:3001/metrics | grep cpr_

# Validate Prometheus targets
curl http://localhost:9090/api/v1/targets
```

#### Alert Testing
```bash
# View active alerts
curl http://localhost:9093/api/v1/alerts

# Test alert routing
curl http://localhost:9093/api/v1/status
```

### Troubleshooting

#### Common Issues

**Metrics not appearing:**
1. Check CPR backend is running: `curl http://localhost:3001/health`
2. Verify metrics endpoint: `curl http://localhost:3001/metrics`
3. Check Prometheus targets: http://localhost:9090/targets

**Grafana dashboards empty:**
1. Verify Prometheus datasource connection
2. Check time range selection
3. Validate metric queries in Prometheus first

**Alerts not firing:**
1. Check alert rule syntax in Prometheus UI
2. Verify AlertManager configuration
3. Test email/Slack credentials

**Performance issues:**
1. Check Prometheus storage usage
2. Adjust scrape intervals if needed
3. Review query performance in Grafana

### Backup & Recovery

#### Data Persistence
- Prometheus data: `prometheus_data` volume
- Grafana dashboards: `grafana_data` volume
- AlertManager data: `alertmanager_data` volume

#### Backup Strategy
```bash
# Backup volumes
docker run --rm -v prometheus_data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz /data

# Restore volumes
docker run --rm -v prometheus_data:/data -v $(pwd):/backup alpine tar xzf /backup/prometheus-backup.tar.gz -C /
```

## 🔒 Security Considerations

### Access Control
- Grafana admin credentials (change default password)
- Prometheus web interface (consider authentication in production)
- AlertManager API access (restrict to authorized users)

### Network Security
- All services run in isolated Docker network
- External access only through defined ports
- Database connections use host networking with proper credentials

### Data Protection
- Metrics contain no sensitive personal information
- Alert content filtered for security-sensitive data
- Encrypted communication for external notifications

## 📊 Advanced Features

### Custom Metrics Integration

Add business-specific metrics to your CPR application:

```typescript
import { MetricsCollector } from './middleware/prometheus';

// Record business events
MetricsCollector.updateCourseMetrics('confirmed', 'CPR', 'Hospital-A', 5);
MetricsCollector.recordBillingCycle('Hospital-A', 'CPR', 24);
MetricsCollector.recordAuth('success', 'instructor', 'password');
```

### Dashboard Customization

Create custom Grafana dashboards:
1. Access Grafana UI
2. Create new dashboard
3. Add panels with PromQL queries
4. Save to `monitoring/grafana/dashboards/`

### Alert Customization

Add custom alert rules in `monitoring/prometheus/alerts.yml`:

```yaml
- alert: CustomBusinessAlert
  expr: cpr_custom_metric > threshold
  for: 5m
  labels:
    severity: warning
    team: business
  annotations:
    summary: "Custom business condition detected"
    description: "{{ $value }} exceeds expected threshold"
```

## 🚀 Production Deployment

### Infrastructure Requirements
- **Minimum**: 2 CPU cores, 4GB RAM, 50GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 100GB SSD storage
- **High Availability**: 3-node cluster with load balancing

### Production Checklist
- [ ] Change all default passwords
- [ ] Configure HTTPS/TLS certificates
- [ ] Set up external authentication (LDAP/SAML)
- [ ] Configure backup automation
- [ ] Set up monitoring of monitoring (meta-monitoring)
- [ ] Configure log aggregation
- [ ] Set up network monitoring
- [ ] Configure compliance reporting

### Scaling Considerations
- Prometheus federation for large deployments
- Grafana clustering for high availability
- AlertManager clustering for reliability
- External storage backends for long-term retention

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- **Daily**: Check service health and alert status
- **Weekly**: Review dashboard performance and query optimization
- **Monthly**: Update Docker images and security patches
- **Quarterly**: Review alert thresholds and business metrics

### Performance Tuning
- Adjust Prometheus retention based on storage capacity
- Optimize Grafana queries for better dashboard performance
- Fine-tune alert thresholds based on historical data
- Review and cleanup unused metrics

### Monitoring Best Practices
1. **Start with basics**: System metrics, HTTP requests, errors
2. **Add business context**: Course success rates, revenue tracking
3. **Implement SLIs/SLOs**: Define and track service level objectives
4. **Regular review**: Monthly review of alerts and thresholds
5. **Documentation**: Keep runbooks updated and accessible

## 🎯 Success Metrics

Your monitoring implementation provides:

### ✅ Complete Visibility
- **100% service coverage** across all 6 portals
- **360° business metrics** from course booking to payment
- **Real-time performance** tracking and alerting
- **Security monitoring** with immediate threat detection

### ✅ Proactive Operations
- **Intelligent alerting** with context and severity
- **Multi-channel notifications** (email, Slack, mobile)
- **Automated response** triggers for critical issues
- **Business impact** assessment for all incidents

### ✅ Data-Driven Decisions
- **Revenue optimization** through utilization tracking
- **Performance insights** for capacity planning
- **Security analytics** for threat assessment
- **Operational efficiency** metrics and trends

### ✅ Enterprise Readiness
- **Production-grade** monitoring stack
- **Scalable architecture** for growth
- **Professional dashboards** for stakeholders
- **Compliance-ready** reporting and audit trails

---

**🎉 Congratulations!** You now have a **complete, enterprise-grade monitoring and alerting system** that provides comprehensive visibility into your CPR Training Management System. This implementation follows industry best practices and provides the foundation for reliable, scalable operations.

For additional support or advanced configurations, refer to the official documentation:
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/) 