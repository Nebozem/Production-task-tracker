from fastapi import HTTPException, status

from app.schemas.tasks import Task, TaskCreate, TaskUpdate

_tasks: list[Task] = []
_next_id = 1


def list_tasks() -> list[Task]:
    return _tasks


def create_task(payload: TaskCreate) -> Task:
    global _next_id

    task = Task(
        id=_next_id,
        title=payload.title,
        description=payload.description,
        completed=False,
    )
    _next_id += 1
    _tasks.append(task)
    return task


def get_task(task_id: int) -> Task:
    for task in _tasks:
        if task.id == task_id:
            return task
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Task with id={task_id} not found",
    )


def update_task(task_id: int, payload: TaskUpdate) -> Task:
    task = get_task(task_id)

    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.completed is not None:
        task.completed = payload.completed

    return task


def delete_task(task_id: int) -> None:
    task = get_task(task_id)
    _tasks.remove(task)


def reset_store() -> None:
    global _next_id

    _tasks.clear()
    _next_id = 1
