@echo off
setlocal enabledelayedexpansion

set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo Starting backend...
start "Backend - Task Tracker" cmd /k "cd /d "%PROJECT_DIR%" && python -m uvicorn app.main:app --reload"

timeout /t 5 /nobreak

echo Starting frontend...
start "Frontend - Task Tracker" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

timeout /t 8 /nobreak

echo Opening browser...
start http://localhost:5173

echo.
echo ========================================
echo Application started successfully!
echo ========================================
echo.
echo Web UI:
echo    http://localhost:5173
echo.
echo API documentation:
echo    http://localhost:8000/docs
echo.
echo Default credentials:
echo    Login: admin
echo    Password: admin123
echo.
echo Close both windows (Backend and Frontend) to stop.
echo.
timeout /t 60 /nobreak
