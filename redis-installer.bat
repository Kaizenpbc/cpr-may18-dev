@echo off
echo ================================================================================
echo 🔴 Redis for Windows - Automated Installer
echo ================================================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Running as Administrator
) else (
    echo ❌ Please run as Administrator to install Redis
    echo Right-click and select "Run as Administrator"
    pause
    exit /b 1
)

echo 📝 Creating Redis directory...
if not exist "C:\Redis" mkdir "C:\Redis"
cd /d "C:\Redis"

echo 🌐 Downloading Redis for Windows...
echo Please download Redis manually from:
echo https://github.com/redis-windows/redis-windows/releases/latest
echo.
echo 📋 Instructions:
echo 1. Download: Redis-8.0.2-Windows-x64-msys2.zip
echo 2. Extract to: C:\Redis
echo 3. Run this script again after extraction
echo.

REM Check if Redis is already extracted
if exist "redis-server.exe" (
    echo ✅ Redis found! Configuring...
    goto :configure
) else (
    echo ⏸️ Please extract Redis files to C:\Redis and run this script again
    pause
    exit /b 0
)

:configure
echo 🔧 Configuring Redis...

REM Create Redis configuration
echo # Redis Configuration for CPR Training System > redis.conf
echo port 6379 >> redis.conf
echo bind 127.0.0.1 >> redis.conf
echo save 900 1 >> redis.conf
echo save 300 10 >> redis.conf
echo save 60 10000 >> redis.conf
echo rdbcompression yes >> redis.conf
echo dbfilename dump.rdb >> redis.conf
echo dir ./ >> redis.conf
echo maxmemory 256mb >> redis.conf
echo maxmemory-policy allkeys-lru >> redis.conf

REM Create start script
echo @echo off > start-redis.bat
echo echo Starting Redis Server... >> start-redis.bat
echo redis-server.exe redis.conf >> start-redis.bat

REM Create service installer (optional)
echo @echo off > install-service.bat
echo echo Installing Redis as Windows Service... >> install-service.bat
echo sc create Redis binpath= "C:\Redis\redis-server.exe C:\Redis\redis.conf" start= auto >> install-service.bat
echo echo Service installed. Starting... >> install-service.bat
echo net start Redis >> install-service.bat

echo ✅ Redis configuration complete!
echo.
echo 🚀 To start Redis:
echo    Option 1: Double-click start-redis.bat
echo    Option 2: Run install-service.bat as Administrator (for auto-start)
echo.
echo 🔧 Next steps for your CPR app:
echo    1. Start Redis server
echo    2. Set REDIS_ENABLED=true in your .env file
echo    3. Restart your application
echo.
pause 