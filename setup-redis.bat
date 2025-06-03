@echo off
echo ================================================================================
echo 🔴 Redis Setup for CPR Training System
echo ================================================================================
echo.

echo 📝 Step 1: Creating Redis directory...
if not exist "C:\Redis" (
    mkdir "C:\Redis"
    echo ✅ Created C:\Redis directory
) else (
    echo ✅ C:\Redis directory already exists
)

echo.
echo 📋 Step 2: Checking for Redis files...
if exist "C:\Redis\redis-server.exe" (
    echo ✅ Redis files found in C:\Redis
    goto :configure
) else (
    echo ❌ Redis files not found
    echo.
    echo 📥 Please:
    echo 1. Download Redis-8.0.2-Windows-x64-msys2.zip
    echo 2. Extract ALL files to C:\Redis
    echo 3. Run this script again
    echo.
    echo 🌐 Download from: https://github.com/redis-windows/redis-windows/releases/latest
    pause
    exit /b 1
)

:configure
echo.
echo 🔧 Step 3: Copying optimized configuration...
copy "%~dp0redis-cpr-config.conf" "C:\Redis\redis.conf" >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Configuration file copied
) else (
    echo ⚠️ Using default configuration
)

echo.
echo 🚀 Step 4: Creating startup scripts...

rem Create Redis startup script
echo @echo off > "C:\Redis\start-redis.bat"
echo echo Starting Redis for CPR Training System... >> "C:\Redis\start-redis.bat"
echo echo Redis will run on localhost:6379 >> "C:\Redis\start-redis.bat"
echo echo. >> "C:\Redis\start-redis.bat"
echo redis-server.exe redis.conf >> "C:\Redis\start-redis.bat"

rem Create Redis service installer
echo @echo off > "C:\Redis\install-service.bat"
echo echo Installing Redis as Windows Service... >> "C:\Redis\install-service.bat"
echo sc create RedisForCPR binpath= "C:\Redis\redis-server.exe C:\Redis\redis.conf" start= auto >> "C:\Redis\install-service.bat"
echo echo Redis service installed. Starting... >> "C:\Redis\install-service.bat"
echo net start RedisForCPR >> "C:\Redis\install-service.bat"

rem Create test script
echo @echo off > "C:\Redis\test-redis.bat"
echo echo Testing Redis connection... >> "C:\Redis\test-redis.bat"
echo redis-cli.exe ping >> "C:\Redis\test-redis.bat"
echo pause >> "C:\Redis\test-redis.bat"

echo ✅ Startup scripts created

echo.
echo ================================================================================
echo 🎉 Redis Setup Complete!
echo ================================================================================
echo.
echo 🚀 To start Redis:
echo    Option 1: Double-click C:\Redis\start-redis.bat
echo    Option 2: Run C:\Redis\install-service.bat as Administrator (auto-start)
echo.
echo 🧪 To test Redis:
echo    Double-click C:\Redis\test-redis.bat
echo.
echo 🔧 Next steps for your CPR application:
echo    1. Start Redis server (Option 1 or 2 above)
echo    2. Update your .env file: REDIS_ENABLED=true
echo    3. Restart your CPR application
echo.
echo ✅ Your enhanced session management will then be active!
echo ================================================================================
pause 