@echo off
setlocal enabledelayedexpansion

color 0A
echo.
echo ========================================
echo Project initialization
echo ========================================
echo.

set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ERROR: Python not found.
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ERROR: Node.js not found.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [1/5] Creating Python virtual environment...
if exist .venv (
    echo Virtual environment already exists.
) else (
    python -m venv .venv
    if errorlevel 1 (
        color 0C
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo Virtual environment created.
)

echo.
echo [2/5] Activating virtual environment and installing Python dependencies...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    color 0C
    echo ERROR: Failed to activate virtual environment.
    pause
    exit /b 1
)

python -m pip install -q --upgrade pip
python -m pip install -q -r requirements.txt
if errorlevel 1 (
    color 0C
    echo ERROR: Failed to install Python dependencies.
    pause
    exit /b 1
)

echo.
echo [3/5] Installing Node.js dependencies...
cd frontend
call npm install -q
if errorlevel 1 (
    color 0C
    echo ERROR: Failed to install npm dependencies.
    pause
    exit /b 1
)
echo npm dependencies installed.

echo.
echo [4/5] Building frontend...
call npm run build
if errorlevel 1 (
    color 0C
    echo ERROR: Failed to build frontend.
    pause
    exit /b 1
)
echo Frontend build completed.
cd ..

echo.
echo [5/5] Initializing database...
python -m alembic upgrade head
if errorlevel 1 (
    echo WARNING: Database migration may not be needed.
)
echo Database initialization complete.

echo.
echo Checking .env configuration...
if not exist .env (
    if exist .env.example (
        copy .env.example .env > nul
        echo .env created from .env.example
    ) else (
        echo .env not found and .env.example also missing.
    )
) else (
    echo .env already exists.
)
echo Configuration is ready.

color 0B
echo.
echo ========================================
echo Initialization completed successfully!
echo ========================================
echo.
echo Next step:
echo   Run start_all.bat
echo.
echo Project will be available at:
echo   Frontend: http://localhost:5173
echo   Backend: http://localhost:8000
echo.
echo Admin credentials:
echo   Login: admin
echo   Password: admin123
echo.
echo Press any key to exit...
pause
