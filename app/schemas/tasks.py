from datetime import datetime

from pydantic import BaseModel, Field

from app.models.task import TaskPriority, TaskStatus


class TagInfo(BaseModel):
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}


class StageCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    order_index: int = 0


class StageUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    is_done: bool | None = None
    order_index: int | None = None


class StageRead(BaseModel):
    id: int
    title: str
    is_done: bool
    order_index: int

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class CommentRead(BaseModel):
    id: int
    author_id: int
    text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    priority: TaskPriority = TaskPriority.medium
    starts_at: datetime | None = None
    deadline: datetime | None = None
    assigned_to: int | None = None
    assigned_user_ids: list[int] = []
    tags: list[str] = []
    stages: list[StageCreate] = []


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    starts_at: datetime | None = None
    deadline: datetime | None = None
    assigned_to: int | None = None
    assigned_user_ids: list[int] | None = None
    tags: list[str] | None = None


class TaskRead(BaseModel):
    id: int
    title: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    starts_at: datetime | None
    deadline: datetime | None
    created_at: datetime
    updated_at: datetime
    created_by: int
    assigned_to: int | None
    assigned_to_login: str | None
    assigned_user_ids: list[int]
    assigned_user_logins: list[str]
    tags: list[TagInfo]
    stages: list[StageRead]
    comments: list[CommentRead]


class TaskStatusUpdate(BaseModel):
    status: TaskStatus
