from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class Rect(BaseModel):
    x: float
    y: float
    w: float
    h: float
    n: int


class FeedbackCreate(BaseModel):
    """Inbound diagnostic envelope from the widget."""
    project: str  # informational; auth is via X-Annot-Token
    comment: str
    image: str   # base64 data URL ("data:image/png;base64,...")
    rects: list[Rect]
    url: dict[str, Any]
    viewport: dict[str, Any]
    document: dict[str, Any] = Field(default_factory=dict)
    targets: list[dict[str, Any]] = Field(default_factory=list)
    env: dict[str, Any] = Field(default_factory=dict)
    console: list[dict[str, Any]] = Field(default_factory=list)
    network: list[dict[str, Any]] = Field(default_factory=list)
    errors: list[dict[str, Any]] = Field(default_factory=list)
    perf: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] | None = None


class FeedbackOut(BaseModel):
    id: UUID
    project_id: str
    comment: str
    rects: list[dict[str, Any]]
    url: str
    pathname: str
    viewport: dict[str, Any]
    targets: list[dict[str, Any]]
    env: dict[str, Any]
    console: list[dict[str, Any]] = Field(alias="console_buf")
    network: list[dict[str, Any]] = Field(alias="network_buf")
    errors:  list[dict[str, Any]] = Field(alias="errors_buf")
    perf: dict[str, Any]
    metadata: dict[str, Any] | None = Field(default=None, alias="metadata_")
    status: str
    resolved_at: datetime | None
    created_at: datetime
    has_image: bool = True

    class Config:
        from_attributes = True
        populate_by_name = True


class FeedbackList(BaseModel):
    items: list[FeedbackOut]
    count: int
