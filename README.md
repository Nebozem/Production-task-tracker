# YAFI Task Tracker

Локальный task tracker для внутренней сети: администратор создаёт пользователей, назначает задачи и контролирует сроки, сотрудник работает со своими задачами и статусами.

---

## ⚡ БЫСТРЫЙ СТАРТ

### 🎯 Первый запуск на новом ПК

```bash
.\setup_project.bat
```
Это автоматически:
- Установит Python и Node.js зависимости
- Создаст виртуальное окружение
- Инициализирует базу данных
- Готово к использованию!

### 🚀 Обычный запуск

```bash
.\start_all.bat
```

Откроются 2 окна и браузер на http://localhost:5173

**Учётные данные админа:**
- Логин: `admin`
- Пароль: `admin123`

### 📚 Подробная инструкция
Смотрите [DEPLOYMENT.md](DEPLOYMENT.md) для полной инструкции по развёртыванию.

### 🔄 Полный сброс (если что-то сломалось)

```bash
.\reset_project.bat
```

### 📌 Ярлык на рабочем столе

```bash
.\create_desktop_shortcut.bat
```

Создаст ярлык для быстрого запуска с рабочего стола.

---

## 📚 Полная документация

Смотрите [QUICK_START.md](QUICK_START.md) для подробных инструкций.

---

## Что реализовано

- FastAPI backend с JWT-аутентификацией.
- Роли `admin` и `employee`.
- CRUD задач и пользователей.
- Теги, комментарии, статусы и приоритеты задач.
- Недельный календарь с задачами, которые растягиваются по диапазону `начало -> дедлайн`.
- React + Vite frontend, который в production раздаётся самим backend.
- SQLite для быстрого локального развёртывания.

## Стек

- Python, FastAPI, SQLAlchemy, Alembic
- SQLite
- React, TypeScript, Vite
- PowerShell / Windows scripts для локального деплоя

## Структура проекта

- `app/` - backend, API, модели, схемы и безопасность.
- `frontend/` - frontend на React/Vite.
- `alembic/` - миграции базы данных.
- `tests/` - backend-тесты.
- `deploy_local.ps1` - подготовка проекта к локальному развёртыванию.
- `start_all.bat` - запуск обоих сервисов.
- `setup_project.bat` - полная инициализация проекта.
- `reset_project.bat` - сброс базы данных.
- `setup_autostart.ps1` - регистрация автозапуска.
- `backup_db.ps1` - бэкап SQLite.

## Быстрый старт для разработки

```powershell
cd "C:\Users\Admin\Desktop\Менеджер задач"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
cd frontend
npm install
cd ..
```

### Запуск backend

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Запуск frontend

```powershell
cd frontend
npm run dev
```

### Production-сборка frontend

```powershell
cd frontend
npm run build
cd ..
```

После сборки backend раздаёт `frontend/dist` как статику по `/`.

### Быстрая подготовка локального релиза

```powershell
.\deploy_local.ps1
```

## Авторизация и роли

- Логин: `POST /auth/login`
- `admin`: управление пользователями и задачами
- `employee`: работа только со своими задачами
- Дефолтный администратор создаётся при первом запуске:
  - login: `admin`
  - password: `admin123`

## Основные API

- `GET/POST/PATCH/DELETE /tasks`
- `PATCH /tasks/{id}/status`
- `POST /tasks/{id}/comments`
- `GET /tasks/calendar?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`
- `GET/POST/PATCH /users`
- `GET/POST/PATCH/DELETE /tags`

## База данных

- Основная БД: `task_tracker.db`
- Тестовая БД: `test_task_tracker.db`
- ORM-модели: `app/models`
- Alembic: `alembic.ini`, `alembic/versions/0001_initial.py`
- Пример backend env: `.env.example`
- Пример frontend env: `frontend/.env.example`

Приложение на старте автоматически приводит старую SQLite-схему задачи к полям `starts_at` и `deadline`, чтобы сохранить совместимость с уже созданной базой.

## Тесты

```powershell
pytest -q
```

Покрыты сценарии:
- логин и роли
- admin-only управление пользователями
- создание задач, комментарии, статусы, календарная выборка

## Развёртывание в локальной сети

Краткая инструкция для администратора и начальника находится в [DEPLOY_LOCAL_NETWORK.md](</C:/Users/Admin/Desktop/Менеджер задач/DEPLOY_LOCAL_NETWORK.md>).