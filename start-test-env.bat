@echo off
echo ========================================
echo Starting CPR Test Environment
echo ========================================

echo.
echo [1/4] Setting up environment variables...
set NODE_ENV=test
set PORT=3002
set FRONTEND_PORT=5174
set DB_NAME_TEST=cpr_jun21_test

echo.
echo [2/4] Starting Test Backend Server (Port 3002)...
cd backend
start "Test Backend" cmd /k "npm run dev:test"

echo.
echo [3/4] Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo [4/4] Starting Test Frontend Server (Port 5174)...
cd ..\frontend
start "Test Frontend" cmd /k "npm run dev:test"

echo.
echo ========================================
echo Test Environment Started Successfully!
echo ========================================
echo.
echo Backend: http://localhost:3002
echo Frontend: http://localhost:5174
echo Test Database: cpr_jun21_test
echo.
echo Development Environment remains unchanged:
echo - Backend: http://localhost:3001
echo - Frontend: http://localhost:5173
echo - Database: cpr_jun21
echo.
pause 