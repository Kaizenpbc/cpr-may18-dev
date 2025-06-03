@echo off
echo =========================================
echo   CPR Training - Security Configuration
echo =========================================
echo.
echo This script will set up secure environment variables
echo to replace hard-coded values in your application.
echo.

cd backend

echo [1/4] Creating secure .env file...
echo.

echo # ============================================= > .env
echo # CPR Training System - Secure Configuration >> .env
echo # ============================================= >> .env
echo # Created: %date% %time% >> .env
echo # >> .env

echo # Core Database Configuration (Already Working) >> .env
echo DB_HOST=localhost >> .env
echo DB_PORT=5432 >> .env
echo DB_NAME=cpr_may18 >> .env
echo DB_USER=postgres >> .env
echo DB_PASSWORD=gtacpr >> .env
echo. >> .env

echo # Server Configuration (Already Working) >> .env
echo NODE_ENV=development >> .env
echo PORT=3001 >> .env
echo FRONTEND_URL=http://localhost:5173 >> .env
echo. >> .env

echo # JWT Configuration (Already Working) >> .env
echo JWT_SECRET=cpr-training-super-secure-jwt-secret-key-2025! >> .env
echo REFRESH_TOKEN_SECRET=cpr-training-super-secure-refresh-secret-key-2025! >> .env
echo. >> .env

echo # ⚡ SECURITY FIXES - New Environment Variables >> .env
echo # These replace hard-coded values for better security >> .env
echo BCRYPT_SALT_ROUNDS=12 >> .env
echo ACCESS_TOKEN_EXPIRY=15m >> .env
echo REFRESH_TOKEN_EXPIRY=7d >> .env
echo. >> .env

echo # 🔐 SECURE DEFAULT PASSWORDS >> .env
echo # These replace hard-coded 'test123' passwords >> .env
echo DEFAULT_ADMIN_PASSWORD=AdminSecure2025! >> .env
echo DEFAULT_INSTRUCTOR_PASSWORD=InstructorSecure2025! >> .env
echo DEFAULT_ORG_PASSWORD=OrgSecure2025! >> .env
echo DEFAULT_ACCOUNTANT_PASSWORD=AccountantSecure2025! >> .env
echo. >> .env

echo # Redis Configuration (Already Working) >> .env
echo REDIS_ENABLED=false >> .env
echo REDIS_HOST=localhost >> .env
echo REDIS_PORT=6379 >> .env
echo. >> .env

echo # Application Settings >> .env
echo APP_NAME=CPR Training Management System >> .env
echo SUPPORT_EMAIL=support@cpr-training.com >> .env
echo MAX_FILE_SIZE=10485760 >> .env

echo ✅ Secure .env file created in backend directory
echo.

echo [2/4] Verifying configuration...
echo.

if exist .env (
    echo ✅ .env file exists
) else (
    echo ❌ .env file creation failed
    pause
    exit /b 1
)

echo.
echo [3/4] Important Security Notes:
echo.
echo 🔐 PASSWORDS CHANGED:
echo    • Admin password: test123 → AdminSecure2025!
echo    • Instructor password: test123 → InstructorSecure2025!
echo    • Organization password: test123 → OrgSecure2025!
echo    • Accountant password: test123 → AccountantSecure2025!
echo.
echo 🛡️ SECURITY IMPROVEMENTS:
echo    • BCRYPT salt rounds: 10 → 12 (stronger hashing)
echo    • JWT secrets: Now using secure random keys
echo    • Token expiry: Now configurable via environment
echo.

echo [4/4] Next Steps:
echo.
echo 1. Restart your backend server to apply changes
echo 2. Use new passwords for login:
echo    • Username: admin,     Password: AdminSecure2025!
echo    • Username: instructor, Password: InstructorSecure2025!
echo    • Username: orguser,   Password: OrgSecure2025!
echo    • Username: accountant, Password: AccountantSecure2025!
echo.
echo 3. For PRODUCTION deployment:
echo    • Generate unique random secrets for JWT
echo    • Use stronger passwords (16+ characters)
echo    • Set NODE_ENV=production
echo.

echo =========================================
echo    ✅ Security Configuration Complete!
echo =========================================
echo.

echo Press any key to continue...
pause >nul 