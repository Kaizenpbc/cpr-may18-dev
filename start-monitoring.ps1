# ===============================================
# CPR Training System - Monitoring Stack Startup (PowerShell)
# ===============================================

param(
    [switch]$SkipPrerequisites,
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"

if (-not $Quiet) {
    Write-Host "🚀 Starting CPR Training System Monitoring Stack..." -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
}

# ===============================================
# Check Prerequisites
# ===============================================
if (-not $SkipPrerequisites) {
    Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

    # Check if Docker is running
    try {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Docker is not running"
        }
    }
    catch {
        Write-Host "❌ Error: Docker is not running. Please start Docker and try again." -ForegroundColor Red
        exit 1
    }

    # Check if Docker Compose is available
    try {
        $composeVersion = docker-compose --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Docker Compose not found"
        }
    }
    catch {
        Write-Host "❌ Error: Docker Compose is not installed. Please install Docker Compose and try again." -ForegroundColor Red
        exit 1
    }

    # Check if monitoring configuration files exist
    if (-not (Test-Path "monitoring.env")) {
        Write-Host "❌ Error: monitoring.env file not found. Please copy from monitoring.env.example and configure." -ForegroundColor Red
        exit 1
    }

    if (-not (Test-Path "docker-compose.monitoring.yml")) {
        Write-Host "❌ Error: docker-compose.monitoring.yml file not found." -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Prerequisites check passed" -ForegroundColor Green
}

# ===============================================
# Load Environment Variables
# ===============================================
Write-Host "📋 Loading environment configuration..." -ForegroundColor Yellow

# Read environment file and set variables
Get-Content "monitoring.env" | Where-Object { $_ -match "^[^#].*=" } | ForEach-Object {
    $key, $value = $_ -split "=", 2
    [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
}

# ===============================================
# Create Required Directories
# ===============================================
Write-Host "📁 Creating required directories..." -ForegroundColor Yellow

$directories = @(
    "monitoring\prometheus\data",
    "monitoring\grafana\data",
    "monitoring\alertmanager\data"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Host "✅ Directories created" -ForegroundColor Green

# ===============================================
# Start Monitoring Stack
# ===============================================
Write-Host "🐳 Starting monitoring services..." -ForegroundColor Yellow
Write-Host "This may take a few minutes on first run (downloading Docker images)..." -ForegroundColor Gray

# Start services using environment file
try {
    $process = Start-Process -FilePath "docker-compose" -ArgumentList "--env-file", "monitoring.env", "-f", "docker-compose.monitoring.yml", "up", "-d" -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -ne 0) {
        throw "Docker Compose failed with exit code $($process.ExitCode)"
    }
}
catch {
    Write-Host "❌ Error starting monitoring services: $_" -ForegroundColor Red
    exit 1
}

# Wait for services to be ready
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# ===============================================
# Check Service Health
# ===============================================
Write-Host "🏥 Checking service health..." -ForegroundColor Yellow

# Function to check if a service is responding
function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [string]$Url,
        [int]$MaxAttempts = 30
    )
    
    Write-Host "   Checking $ServiceName..." -ForegroundColor Gray
    
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "   ✅ $ServiceName is ready" -ForegroundColor Green
                return $true
            }
        }
        catch {
            # Service not ready yet
        }
        
        if ($attempt -eq $MaxAttempts) {
            Write-Host "   ❌ $ServiceName failed to start (timeout)" -ForegroundColor Red
            return $false
        }
        
        Start-Sleep -Seconds 2
    }
    
    return $false
}

# Check each service
$services = @(
    @{ Name = "Prometheus"; Url = "http://localhost:9090/-/healthy" },
    @{ Name = "Grafana"; Url = "http://localhost:3000/api/health" },
    @{ Name = "AlertManager"; Url = "http://localhost:9093/-/healthy" }
)

$allHealthy = $true
foreach ($service in $services) {
    if (-not (Test-ServiceHealth -ServiceName $service.Name -Url $service.Url)) {
        $allHealthy = $false
    }
}

# ===============================================
# Display Service Information
# ===============================================
Write-Host ""
if ($allHealthy) {
    Write-Host "🎉 Monitoring Stack Started Successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Monitoring Stack Started (some services may need more time)" -ForegroundColor Yellow
}
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service URLs:" -ForegroundColor Cyan
Write-Host "   • Prometheus:   http://localhost:9090" -ForegroundColor White
Write-Host "   • Grafana:      http://localhost:3000" -ForegroundColor White
Write-Host "   • AlertManager: http://localhost:9093" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Default Credentials:" -ForegroundColor Cyan
Write-Host "   • Grafana: admin / admin123" -ForegroundColor White
Write-Host ""
Write-Host "📈 Key Features Available:" -ForegroundColor Cyan
Write-Host "   • System metrics (CPU, Memory, Disk)" -ForegroundColor White
Write-Host "   • Application metrics (HTTP requests, response times)" -ForegroundColor White
Write-Host "   • Business metrics (courses, students, revenue)" -ForegroundColor White
Write-Host "   • Database metrics (connections, query performance)" -ForegroundColor White
Write-Host "   • Security metrics (auth failures, rate limiting)" -ForegroundColor White
Write-Host "   • Custom alerts with email/Slack notifications" -ForegroundColor White
Write-Host ""
Write-Host "🛠️  Quick Actions:" -ForegroundColor Cyan
Write-Host "   • View logs:        docker-compose -f docker-compose.monitoring.yml logs -f" -ForegroundColor White
Write-Host "   • Stop monitoring:  docker-compose -f docker-compose.monitoring.yml down" -ForegroundColor White
Write-Host "   • Restart:          docker-compose -f docker-compose.monitoring.yml restart" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   • Prometheus queries: http://localhost:9090/graph" -ForegroundColor White
Write-Host "   • Grafana dashboards: http://localhost:3000/dashboards" -ForegroundColor White
Write-Host "   • Alert rules: http://localhost:9093/#/alerts" -ForegroundColor White
Write-Host ""

# ===============================================
# Check CPR Backend Metrics
# ===============================================
Write-Host "🔍 Checking CPR Backend metrics endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/metrics" -Method Get -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ CPR Backend metrics are available at http://localhost:3001/metrics" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️  CPR Backend metrics not available. Make sure the backend is running." -ForegroundColor Yellow
    Write-Host "   Start with: cd backend && npm run dev" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Monitoring stack is ready! Check the URLs above to get started." -ForegroundColor Green

# Open Grafana in default browser (optional)
if (-not $Quiet) {
    $openBrowser = Read-Host "Would you like to open Grafana in your browser? (y/N)"
    if ($openBrowser -match "^[Yy]") {
        Start-Process "http://localhost:3000"
    }
} 