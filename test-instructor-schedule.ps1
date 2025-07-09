# Test Instructor Schedule Endpoint with PowerShell
# This script provides a quick way to test the instructor schedule endpoint on Windows

Write-Host "🧪 Testing Instructor Schedule Endpoint with PowerShell" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Base URL
$BASE_URL = "http://localhost:3001/api/v1"

# Step 1: Login to get token
Write-Host "`n1. 🔐 Logging in as instructor..." -ForegroundColor Yellow

$loginBody = @{
    username = "instructor"
    password = "test123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.accessToken
    
    if (-not $token) {
        Write-Host "❌ Failed to get access token" -ForegroundColor Red
        Write-Host "Login response: $($loginResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Green
    Write-Host "User ID: $($loginResponse.data.user.id)" -ForegroundColor Green
    Write-Host "Username: $($loginResponse.data.user.username)" -ForegroundColor Green
    Write-Host "Role: $($loginResponse.data.user.role)" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

# Step 2: Test schedule endpoint
Write-Host "`n2. 📋 Testing GET /instructor/schedule..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $scheduleResponse = Invoke-RestMethod -Uri "$BASE_URL/instructor/schedule" -Method GET -Headers $headers
    Write-Host "✅ Schedule endpoint successful" -ForegroundColor Green
    Write-Host "Total classes: $($scheduleResponse.data.Count)" -ForegroundColor Green
    
    # Display first few classes
    if ($scheduleResponse.data.Count -gt 0) {
        Write-Host "`nFirst 3 classes:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(3, $scheduleResponse.data.Count); $i++) {
            $class = $scheduleResponse.data[$i]
            Write-Host "  Class $($i + 1):" -ForegroundColor Cyan
            Write-Host "    ID: $($class.id)" -ForegroundColor White
            Write-Host "    Course: $($class.course_name)" -ForegroundColor White
            Write-Host "    Date: $($class.date)" -ForegroundColor White
            Write-Host "    Status: $($class.status)" -ForegroundColor White
            Write-Host "    Location: $($class.location)" -ForegroundColor White
        }
        
        # Show statistics
        $statusCounts = $scheduleResponse.data | Group-Object status | ForEach-Object { "$($_.Name): $($_.Count)" }
        Write-Host "`nStatus breakdown: $($statusCounts -join ', ')" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Schedule endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Test without authentication (should fail)
Write-Host "`n3. 🚨 Testing without authentication (should fail)..." -ForegroundColor Yellow

try {
    Invoke-RestMethod -Uri "$BASE_URL/instructor/schedule" -Method GET -ContentType "application/json"
    Write-Host "❌ Should have failed without authentication" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Properly rejects unauthenticated requests (401)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Unexpected error without auth: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# Step 4: Test with invalid token (should fail)
Write-Host "`n4. 🚨 Testing with invalid token (should fail)..." -ForegroundColor Yellow

$invalidHeaders = @{
    "Authorization" = "Bearer invalid-token"
    "Content-Type" = "application/json"
}

try {
    Invoke-RestMethod -Uri "$BASE_URL/instructor/schedule" -Method GET -Headers $invalidHeaders
    Write-Host "❌ Should have failed with invalid token" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Properly rejects invalid token (401)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Unexpected error with invalid token: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# Step 5: Performance test
Write-Host "`n5. ⚡ Performance testing..." -ForegroundColor Yellow

$startTime = Get-Date
$performanceResults = @()

for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/instructor/schedule" -Method GET -Headers $headers
        $performanceResults += $response.data.Count
    } catch {
        Write-Host "❌ Performance test request $i failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

$endTime = Get-Date
$avgResponseTime = ($endTime - $startTime).TotalMilliseconds / 5

if ($performanceResults.Count -gt 0) {
    Write-Host "✅ Performance test completed" -ForegroundColor Green
    Write-Host "Average response time: $([Math]::Round($avgResponseTime, 2))ms" -ForegroundColor Green
    Write-Host "All requests returned $($performanceResults[0]) classes" -ForegroundColor Green
} else {
    Write-Host "❌ Performance test failed" -ForegroundColor Red
}

Write-Host "`n🎉 PowerShell testing completed!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan 