# YAFI Task Tracker

Локальный task tracker для внутренней сети: администратор создаёт пользователей, назначает задачи и контролирует сроки, сотрудник работает со своими задачами и статусами.

---

## ⚡ Быстрая подготовка на новом ПК

### Требования
- Windows
- Python 3.11+
- Node.js LTS

### Проверка установок
```powershell
python --version
node --version
```

### Первичная инициализация
Из корня проекта выполните:
```powershell
setup_project.bat
```

Этот скрипт автоматически:
- создает виртуальное окружение `.venv`
- устанавливает Python-зависимости из `requirements.txt`
- устанавливает npm-пакеты для фронтенда
- собирает фронтенд в `frontend/dist`
- запускает миграции базы данных
- создает `.env` из `.env.example`, если файла нет

### Запуск приложения
```powershell
start_all.bat
```

После запуска приложение будет доступно на:
- Фронтенд: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Документация OpenAPI: `http://localhost:8000/docs`

**Учётные данные администратора:**
- Логин: `admin`
- Пароль: `admin123`

---

## 🧰 Утилиты
- `setup_project.bat` — полная инициализация проекта на новом ПК
- `start_all.bat` — запускает backend и frontend в отдельных окнах
- `start_backend.bat` — запускает только backend
- `reset_project.bat` — удаляет базу данных и создает её заново
- `backup_db.ps1` — создает копию `task_tracker.db` в папке `backups`
- `setup_autostart.ps1` — регистрирует автозагрузку через Планировщик задач
- `create_desktop_shortcut.bat` — создает ярлык на рабочем столе для `start_all.bat`

---

## 🚀 Быстрый запуск
```powershell
cd "C:\Users\Admin\Desktop\Менеджер задач"
setup_project.bat
start_all.bat
```

### Ручной запуск backend
```powershell
.\.venv\Scripts\activate.bat
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Ручной запуск frontend
```powershell
cd frontend
npm run dev
```

### Пересборка frontend
```powershell
cd frontend
npm run build
cd ..
```

Если вы перестроите фронтенд, backend автоматически отдаёт `frontend/dist` как статику.

---

## 📦 Структура проекта
- `app/` — backend, API, модели, схемы и безопасность
- `frontend/` — React + Vite frontend
- `alembic/` — миграции базы данных
- `tests/` — backend-тесты
- `.env.example` — пример конфигурации

---

## 🧪 Тесты
```powershell
pytest -q
```

---

## 🌐 Локальная сеть и доступ из других компьютеров
Чтобы открыть доступ из сети:
1. Узнайте IP машины: `ipconfig`
2. Откройте порт `8000` в фаерволе:
```powershell
netsh advfirewall firewall add rule name="TaskTracker8000" dir=in action=allow protocol=TCP localport=8000
```
3. Передайте адрес:
`http://<IP_машины>:8000`

Для автозапуска используйте:
```powershell
.
setup_autostart.ps1
```

---

## ℹ️ Примечания
- Основная база: `task_tracker.db`
- Тестовая база: `test_task_tracker.db`
- Приложение автоматически создаёт дефолтного администратора на первом старте
- В текущем варианте приложение рассчитано на локальную сеть и SQLite

---

## 📝 Процесс деплоя с нового ПК
1. Установить Python и Node.js
2. Клонировать репозиторий
3. Запустить `setup_project.bat`
4. Запустить `start_all.bat`
5. Открыть `http://localhost:5173`

Если требуется сброс данных:
```powershell
reset_project.bat
```

Если требуется резервная копия базы:
```powershell
backup_db.ps1
```
