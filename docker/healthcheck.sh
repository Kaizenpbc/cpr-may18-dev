#!/bin/sh

# Health check script for CPR Training System
HEALTH_URL="http://localhost:${PORT:-3001}/api/v1/health"

# Check if the application is responding
if curl -f -s "$HEALTH_URL" > /dev/null; then
    echo "✅ Health check passed"
    exit 0
else
    echo "❌ Health check failed"
    exit 1
fi
