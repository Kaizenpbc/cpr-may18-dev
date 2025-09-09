#!/bin/sh
set -e

echo "🚀 Starting CPR Training System..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "✅ Database connection established"

# Wait for Redis to be ready (if enabled)
if [ "$REDIS_HOST" != "" ]; then
  echo "⏳ Waiting for Redis connection..."
  until redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping; do
    echo "Redis is unavailable - sleeping"
    sleep 2
  done
  echo "✅ Redis connection established"
fi

# Run database migrations if needed
echo "🔧 Running database setup..."
node backend/dist/scripts/setup-database.js

# Generate SSL certificates if they don't exist
if [ ! -f "/app/ssl/server.crt" ] || [ ! -f "/app/ssl/server.key" ]; then
  echo "🔐 Generating SSL certificates..."
  node backend/dist/scripts/generate-ssl-certs.js
fi

# Set proper permissions
chown -R cpr-app:nodejs /app/logs /app/ssl /app/backups

echo "🎉 Starting CPR Training System application..."

# Execute the main command
exec "$@"
