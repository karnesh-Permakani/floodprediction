@echo off
echo ==========================================
echo   FLOOD GUARD TN - SYSTEM STARTUP
echo ==========================================
echo.
echo Stopping old processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM py.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting Backend API (Port 5000)...
cd /d "%~dp0backend"
start "Flood Guard - Backend API" cmd /k "py app.py"

echo Starting User Dashboard (Port 5173)...
cd /d "%~dp0user-dashboard"
start "Flood Guard - User Dashboard" cmd /k "npm run dev -- --port 5173 --host"

echo Starting Admin Dashboard (Port 5174)...
cd /d "%~dp0admin-dashboard"
start "Flood Guard - Admin Dashboard" cmd /k "npm run dev -- --port 5174 --host"

echo Starting Unified Portal (Port 3000)...
cd /d "%~dp0portal"
start "Flood Guard - Unified Portal" cmd /k "py -m http.server 3000"

echo.
echo Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

echo Opening Unified Portal...
start http://localhost:3000

echo.
echo All systems started! You can close this window now.
pause
