from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.api.auth import router as auth_router
from app.api.tags import router as tags_router
from app.api.tasks import router as tasks_router
from app.api.users import router as users_router
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.user import User, UserRole

app = FastAPI(title="Task Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
app.include_router(tasks_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(tags_router)


def _ensure_default_admin() -> None:
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.login == "admin").first()
        if not admin:
            db.add(
                User(
                    login="admin",
                    password_hash=hash_password("admin123"),
                    role=UserRole.admin,
                )
            )
            db.commit()
    finally:
        db.close()


_ensure_default_admin()


def _ensure_task_datetime_columns() -> None:
    inspector = inspect(engine)
    task_columns = {column["name"] for column in inspector.get_columns("tasks")}
    table_names = set(inspector.get_table_names())

    with engine.begin() as connection:
        if "starts_at" not in task_columns:
            connection.execute(text("ALTER TABLE tasks ADD COLUMN starts_at DATETIME"))
        if "task_assignees" not in table_names:
            connection.execute(
                text(
                    """
                    CREATE TABLE task_assignees (
                        task_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        PRIMARY KEY (task_id, user_id),
                        FOREIGN KEY(task_id) REFERENCES tasks (id) ON DELETE CASCADE,
                        FOREIGN KEY(user_id) REFERENCES users (id)
                    )
                    """
                )
            )
        connection.execute(
            text(
                """
                UPDATE tasks
                SET deadline = deadline || ' 18:00:00'
                WHERE deadline IS NOT NULL AND length(deadline) = 10
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT OR IGNORE INTO task_assignees (task_id, user_id)
                SELECT id, assigned_to
                FROM tasks
                WHERE assigned_to IS NOT NULL
                """
            )
        )
        connection.execute(
            text(
                """
                UPDATE tasks
                SET starts_at = substr(deadline, 1, 10) || ' 09:00:00'
                WHERE starts_at IS NULL AND deadline IS NOT NULL
                """
            )
        )


_ensure_task_datetime_columns()

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
