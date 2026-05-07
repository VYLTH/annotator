import uuid
from datetime import datetime

from sqlalchemy import JSON, ForeignKey, LargeBinary, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import CHAR, TypeDecorator

from .db import Base


# Portable JSON: JSONB on Postgres, JSON on SQLite/others.
PortableJSON = JSON().with_variant(JSONB(), "postgresql")


class GUID(TypeDecorator):
    """Cross-dialect UUID: native on Postgres, CHAR(36) on SQLite."""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


class Project(Base):
    __tablename__ = "annotator_projects"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    token_hash: Mapped[str] = mapped_column(String, nullable=False)
    destinations: Mapped[list] = mapped_column(PortableJSON, default=list, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    feedback: Mapped[list["Feedback"]] = relationship(back_populates="project")


class Feedback(Base):
    __tablename__ = "annotator_feedback"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(ForeignKey("annotator_projects.id"), nullable=False, index=True)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    rects: Mapped[list] = mapped_column(PortableJSON, nullable=False)
    image: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    image_r2_key: Mapped[str | None] = mapped_column(String, nullable=True)

    # diagnostic envelope
    url: Mapped[str] = mapped_column(Text, nullable=False)
    pathname: Mapped[str] = mapped_column(Text, nullable=False)
    viewport: Mapped[dict] = mapped_column(PortableJSON, nullable=False)
    document: Mapped[dict] = mapped_column(PortableJSON, nullable=False)
    targets: Mapped[list] = mapped_column(PortableJSON, nullable=False)
    env: Mapped[dict] = mapped_column(PortableJSON, nullable=False)
    console_buf: Mapped[list] = mapped_column(PortableJSON, nullable=False, default=list)
    network_buf: Mapped[list] = mapped_column(PortableJSON, nullable=False, default=list)
    errors_buf: Mapped[list] = mapped_column(PortableJSON, nullable=False, default=list)
    perf: Mapped[dict] = mapped_column(PortableJSON, nullable=False, default=dict)
    metadata_: Mapped[dict | None] = mapped_column("metadata", PortableJSON, nullable=True)

    status: Mapped[str] = mapped_column(String, nullable=False, default="open", server_default="open", index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    project: Mapped[Project] = relationship(back_populates="feedback")
