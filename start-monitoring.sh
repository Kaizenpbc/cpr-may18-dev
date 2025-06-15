#!/bin/bash

# ===============================================
# CPR Training System - Monitoring Stack Startup
# ===============================================

set -e  # Exit on any error

echo "🚀 Starting CPR Training System Monitoring Stack..."
echo "=================================================="

# ===============================================
# Check Prerequisites
# ===============================================
echo "🔍 Checking prerequisites..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Error: Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Check if monitoring configuration files exist
if [ ! -f "monitoring.env" ]; then
    echo "❌ Error: monitoring.env file not found. Please copy from monitoring.env.example and configure."
    exit 1
fi

if [ ! -f "docker-compose.monitoring.yml" ]; then
    echo "❌ Error: docker-compose.monitoring.yml file not found."
    exit 1
fi

echo "✅ Prerequisites check passed"

# ===============================================
# Load Environment Variables
# ===============================================
echo "📋 Loading environment configuration..."
set -a  # Automatically export all variables
source monitoring.env
set +a

# ===============================================
# Create Required Directories
# ===============================================
echo "📁 Creating required directories..."
mkdir -p monitoring/prometheus/data
mkdir -p monitoring/grafana/data  
mkdir -p monitoring/alertmanager/data

# Set proper permissions for Grafana
if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "win32" ]]; then
    sudo chown -R 472:472 monitoring/grafana/data 2>/dev/null || echo "⚠️  Warning: Could not set Grafana permissions (may require manual setup)"
fi

echo "✅ Directories created"

# ===============================================
# Start Monitoring Stack
# ===============================================
echo "🐳 Starting monitoring services..."
echo "This may take a few minutes on first run (downloading Docker images)..."

# Use environment file and start services
docker-compose --env-file monitoring.env -f docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# ===============================================
# Check Service Health
# ===============================================
echo "🏥 Checking service health..."

# Function to check if a service is responding
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    echo "   Checking $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo "   ✅ $service_name is ready"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo "   ❌ $service_name failed to start (timeout)"
            return 1
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
}

# Check each service
check_service "Prometheus" "http://localhost:9090/-/healthy"
check_service "Grafana" "http://localhost:3000/api/health"
check_service "AlertManager" "http://localhost:9093/-/healthy"

# ===============================================
# Display Service Information
# ===============================================
echo ""
echo "🎉 Monitoring Stack Started Successfully!"
echo "========================================="
echo ""
echo "📊 Service URLs:"
echo "   • Prometheus:   http://localhost:9090"
echo "   • Grafana:      http://localhost:3000"
echo "   • AlertManager: http://localhost:9093"
echo ""
echo "🔑 Default Credentials:"
echo "   • Grafana: admin / admin123"
echo ""
echo "📈 Key Features Available:"
echo "   • System metrics (CPU, Memory, Disk)"
echo "   • Application metrics (HTTP requests, response times)"
echo "   • Business metrics (courses, students, revenue)"
echo "   • Database metrics (connections, query performance)"
echo "   • Security metrics (auth failures, rate limiting)"
echo "   • Custom alerts with email/Slack notifications"
echo ""
echo "🛠️  Quick Actions:"
echo "   • View logs:        docker-compose -f docker-compose.monitoring.yml logs -f"
echo "   • Stop monitoring:  docker-compose -f docker-compose.monitoring.yml down"
echo "   • Restart:          docker-compose -f docker-compose.monitoring.yml restart"
echo ""
echo "📚 Documentation:"
echo "   • Prometheus queries: http://localhost:9090/graph"
echo "   • Grafana dashboards: http://localhost:3000/dashboards"
echo "   • Alert rules: http://localhost:9093/#/alerts"
echo ""

# ===============================================
# Check CPR Backend Metrics
# ===============================================
echo "🔍 Checking CPR Backend metrics endpoint..."
if curl -s -f "http://localhost:3001/metrics" > /dev/null 2>&1; then
    echo "✅ CPR Backend metrics are available at http://localhost:3001/metrics"
else
    echo "⚠️  CPR Backend metrics not available. Make sure the backend is running."
    echo "   Start with: cd backend && npm run dev"
fi

echo ""
echo "✅ Monitoring stack is ready! Check the URLs above to get started." 