# Stop Grafana container
docker stop cpr-grafana

# Remove Grafana container
docker rm cpr-grafana

# Remove Grafana volume
docker volume rm cpr-grafana-data

# Start Grafana container
docker-compose -f docker-compose.monitoring.yml up -d grafana

Write-Host "Grafana admin user has been reset. Please wait a few moments for Grafana to start up."
Write-Host "You can now login with:"
Write-Host "Username: admin"
Write-Host "Password: admin123" 