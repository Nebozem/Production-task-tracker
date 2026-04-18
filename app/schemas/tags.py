from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)


class TagUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=64)


class TagRead(BaseModel):
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}
