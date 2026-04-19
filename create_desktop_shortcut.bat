@echo off
chcp 65001 > nul

setlocal enabledelayedexpansion

REM Получаем пути
set PROJECT_DIR=%~dp0
set DESKTOP_PATH=%USERPROFILE%\Desktop

REM Создаём ярлык для быстрого старта
echo Creating shortcut on Desktop...

REM Используем PowerShell для создания ярлыка (более надёжно)
powershell -Command ^
"$shell = New-Object -ComObject WScript.Shell; " ^
"$shortcut = $shell.CreateShortcut('%DESKTOP_PATH%\🚀 Task Manager.lnk'); " ^
"$shortcut.TargetPath = '%PROJECT_DIR%start_all.bat'; " ^
"$shortcut.WorkingDirectory = '%PROJECT_DIR%'; " ^
"$shortcut.Description = 'Быстрый запуск менеджера задач'; " ^
"$shortcut.Save()"

if errorlevel 1 (
    echo ❌ Ошибка при создании ярлыка
    timeout /t 5
    exit /b 1
)

echo ✅ Ярлык "🚀 Task Manager.lnk" создан на рабочем столе!
echo.
echo Теперь вы можете запускать проект двойным нажатием на ярлык
echo.
timeout /t 5
