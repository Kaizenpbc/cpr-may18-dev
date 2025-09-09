# Production Monitoring & Alerting Guide

This guide covers the comprehensive monitoring and alerting system for the CPR Training System in production.

## 🚀 Overview

The monitoring system provides real-time visibility into application performance, security events, and system health through Prometheus metrics collection, Grafana dashboards, and Alertmanager notifications.

## 📊 Monitoring Stack

### Core Components

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and notifications
- **Node Exporter**: System metrics collection
- **PostgreSQL Exporter**: Database metrics
- **Redis Exporter**: Cache metrics
- **Nginx Exporter**: Web server metrics

### Application Metrics

- **Request Rate**: HTTP requests per second
- **Response Time**: API response times (50th, 95th, 99th percentiles)
- **Error Rate**: 4xx and 5xx error rates
- **Security Events**: Authentication, suspicious activity, rate limiting
- **Database Performance**: Connection pools, query performance
- **Cache Performance**: Redis memory usage, hit rates

## 🎯 Key Metrics

### Application Health

```promql
# Application uptime
up{job="cpr-backend"}

# Request rate
rate(http_requests_total{job="cpr-backend"}[5m])

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="cpr-backend"}[5m]))

# Error rate
rate(http_requests_total{job="cpr-backend",status=~"5.."}[5m])
```

### Security Metrics

```promql
# Failed login attempts
rate(security_events_total{event_type="failed_login"}[5m])

# Suspicious requests
rate(security_events_total{event_type="suspicious_request"}[5m])

# Rate limiting events
rate(security_events_total{event_type="rate_limit_exceeded"}[5m])
```

### System Metrics

```promql
# CPU usage
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100
```

## 🚨 Alerting Rules

### Critical Alerts

- **Application Down**: Backend service unavailable
- **High Error Rate**: >10% error rate for 5 minutes
- **Database Connection Issues**: >80% connection pool usage
- **Disk Space Low**: <10% disk space remaining
- **SSL Certificate Expiring**: <30 days until expiry

### Warning Alerts

- **High Response Time**: >2s average response time
- **High CPU Usage**: >80% CPU utilization
- **High Memory Usage**: >80% memory utilization
- **Slow Database Queries**: >0.1 slow queries per second
- **High Failed Logins**: >10 failed logins per second

### Security Alerts

- **Suspicious Activity**: >5 suspicious requests per second
- **Rate Limiting**: >20 rate limit events per second
- **Authentication Failures**: Multiple failed login attempts
- **API Security Events**: Invalid API keys, oversized requests

## 📈 Dashboards

### Production Dashboard

**URL**: `http://localhost:3000/d/cpr-production`

**Panels**:
- Application Health Overview
- Request Rate and Response Time
- Error Rate and Database Connections
- Redis Memory Usage
- System CPU and Memory Usage
- Disk Usage

### Security Dashboard

**URL**: `http://localhost:3000/d/cpr-security`

**Panels**:
- Security Events Overview
- Failed Login Attempts
- Suspicious Requests
- Rate Limiting Events
- Authentication Events
- API Security Events
- SSL/TLS Health
- Security Risk Score

## 🔔 Notification Channels

### Email Notifications

- **Critical Alerts**: `admin@cpr-training-system.com`
- **Warning Alerts**: `team@cpr-training-system.com`
- **Security Alerts**: `security@cpr-training-system.com`

### Slack Integration

- **Critical Alerts**: `#alerts-critical`
- **Warning Alerts**: `#alerts-warning`
- **Security Alerts**: `#security-alerts`

### PagerDuty Integration

- **Security Alerts**: Automatic escalation to on-call engineer

## 🛠️ Configuration

### Prometheus Configuration

**File**: `docker/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "cpr-backend"
    static_configs:
      - targets: ["cpr-backend:3001"]
    metrics_path: "/api/v1/metrics"
    scrape_interval: 30s
```

### Alertmanager Configuration

**File**: `docker/alertmanager/alertmanager.yml`

```yaml
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
```

### Grafana Configuration

**File**: `docker/grafana/provisioning/datasources/prometheus.yml`

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

## 🚀 Getting Started

### 1. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose up -d prometheus grafana alertmanager

# Start exporters
docker-compose up -d node-exporter postgres-exporter redis-exporter nginx-exporter
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

### 3. Import Dashboards

1. Open Grafana at http://localhost:3000
2. Login with admin/admin
3. Go to Dashboards → Import
4. Upload the dashboard JSON files:
   - `docker/grafana/provisioning/dashboards/cpr-dashboard.json`
   - `docker/grafana/provisioning/dashboards/security-dashboard.json`

### 4. Configure Alerts

1. Open Alertmanager at http://localhost:9093
2. Verify alert rules are loaded
3. Test alert notifications
4. Configure notification channels (email, Slack, PagerDuty)

## 📊 Custom Metrics

### Application Metrics

The CPR Training System exposes custom metrics at `/api/v1/metrics`:

```typescript
// Example custom metric
const requestCounter = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status', 'endpoint']
});

const responseTimeHistogram = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});
```

### Security Metrics

```typescript
// Security event counter
const securityEventCounter = new prometheus.Counter({
  name: 'security_events_total',
  help: 'Total number of security events',
  labelNames: ['event_type', 'severity', 'source']
});

// Security risk score gauge
const securityRiskScore = new prometheus.Gauge({
  name: 'security_risk_score',
  help: 'Current security risk score (0-100)',
  labelNames: ['component']
});
```

## 🔧 Maintenance

### Regular Tasks

- **Daily**: Review alert notifications and dashboard metrics
- **Weekly**: Check for new security events and performance trends
- **Monthly**: Review and update alert thresholds
- **Quarterly**: Update monitoring configuration and dashboards

### Troubleshooting

#### Prometheus Issues

```bash
# Check Prometheus status
docker-compose logs prometheus

# Verify targets are being scraped
curl http://localhost:9090/api/v1/targets

# Check alert rules
curl http://localhost:9090/api/v1/rules
```

#### Grafana Issues

```bash
# Check Grafana logs
docker-compose logs grafana

# Verify datasource connection
curl http://localhost:3000/api/datasources
```

#### Alertmanager Issues

```bash
# Check Alertmanager status
docker-compose logs alertmanager

# Verify alert configuration
curl http://localhost:9093/api/v1/status
```

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Node Exporter Documentation](https://github.com/prometheus/node_exporter)
- [PostgreSQL Exporter Documentation](https://github.com/prometheus-community/postgres_exporter)

## 🆘 Support

### Getting Help

- **Documentation**: Check this guide and inline code comments
- **Logs**: Review container logs for error messages
- **Metrics**: Check Prometheus targets and Grafana datasources
- **Alerts**: Verify alert rules and notification channels

### Emergency Procedures

- **Critical Alert**: Review logs and check system resources
- **Dashboard Down**: Restart Grafana container
- **Metrics Missing**: Check Prometheus targets and exporters
- **Alerts Not Working**: Verify Alertmanager configuration

---

For additional support or questions about monitoring and alerting, please refer to the project documentation or contact the development team.
