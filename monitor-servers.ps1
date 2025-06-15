# Monitor both frontend and backend servers
$backendUrl = "http://localhost:3001/api/v1/health"
$frontendUrl = "http://localhost:5173"

Write-Host "🚀 Starting server monitoring..." -ForegroundColor Green
Write-Host "Backend URL: $backendUrl" -ForegroundColor Cyan
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host "----------------------------------------"

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    # Check backend
    try {
        $backendResponse = Invoke-WebRequest -Uri $backendUrl -Method GET -UseBasicParsing
        Write-Host "[$timestamp] ✅ Backend is running" -ForegroundColor Green
    } catch {
        Write-Host "[$timestamp] ❌ Backend is down: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Check frontend
    try {
        $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -Method GET -UseBasicParsing
        Write-Host "[$timestamp] ✅ Frontend is running" -ForegroundColor Green
    } catch {
        Write-Host "[$timestamp] ❌ Frontend is down: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "----------------------------------------"
    Start-Sleep -Seconds 5
} 