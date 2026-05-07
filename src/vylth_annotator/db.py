from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings


def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        # SQLite doesn't use pool_pre_ping; future=True is the default in 2.x.
        return {}
    return {"pool_pre_ping": True}


engine = create_async_engine(settings.database_url, **_engine_kwargs(settings.database_url))
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncSession:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    """Create tables if missing — used by `annotator run` for zero-config local mode."""
    from . import models  # noqa: F401  ensure mappers are registered
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
