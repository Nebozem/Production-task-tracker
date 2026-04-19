from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    """Create a new tag. Color is automatically assigned based on the tag name."""
    name: str = Field(min_length=1, max_length=64)


class TagUpdate(BaseModel):
    """Update an existing tag. Only the name can be updated; color is auto-generated."""
    name: str | None = Field(default=None, min_length=1, max_length=64)


class TagRead(BaseModel):
    """Tag with auto-generated color based on name."""
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}
