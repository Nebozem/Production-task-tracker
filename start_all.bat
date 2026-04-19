@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

REM Получаем директорию скрипта
set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

REM Запуск бэкенда в новом окне
echo Запуск бэкенда...
start "Backend - Task Tracker" cmd /k "cd /d "%PROJECT_DIR%" && python -m uvicorn app.main:app --reload"

REM Задержка чтобы бэкенд успел стартовать
timeout /t 5 /nobreak

REM Запуск фронтенда в новом окне
echo Запуск фронтенда...
start "Frontend - Task Tracker" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

REM Дополнительная задержка и открытие браузера
timeout /t 8 /nobreak

echo Открытие браузера...
start http://localhost:5173

echo.
echo ========================================
echo ✅ ПРИЛОЖЕНИЕ ЗАПУЩЕНО!
echo ========================================
echo.
echo 🌐 Откройте в браузере:
echo    http://localhost:5173
echo.
echo 📚 API документация:
echo    http://localhost:8000/docs
echo.
echo 🔐 Учётные данные по умолчанию:
echo    Логин: admin
echo    Пароль: admin123
echo.
echo ⏹  Для остановки закройте оба окна (Backend и Frontend)
echo.
timeout /t 60 /nobreak
