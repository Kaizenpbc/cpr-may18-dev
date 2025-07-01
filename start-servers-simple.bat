@echo off
echo ========================================
echo   CPR Development Server Startup
echo ========================================
echo.

REM Kill any existing Node processes
echo [1/5] Cleaning up existing Node processes...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo    Killed existing Node processes
) else (
    echo    No Node processes found
)

REM Wait for processes to fully terminate
echo [2/5] Waiting for ports to clear...
timeout /t 3 /nobreak >nul

REM Check if ports are in use
echo [3/5] Checking port availability...
netstat -an | findstr ":3001" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo    Port 3001 is still in use - trying to kill process
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

netstat -an | findstr ":5173" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo    Port 5173 is still in use - trying to kill process
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

REM Start backend server
echo [4/5] Starting backend server...
start "Backend Server" cmd /k "cd backend && npm run dev"

REM Wait for backend to start
echo    Waiting for backend to start...
:wait_backend
timeout /t 1 /nobreak >nul
netstat -an | findstr ":3001" | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo    Still waiting for backend...
    goto wait_backend
)
echo    Backend server is running on port 3001

REM Start frontend server
echo [5/5] Starting frontend server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

REM Wait for frontend to start
echo    Waiting for frontend to start...
:wait_frontend
timeout /t 1 /nobreak >nul
netstat -an | findstr ":5173" | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo    Still waiting for frontend...
    goto wait_frontend
)
echo    Frontend server is running on port 5173

echo.
echo ========================================
echo   SERVERS STARTED SUCCESSFULLY!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo Health:   http://localhost:3001/api/v1/health
echo.
echo Press any key to exit this launcher...
echo (Servers will continue running in separate windows)
pause >nul 