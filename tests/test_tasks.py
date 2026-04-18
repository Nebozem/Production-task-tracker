import os

from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_task_tracker.db"

from app.main import app  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402

client = TestClient(app)


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.add(
        User(
            login="admin",
            password_hash=hash_password("admin123"),
            role=UserRole.admin,
        )
    )
    db.add(
        User(
            login="worker",
            password_hash=hash_password("worker123"),
            role=UserRole.employee,
        )
    )
    db.commit()
    db.close()


def _token(login: str, password: str) -> str:
    response = client.post("/auth/login", data={"username": login, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_admin_can_create_user() -> None:
    token = _token("admin", "admin123")
    response = client.post(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
        json={"login": "new_employee", "password": "newpass123", "role": "employee"},
    )
    assert response.status_code == 201
    assert response.json()["login"] == "new_employee"


def test_employee_cannot_create_user() -> None:
    token = _token("worker", "worker123")
    response = client.post(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
        json={"login": "bad", "password": "badpass123", "role": "employee"},
    )
    assert response.status_code == 403


def test_task_flow_with_comments_and_calendar() -> None:
    admin_token = _token("admin", "admin123")

    users = client.get("/users", headers={"Authorization": f"Bearer {admin_token}"}).json()
    worker_id = next(user["id"] for user in users if user["login"] == "worker")

    create_task_response = client.post(
        "/tasks",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Подготовить отчёт",
            "description": "Финальная версия",
            "starts_at": "2026-04-18T09:00:00",
            "deadline": "2026-04-20T18:00:00",
            "assigned_to": worker_id,
            "tags": ["отчёт", "важно"],
            "stages": [{"title": "Черновик", "order_index": 1}],
        },
    )
    assert create_task_response.status_code == 201
    task_id = create_task_response.json()["id"]

    worker_token = _token("worker", "worker123")
    comment_response = client.post(
        f"/tasks/{task_id}/comments",
        headers={"Authorization": f"Bearer {worker_token}"},
        json={"text": "Черновик готов"},
    )
    assert comment_response.status_code == 200
    assert len(comment_response.json()["comments"]) == 1

    status_response = client.patch(
        f"/tasks/{task_id}/status",
        headers={"Authorization": f"Bearer {worker_token}"},
        json={"status": "completed"},
    )
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "completed"

    calendar_response = client.get(
        "/tasks/calendar?date_from=2026-04-01&date_to=2026-04-30",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert calendar_response.status_code == 200
    assert len(calendar_response.json()) == 1
