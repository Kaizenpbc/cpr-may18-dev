#!/bin/bash

# Stop Grafana container
docker stop cpr-grafana

# Remove Grafana container
docker rm cpr-grafana

# Remove Grafana volume
docker volume rm cpr-grafana-data

# Start Grafana container
docker-compose -f docker-compose.monitoring.yml up -d grafana

echo "Grafana admin user has been reset. Please wait a few moments for Grafana to start up."
echo "You can now login with:"
echo "Username: admin"
echo "Password: admin123" 