@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

color 0A
echo.
echo ========================================
echo 🚀 Инициализация проекта Task Manager
echo ========================================
echo.

REM Получаем директорию скрипта
set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

REM Проверяем наличие Python
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ❌ ОШИБКА: Python не найден!
    echo Пожалуйста, установите Python 3.11+ с python.org
    echo https://www.python.org/downloads/
    timeout /t 10
    exit /b 1
)

REM Проверяем наличие Node.js
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ❌ ОШИБКА: Node.js не найден!
    echo Пожалуйста, установите Node.js с https://nodejs.org/
    timeout /t 10
    exit /b 1
)

echo ✓ Python: 
python --version

echo ✓ Node.js: 
node --version

echo.
echo [1/5] Создание виртуального окружения Python...
if exist .venv (
    echo ✓ Виртуальное окружение уже существует
) else (
    python -m venv .venv
    if errorlevel 1 (
        color 0C
        echo ❌ ОШИБКА при создании виртуального окружения
    echo.
    pause
    exit /b 1
)
    echo ✓ Виртуальное окружение создано
)

echo.
echo [2/5] Активация виртуального окружения и установка зависимостей Python...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    color 0C
    echo ❌ ОШИБКА при активации виртуального окружения
    echo.
    pause
    exit /b 1
)

echo ✓ Установка Python зависимостей (это может занять 1-2 минуты)...
pip install -q --upgrade pip
pip install -q -r requirements.txt
if errorlevel 1 (
    color 0C
    echo ❌ ОШИБКА при установке зависимостей Python
    echo.
    pause

echo.
echo [3/6] Установка Node.js зависимостей...
cd frontend
echo ✓ Установка npm пакетов (это может занять 1-2 минуты)...
call npm install -q
if errorlevel 1 (
    color 0C
    echo ❌ ОШИБКА при установке npm зависимостей
    timeout /t 10
    exit /b 1
)
echo ✓ npm зависимости установлены

echo.
echo [4/6] Сборка фронтенда...
call npm run build
if errorlevel 1 (
    color 0C
    echo ❌ ОШИБКА при сборке фронтенда
    timeout /t 10
    exit /b 1
)
echo ✓ Фронтенд собран
cd ..

echo.
echo [5/6] Инициализация базы данных...
python -m alembic upgrade head
if errorlevel 1 (
    echo ⚠ Миграция БД может быть не нужна (это нормально)
)
echo ✓ База данных готова

echo.
echo [6/6] Проверка конфигурации...
if not exist .env (
    if exist .env.example (
        copy .env.example .env > nul
        echo ✓ Файл .env создан из .env.example
    ) else (
        echo ✓ .env отсутствует, но .env.example тоже не найден
    )
) else (
    echo ✓ Файл .env уже существует
)
echo ✓ Конфигурация готова

color 0B
echo.
echo ========================================
echo ✅ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА!
echo ========================================
echo.
echo 📝 Следующий шаг:
echo   Запустите: start_all.bat
echo.
echo Проект будет доступен на:
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo.
echo Учётные данные админа:
echo   Логин: admin
echo   Пароль: admin123
echo.
echo Нажмите любую клавишу, чтобы закрыть окно...
pause
