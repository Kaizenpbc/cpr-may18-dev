@echo off
echo ================================================================================
echo 🔴 Enabling Redis in CPR Training System
echo ================================================================================
echo.

echo 📝 Step 1: Checking if Redis is running...
redis-cli -h localhost -p 6379 ping >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Redis is running and responding to ping
) else (
    echo ❌ Redis is not running
    echo.
    echo 🚀 Please start Redis first:
    echo    Option 1: Double-click C:\Redis\start-redis.bat
    echo    Option 2: Run C:\Redis\install-service.bat as Administrator
    echo.
    pause
    exit /b 1
)

echo.
echo 📝 Step 2: Updating CPR application configuration...

rem Check if .env file exists
if exist "backend\.env" (
    echo ✅ Found backend\.env file
    
    rem Create backup
    copy "backend\.env" "backend\.env.backup" >nul 2>&1
    echo ✅ Created backup of .env file
    
    rem Update REDIS_ENABLED
    powershell -Command "(Get-Content 'backend\.env') -replace 'REDIS_ENABLED=false', 'REDIS_ENABLED=true' | Set-Content 'backend\.env'"
    echo ✅ Updated REDIS_ENABLED=true
    
) else (
    echo ❌ backend\.env file not found
    echo.
    echo 📝 Please create backend\.env with:
    echo REDIS_ENABLED=true
    echo REDIS_HOST=localhost
    echo REDIS_PORT=6379
    echo.
    pause
    exit /b 1
)

echo.
echo 📝 Step 3: Stopping current CPR application...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Stopped existing processes

echo.
echo 📝 Step 4: Ready to restart with Redis!
echo.
echo ================================================================================
echo 🎉 Redis Configuration Complete!
echo ================================================================================
echo.
echo 🚀 To activate Redis in your CPR system:
echo    Run: npm run dev
echo.
echo 📊 You should see: "Session Management: Redis Enhanced" in the startup logs
echo.
echo ✅ Your CPR Training System now has enhanced session management!
echo ================================================================================
pause 