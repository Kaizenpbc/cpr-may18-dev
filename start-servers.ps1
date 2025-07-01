# CPR Development Server Startup Script
# This script ensures clean server restarts with port checking

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$Force
)

Write-Host "CPR Development Server Startup Script" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Function to check if a port is in use
function Test-PortInUse {
    param([int]$Port)
    
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    }
    catch {
        return $false
    }
}

# Function to kill processes on a specific port
function Stop-ProcessOnPort {
    param([int]$Port)
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
                    Where-Object { $_.State -eq "Listen" } | 
                    ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue }
        
        if ($processes) {
            Write-Host "Killing processes on port $Port..." -ForegroundColor Yellow
            $processes | Stop-Process -Force -ErrorAction SilentlyContinue
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

# Function to wait for port to be available
function Wait-ForPortAvailable {
    param([int]$Port, [int]$TimeoutSeconds = 10)
    
    Write-Host "Waiting for port $Port to be available..." -ForegroundColor Yellow
    $startTime = Get-Date
    $timeout = $startTime.AddSeconds($TimeoutSeconds)
    
    while ((Get-Date) -lt $timeout) {
        if (-not (Test-PortInUse -Port $Port)) {
            Write-Host "Port $Port is now available" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Milliseconds 500
    }
    
    Write-Host "Timeout waiting for port $Port to be available" -ForegroundColor Red
    return $false
}

# Function to start backend server
function Start-BackendServer {
    Write-Host "`nStarting Backend Server..." -ForegroundColor Green
    
    # Kill any existing Node processes
    Write-Host "Cleaning up existing Node processes..." -ForegroundColor Yellow
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "Killed $($nodeProcesses.Count) Node processes" -ForegroundColor Green
    }
    
    # Wait for ports to clear
    Write-Host "Waiting for ports to clear..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Check and clear port 3001
    if (Test-PortInUse -Port 3001) {
        Stop-ProcessOnPort -Port 3001
        if (-not (Wait-ForPortAvailable -Port 3001)) {
            Write-Host "Failed to clear port 3001" -ForegroundColor Red
            return $false
        }
    }
    
    # Start backend server
    Write-Host "Starting backend server on port 3001..." -ForegroundColor Green
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        Set-Location "backend"
        npm run dev
    }
    
    # Wait for backend to start
    Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
    $backendStarted = $false
    $timeout = (Get-Date).AddSeconds(30)
    
    while ((Get-Date) -lt $timeout) {
        if (Test-PortInUse -Port 3001) {
            $backendStarted = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    
    if ($backendStarted) {
        Write-Host "Backend server started successfully on port 3001" -ForegroundColor Green
        return $true
    } else {
        Write-Host "Backend server failed to start" -ForegroundColor Red
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
        return $false
    }
}

# Function to start frontend server
function Start-FrontendServer {
    Write-Host "`nStarting Frontend Server..." -ForegroundColor Green
    
    # Check and clear port 5173
    if (Test-PortInUse -Port 5173) {
        Stop-ProcessOnPort -Port 5173
        if (-not (Wait-ForPortAvailable -Port 5173)) {
            Write-Host "Failed to clear port 5173" -ForegroundColor Red
            return $false
        }
    }
    
    # Start frontend server
    Write-Host "Starting frontend server on port 5173..." -ForegroundColor Green
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        Set-Location "frontend"
        npm run dev
    }
    
    # Wait for frontend to start
    Write-Host "Waiting for frontend to start..." -ForegroundColor Yellow
    $frontendStarted = $false
    $timeout = (Get-Date).AddSeconds(30)
    
    while ((Get-Date) -lt $timeout) {
        if (Test-PortInUse -Port 5173) {
            $frontendStarted = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    
    if ($frontendStarted) {
        Write-Host "Frontend server started successfully on port 5173" -ForegroundColor Green
        return $true
    } else {
        Write-Host "Frontend server failed to start" -ForegroundColor Red
        Stop-Job $frontendJob -ErrorAction SilentlyContinue
        Remove-Job $frontendJob -ErrorAction SilentlyContinue
        return $false
    }
}

# Function to show server status
function Show-ServerStatus {
    Write-Host "`nServer Status:" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan
    
    $backendStatus = if (Test-PortInUse -Port 3001) { "Running" } else { "Stopped" }
    $frontendStatus = if (Test-PortInUse -Port 5173) { "Running" } else { "Stopped" }
    
    Write-Host "Backend  (Port 3001): $backendStatus" -ForegroundColor White
    Write-Host "Frontend (Port 5173): $frontendStatus" -ForegroundColor White
    
    if ((Test-PortInUse -Port 3001) -and (Test-PortInUse -Port 5173)) {
        Write-Host "`nBoth servers are running!" -ForegroundColor Green
        Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
        Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
        Write-Host "Health:   http://localhost:3001/api/v1/health" -ForegroundColor Cyan
    }
}

# Main execution
try {
    # Check if we're in the right directory
    if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
        Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
        exit 1
    }
    
    # Show current status
    Show-ServerStatus
    
    # Determine what to start
    $startBackend = $true
    $startFrontend = $true
    
    if ($BackendOnly) {
        $startFrontend = $false
    }
    if ($FrontendOnly) {
        $startBackend = $false
    }
    
    # Start servers
    $success = $true
    
    if ($startBackend) {
        if (-not (Start-BackendServer)) {
            $success = $false
        }
    }
    
    if ($startFrontend -and $success) {
        # Wait a bit for backend to fully initialize
        Start-Sleep -Seconds 2
        
        if (-not (Start-FrontendServer)) {
            $success = $false
        }
    }
    
    # Final status
    Start-Sleep -Seconds 2
    Show-ServerStatus
    
    if ($success) {
        Write-Host "`nServer startup completed successfully!" -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
    } else {
        Write-Host "`nServer startup failed!" -ForegroundColor Red
        exit 1
    }
    
    # Keep script running and handle cleanup
    try {
        while ($true) {
            Start-Sleep -Seconds 1
        }
    }
    catch {
        Write-Host "`nShutting down servers..." -ForegroundColor Yellow
        Get-Job | Stop-Job -ErrorAction SilentlyContinue
        Get-Job | Remove-Job -ErrorAction SilentlyContinue
        Write-Host "Servers stopped" -ForegroundColor Green
    }
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 