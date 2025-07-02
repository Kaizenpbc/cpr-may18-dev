# Email Setup Script for CPR Training System
# This script helps configure email functionality

Write-Host "=== Email Configuration Setup ===" -ForegroundColor Green
Write-Host "This script will help you configure email functionality for the CPR Training System." -ForegroundColor Yellow
Write-Host ""

# Ask for email provider preference
Write-Host "Choose your email provider:" -ForegroundColor Cyan
Write-Host "1. Gmail (Recommended for development)"
Write-Host "2. SendGrid (Recommended for production)"
Write-Host "3. Outlook/Hotmail"
Write-Host "4. Custom SMTP"
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

$smtpConfig = @{}

switch ($choice) {
    "1" {
        Write-Host "`n=== Gmail Configuration ===" -ForegroundColor Green
        Write-Host "Note: You'll need to use an App Password, not your regular Gmail password." -ForegroundColor Yellow
        Write-Host "To create an App Password:" -ForegroundColor Yellow
        Write-Host "1. Go to your Google Account settings"
        Write-Host "2. Enable 2-Step Verification if not already enabled"
        Write-Host "3. Go to Security > App passwords"
        Write-Host "4. Generate a new app password for 'Mail'"
        Write-Host ""
        
        $smtpConfig.HOST = "smtp.gmail.com"
        $smtpConfig.PORT = "587"
        $smtpConfig.SECURE = "false"
        $smtpConfig.USER = Read-Host "Enter your Gmail address"
        $smtpConfig.PASS = Read-Host "Enter your Gmail App Password" -AsSecureString
        $smtpConfig.FROM = Read-Host "Enter from email address (or press Enter for default)" 
        if ([string]::IsNullOrEmpty($smtpConfig.FROM)) {
            $smtpConfig.FROM = "noreply@gtacpr.com"
        }
    }
    "2" {
        Write-Host "`n=== SendGrid Configuration ===" -ForegroundColor Green
        Write-Host "You'll need a SendGrid API key from your SendGrid account." -ForegroundColor Yellow
        Write-Host ""
        
        $smtpConfig.HOST = "smtp.sendgrid.net"
        $smtpConfig.PORT = "587"
        $smtpConfig.SECURE = "false"
        $smtpConfig.USER = "apikey"
        $smtpConfig.PASS = Read-Host "Enter your SendGrid API Key" -AsSecureString
        $smtpConfig.FROM = Read-Host "Enter from email address (must be verified in SendGrid)"
    }
    "3" {
        Write-Host "`n=== Outlook/Hotmail Configuration ===" -ForegroundColor Green
        Write-Host ""
        
        $smtpConfig.HOST = "smtp-mail.outlook.com"
        $smtpConfig.PORT = "587"
        $smtpConfig.SECURE = "false"
        $smtpConfig.USER = Read-Host "Enter your Outlook/Hotmail email address"
        $smtpConfig.PASS = Read-Host "Enter your password" -AsSecureString
        $smtpConfig.FROM = Read-Host "Enter from email address (or press Enter to use your email)"
        if ([string]::IsNullOrEmpty($smtpConfig.FROM)) {
            $smtpConfig.FROM = $smtpConfig.USER
        }
    }
    "4" {
        Write-Host "`n=== Custom SMTP Configuration ===" -ForegroundColor Green
        Write-Host ""
        
        $smtpConfig.HOST = Read-Host "Enter SMTP host"
        $smtpConfig.PORT = Read-Host "Enter SMTP port (default: 587)"
        if ([string]::IsNullOrEmpty($smtpConfig.PORT)) {
            $smtpConfig.PORT = "587"
        }
        $smtpConfig.SECURE = Read-Host "Use SSL/TLS? (true/false, default: false)"
        if ([string]::IsNullOrEmpty($smtpConfig.SECURE)) {
            $smtpConfig.SECURE = "false"
        }
        $smtpConfig.USER = Read-Host "Enter SMTP username"
        $smtpConfig.PASS = Read-Host "Enter SMTP password" -AsSecureString
        $smtpConfig.FROM = Read-Host "Enter from email address"
    }
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpConfig.PASS)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Create .env file content
$envContent = @"
# Email Configuration
SMTP_HOST=$($smtpConfig.HOST)
SMTP_PORT=$($smtpConfig.PORT)
SMTP_SECURE=$($smtpConfig.SECURE)
SMTP_USER=$($smtpConfig.USER)
SMTP_PASS=$plainPassword
SMTP_FROM=$($smtpConfig.FROM)

# Other existing environment variables (if any) should be preserved
"@

# Save to .env file
$envPath = "backend\.env"
$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host "`n=== Configuration Saved ===" -ForegroundColor Green
Write-Host "Email configuration has been saved to: $envPath" -ForegroundColor Yellow
Write-Host ""

# Test configuration
Write-Host "Would you like to test the email configuration? (y/n)" -ForegroundColor Cyan
$testChoice = Read-Host

if ($testChoice -eq "y" -or $testChoice -eq "Y") {
    Write-Host "`n=== Testing Email Configuration ===" -ForegroundColor Green
    
    # Load environment variables
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    
    # Create a simple test script
    $testScript = @"
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function testEmail() {
    try {
        console.log('Testing email configuration...');
        
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: '$($smtpConfig.USER)',
            subject: 'CPR Training System - Email Test',
            html: '<h2>Email Test Successful!</h2><p>Your email configuration is working correctly.</p>',
        });
        
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
    }
}

testEmail();
"@

    $testScriptPath = "test-email-config.js"
    $testScript | Out-File -FilePath $testScriptPath -Encoding UTF8
    
    Write-Host "Running email test..." -ForegroundColor Yellow
    node $testScriptPath
    
    # Clean up test file
    Remove-Item $testScriptPath -ErrorAction SilentlyContinue
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "To use email functionality:" -ForegroundColor Yellow
Write-Host "1. Restart your backend server" -ForegroundColor White
Write-Host "2. The email service will automatically use the new configuration" -ForegroundColor White
Write-Host "3. You can test email templates through the API endpoints" -ForegroundColor White
Write-Host ""
Write-Host "Email templates available:" -ForegroundColor Cyan
Write-Host "- Course assignment notifications" -ForegroundColor White
Write-Host "- Class scheduling confirmations" -ForegroundColor White
Write-Host "- Invoice reminders" -ForegroundColor White
Write-Host "- Course completion notifications" -ForegroundColor White 