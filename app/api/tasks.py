from datetime import date, datetime, time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.task import Tag, Task, TaskComment, TaskStage
from app.models.user import User, UserRole
from app.schemas.tasks import (
    CommentCreate,
    StageCreate,
    StageUpdate,
    TagInfo,
    TaskCreate,
    TaskRead,
    TaskStatusUpdate,
    TaskUpdate,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_has_access(task: Task, user_id: int) -> bool:
    if task.assigned_to == user_id:
        return True
    return any(assignee.id == user_id for assignee in task.assignees)


def _resolve_assignees(db: Session, assignee_ids: list[int]) -> list[User]:
    if not assignee_ids:
        return []
    unique_ids = list(dict.fromkeys(assignee_ids))
    return db.query(User).filter(User.id.in_(unique_ids), User.role == UserRole.employee).all()


def _to_task_read(task: Task) -> TaskRead:
    assignee_logins = [user.login for user in task.assignees]
    assignee_ids = [user.id for user in task.assignees]
    return TaskRead(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        starts_at=task.starts_at,
        deadline=task.deadline,
        created_at=task.created_at,
        updated_at=task.updated_at,
        created_by=task.created_by,
        assigned_to=task.assigned_to,
        assigned_to_login=task.assignee.login if task.assignee else None,
        assigned_user_ids=assignee_ids,
        assigned_user_logins=assignee_logins,
        tags=[TagInfo.model_validate(tag) for tag in task.tags],
        stages=task.stages,
        comments=task.comments,
    )


@router.get("", response_model=list[TaskRead])
def get_tasks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status_filter: str | None = Query(default=None, alias="status"),
    assigned_to: int | None = None,
    deadline_from: date | None = None,
    deadline_to: date | None = None,
) -> list[TaskRead]:
    query = db.query(Task).options(
        joinedload(Task.tags),
        joinedload(Task.stages),
        joinedload(Task.comments),
        joinedload(Task.assignees),
    )
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if assigned_to is not None and current_user.role == UserRole.admin:
        query = query.filter((Task.assigned_to == assigned_to) | Task.assignees.any(User.id == assigned_to))
    if deadline_from:
        query = query.filter(Task.deadline >= datetime.combine(deadline_from, time.min))
    if deadline_to:
        query = query.filter(Task.deadline <= datetime.combine(deadline_to, time.max))
    tasks = query.order_by(Task.created_at.desc()).all()
    if current_user.role == UserRole.employee:
        tasks = [task for task in tasks if _task_has_access(task, current_user.id)]
    return [_to_task_read(task) for task in tasks]


@router.get("/calendar", response_model=list[TaskRead])
def calendar_tasks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    date_from: date,
    date_to: date,
) -> list[TaskRead]:
    window_start = datetime.combine(date_from, time.min)
    window_end = datetime.combine(date_to, time.max)
    query = db.query(Task).options(
        joinedload(Task.tags),
        joinedload(Task.stages),
        joinedload(Task.comments),
        joinedload(Task.assignees),
    )
    query = query.filter(
        Task.deadline.is_not(None),
        Task.deadline >= window_start,
        Task.starts_at.is_not(None),
        Task.starts_at <= window_end,
    )
    tasks = query.order_by(Task.starts_at.asc(), Task.deadline.asc()).all()
    if current_user.role == UserRole.employee:
        tasks = [task for task in tasks if _task_has_access(task, current_user.id)]
    return [_to_task_read(task) for task in tasks]


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def add_task(
    payload: TaskCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskRead:
    tags: list[Tag] = []
    for tag_name in payload.tags:
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            db.add(tag)
        tags.append(tag)
    assignee_ids = payload.assigned_user_ids or ([payload.assigned_to] if payload.assigned_to is not None else [])
    assignees = _resolve_assignees(db, assignee_ids)
    task = Task(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        starts_at=payload.starts_at,
        deadline=payload.deadline,
        created_by=current_user.id,
        assigned_to=assignees[0].id if assignees else payload.assigned_to,
        assignees=assignees,
        tags=tags,
    )
    db.add(task)
    db.flush()
    for stage in payload.stages:
        db.add(TaskStage(task_id=task.id, title=stage.title, order_index=stage.order_index))
    db.commit()
    db.refresh(task)
    return _to_task_read(task)


@router.get("/{task_id}", response_model=TaskRead)
def read_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskRead:
    task = db.query(Task).options(
        joinedload(Task.tags),
        joinedload(Task.stages),
        joinedload(Task.comments),
        joinedload(Task.assignees),
    ).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if current_user.role == UserRole.employee and not _task_has_access(task, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to task")
    return _to_task_read(task)


@router.patch("/{task_id}", response_model=TaskRead, dependencies=[Depends(require_admin)])
def edit_task(task_id: int, payload: TaskUpdate, db: Annotated[Session, Depends(get_db)]) -> TaskRead:
    task = db.query(Task).options(
        joinedload(Task.tags),
        joinedload(Task.stages),
        joinedload(Task.comments),
        joinedload(Task.assignees),
    ).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.status is not None:
        task.status = payload.status
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.starts_at is not None:
        task.starts_at = payload.starts_at
    if payload.deadline is not None:
        task.deadline = payload.deadline
    if payload.assigned_user_ids is not None:
        assignees = _resolve_assignees(db, payload.assigned_user_ids)
        task.assignees = assignees
        task.assigned_to = assignees[0].id if assignees else None
    elif payload.assigned_to is not None:
        assignees = _resolve_assignees(db, [payload.assigned_to])
        task.assignees = assignees
        task.assigned_to = assignees[0].id if assignees else payload.assigned_to
    if payload.tags is not None:
        tags: list[Tag] = []
        for tag_name in payload.tags:
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
            tags.append(tag)
        task.tags = tags
    db.commit()
    db.refresh(task)
    return _to_task_read(task)


@router.patch("/{task_id}/status", response_model=TaskRead)
def set_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskRead:
    task = db.query(Task).options(
        joinedload(Task.tags),
        joinedload(Task.stages),
        joinedload(Task.comments),
        joinedload(Task.assignees),
    ).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if current_user.role == UserRole.employee and not _task_has_access(task, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to task")
    task.status = payload.status
    db.commit()
    db.refresh(task)
    return _to_task_read(task)


@router.post("/{task_id}/stages", response_model=TaskRead, dependencies=[Depends(require_admin)])
def add_stage(task_id: int, payload: StageCreate, db: Annotated[Session, Depends(get_db)]) -> TaskRead:
    task = db.query(Task).options(
        joinedload(Task.tags),
        joinedload(Task.stages),
        joinedload(Task.comments),
        joinedload(Task.assignees),
    ).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db.add(TaskStage(task_id=task_id, title=payload.title, order_index=payload.order_index))
    db.commit()
    db.refresh(task)
    return _to_task_read(task)


@router.patch("/{task_id}/stages/{stage_id}", response_model=TaskRead)
def edit_stage(
    task_id: int,
    stage_id: int,
    payload: StageUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskRead:
    task = db.query(Task).options(
        joinedload(Task.tags),
        joinedload(Task.stages),
        joinedload(Task.comments),
        joinedload(Task.assignees),
    ).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if current_user.role == UserRole.employee and not _task_has_access(task, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to task")
    stage = db.query(TaskStage).filter(TaskStage.id == stage_id, TaskStage.task_id == task_id).first()
    if not stage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")
    if payload.title is not None:
        stage.title = payload.title
    if payload.is_done is not None:
        stage.is_done = payload.is_done
    if payload.order_index is not None:
        stage.order_index = payload.order_index
    db.commit()
    db.refresh(task)
    return _to_task_read(task)


@router.post("/{task_id}/comments", response_model=TaskRead)
def add_comment(
    task_id: int,
    payload: CommentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskRead:
    task = db.query(Task).options(
        joinedload(Task.tags),
        joinedload(Task.stages),
        joinedload(Task.comments),
        joinedload(Task.assignees),
    ).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if current_user.role == UserRole.employee and not _task_has_access(task, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to task")
    db.add(TaskComment(task_id=task_id, author_id=current_user.id, text=payload.text))
    db.commit()
    db.refresh(task)
    return _to_task_read(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def remove_task(task_id: int, db: Annotated[Session, Depends(get_db)]) -> Response:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db.delete(task)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
