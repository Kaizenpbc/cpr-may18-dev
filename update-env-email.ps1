# PowerShell script to add email configuration to existing .env file

Write-Host "=== Adding Email Configuration to .env File ===" -ForegroundColor Green

$envPath = "backend\.env"

# Check if .env file exists
if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found at: $envPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found .env file at: $envPath" -ForegroundColor Green

# Email configuration to add
$emailConfig = @"

# =============================================
# EMAIL CONFIGURATION
# =============================================
# Gmail SMTP Configuration (Recommended for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@gtacpr.com

# Alternative: SendGrid Configuration (Recommended for production)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=apikey
# SMTP_PASS=your-sendgrid-api-key
# SMTP_FROM=your-verified-email@yourdomain.com
"@

# Check if email config already exists
$existingContent = Get-Content $envPath -Raw
if ($existingContent -match "SMTP_HOST") {
    Write-Host "⚠️  Email configuration already exists in .env file" -ForegroundColor Yellow
    Write-Host "Please manually update the SMTP settings in the file." -ForegroundColor Yellow
} else {
    # Add email configuration to the end of the file
    Add-Content -Path $envPath -Value $emailConfig
    Write-Host "✅ Email configuration added to .env file" -ForegroundColor Green
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Edit the .env file and replace placeholder values:" -ForegroundColor White
Write-Host "   - your-email@gmail.com → Your actual Gmail address" -ForegroundColor White
Write-Host "   - your-app-password → Your Gmail App Password" -ForegroundColor White
Write-Host "   - noreply@gtacpr.com → Your preferred from address" -ForegroundColor White
Write-Host ""
Write-Host "2. For Gmail App Password:" -ForegroundColor White
Write-Host "   - Go to Google Account Settings → Security" -ForegroundColor White
Write-Host "   - Enable 2-Step Verification if not already enabled" -ForegroundColor White
Write-Host "   - Go to 'App passwords'" -ForegroundColor White
Write-Host "   - Select 'Mail' and generate a password" -ForegroundColor White
Write-Host ""
Write-Host "3. Restart the backend server to load new environment variables" -ForegroundColor White
Write-Host "   cd backend && npm run dev" -ForegroundColor White 