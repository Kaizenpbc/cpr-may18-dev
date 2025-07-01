@echo off
echo Starting CPR Development Servers...
echo.

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo Error: PowerShell is not available
    pause
    exit /b 1
)

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "start-servers.ps1" %*

REM If the script exits with an error, pause so user can see the message
if errorlevel 1 (
    echo.
    echo Script failed with error code %errorlevel%
    pause
) 