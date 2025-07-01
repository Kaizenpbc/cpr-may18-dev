$body = @{
    username = "instructor"
    password = "test123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body
    Write-Host "✅ Login successful!"
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "❌ Login failed:"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    Write-Host "Message: $($_.Exception.Message)"
} 