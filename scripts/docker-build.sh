#!/bin/bash

# CPR Training System - Docker Build Script
set -e

echo "🐳 Building CPR Training System Docker Images..."

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

# Build the application
print_status "Building CPR Training System application..."
docker build -t cpr-training-system:latest .

if [ $? -eq 0 ]; then
    print_success "Docker image built successfully!"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Build with specific tags
print_status "Tagging images for production..."
docker tag cpr-training-system:latest cpr-training-system:$(date +%Y%m%d-%H%M%S)
docker tag cpr-training-system:latest cpr-training-system:production

print_success "Docker images tagged successfully!"

# Show image information
print_status "Docker image information:"
docker images | grep cpr-training-system

print_success "Docker build completed successfully!"
print_status "You can now run the application with: docker-compose up -d"
