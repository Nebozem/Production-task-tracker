from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.task import Tag
from app.schemas.tags import TagCreate, TagRead, TagUpdate

router = APIRouter(prefix="/tags", tags=["tags"])


def generate_tag_color(name: str) -> str:
    """
    Generate a deterministic dark color for a tag based on its name hash.
    Uses a curated palette of dark colors that work well with white text.
    Same tag name always gets the same color.
    """
    colors = [
        '#1f2937',  # slate-800 (dark blue-gray)
        '#991b1b',  # red-900
        '#7c2d12',  # orange-900
        '#78350f',  # amber-900
        '#15803d',  # green-800
        '#0f766e',  # teal-800
        '#0c4a6e',  # sky-900
        '#1e3a8a',  # blue-900
        '#4c1d95',  # violet-900
        '#831843',  # rose-900
        '#4b5563',  # slate-700
    ]
    hash_value = hash(name) % len(colors)
    return colors[hash_value]


@router.get("", response_model=list[TagRead])
def list_tags(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[object, Depends(get_current_user)],
) -> list[Tag]:
    return db.query(Tag).order_by(Tag.name.asc()).all()


@router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_tag(payload: TagCreate, db: Annotated[Session, Depends(get_db)]) -> Tag:
    exists = db.query(Tag).filter(Tag.name == payload.name.strip()).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag already exists")
    tag = Tag(name=payload.name.strip(), color=generate_tag_color(payload.name.strip()))
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.patch("/{tag_id}", response_model=TagRead, dependencies=[Depends(require_admin)])
def update_tag(tag_id: int, payload: TagUpdate, db: Annotated[Session, Depends(get_db)]) -> Tag:
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    if payload.name is not None:
        duplicate = db.query(Tag).filter(Tag.name == payload.name.strip(), Tag.id != tag_id).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag already exists")
        tag.name = payload.name.strip()
        # Regenerate color based on new name
        tag.color = generate_tag_color(tag.name)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_tag(tag_id: int, db: Annotated[Session, Depends(get_db)]) -> Response:
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    db.delete(tag)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
