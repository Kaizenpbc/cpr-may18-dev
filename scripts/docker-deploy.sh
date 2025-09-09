#!/bin/bash

# CPR Training System - Docker Deployment Script
set -e

echo "🚀 Deploying CPR Training System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"

if [ "$ENVIRONMENT" = "development" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
fi

print_status "Deploying to $ENVIRONMENT environment using $COMPOSE_FILE"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Check if environment file exists
if [ ! -f ".env" ] && [ ! -f ".env.$ENVIRONMENT" ]; then
    print_warning "No environment file found. Using default configuration."
    print_status "Copy config-templates/production.env.template to .env and configure it for production."
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down

# Pull latest images
print_status "Pulling latest images..."
docker-compose -f $COMPOSE_FILE pull

# Build and start services
print_status "Building and starting services..."
docker-compose -f $COMPOSE_FILE up -d --build

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check database
if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres -d cpr_may18 > /dev/null 2>&1; then
    print_success "Database is healthy"
else
    print_error "Database health check failed"
    exit 1
fi

# Check backend
if curl -f http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    print_success "Backend service is healthy"
else
    print_error "Backend service health check failed"
    exit 1
fi

# Show running containers
print_status "Running containers:"
docker-compose -f $COMPOSE_FILE ps

# Show logs
print_status "Recent logs:"
docker-compose -f $COMPOSE_FILE logs --tail=20

print_success "Deployment completed successfully!"
print_status "Application is available at:"
print_status "  - Backend API: http://localhost:3001"
print_status "  - Health Check: http://localhost:3001/api/v1/health"
if [ "$ENVIRONMENT" = "production" ]; then
    print_status "  - Nginx: http://localhost:80"
    print_status "  - Prometheus: http://localhost:9090"
    print_status "  - Grafana: http://localhost:3000"
fi

print_status "To view logs: docker-compose -f $COMPOSE_FILE logs -f"
print_status "To stop services: docker-compose -f $COMPOSE_FILE down"
