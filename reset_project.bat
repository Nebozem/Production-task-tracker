@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

color 0C
echo.
echo ========================================
echo 🔄 ПОЛНЫЙ СБРОС ПРОЕКТА
echo ========================================
echo.
echo ⚠  Это удалит:
echo   - Базу данных
echo   - Все задачи и пользователи
echo   - Все теги и комментарии
echo.

set /p confirm="Вы уверены? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo Операция отменена.
    timeout /t 3
    exit /b 0
)

set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo.
echo [1/3] Удаление базы данных...
if exist task_tracker.db (
    del task_tracker.db
    echo ✓ База данных удалена
) else (
    echo ✓ База данных не найдена (или уже удалена)
)

if exist test_task_tracker.db (
    del test_task_tracker.db
    echo ✓ Тестовая база данных удалена
)

echo.
echo [2/3] Активация Python окружения...
call .venv\Scripts\activate.bat

echo.
echo [3/3] Пересоздание базы данных...
python -m alembic upgrade head
python -c "from app.main import _ensure_default_admin; _ensure_default_admin()"

if errorlevel 1 (
    color 0B
    echo ✓ База данных пересоздана (с миграциями или без)
) else (
    color 0B
    echo ✓ База данных пересоздана
)

echo.
echo ========================================
echo ✅ СБРОС ЗАВЕРШЁН!
echo ========================================
echo.
echo 📝 Новые учётные данные админа:
echo   Логин: admin
echo   Пароль: admin123
echo.
echo Запустите: start_all.bat
echo.
timeout /t 10
