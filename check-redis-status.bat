@echo off
echo ================================================================================
echo 🔍 Redis Installation Status Check
echo ================================================================================
echo.

echo 📂 Checking C:\Redis directory...
if exist "C:\Redis" (
    echo ✅ C:\Redis directory exists
) else (
    echo ❌ C:\Redis directory missing
    mkdir "C:\Redis"
    echo ✅ Created C:\Redis directory
)

echo.
echo 📋 Checking for Redis executable files...
echo.

if exist "C:\Redis\redis-server.exe" (
    echo ✅ redis-server.exe found
) else (
    echo ❌ redis-server.exe missing
)

if exist "C:\Redis\redis-cli.exe" (
    echo ✅ redis-cli.exe found
) else (
    echo ❌ redis-cli.exe missing
)

if exist "C:\Redis\redis-benchmark.exe" (
    echo ✅ redis-benchmark.exe found
) else (
    echo ❌ redis-benchmark.exe missing
)

echo.
echo 📊 Current contents of C:\Redis:
dir "C:\Redis" /b

echo.
if exist "C:\Redis\redis-server.exe" (
    echo ================================================================================
    echo 🎉 Redis Installation Complete!
    echo ================================================================================
    echo.
    echo ✅ All required Redis files are present
    echo 🚀 Ready to run: .\setup-redis.bat
    echo.
) else (
    echo ================================================================================
    echo 📥 Redis Installation Needed
    echo ================================================================================
    echo.
    echo ❌ Redis executable files are missing
    echo.
    echo 📋 Please:
    echo    1. Download: Redis-8.0.2-Windows-x64-msys2.zip
    echo    2. Extract ALL files to C:\Redis
    echo    3. Run this script again to verify
    echo.
    echo 🌐 Download from: https://github.com/redis-windows/redis-windows/releases/latest
    echo.
)

echo ================================================================================
pause 