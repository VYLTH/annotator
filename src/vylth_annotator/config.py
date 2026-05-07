from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_db_url() -> str:
    """SQLite under the user's data dir — zero-config local mode."""
    home = Path.home() / ".vylth-annotator"
    home.mkdir(parents=True, exist_ok=True)
    return f"sqlite+aiosqlite:///{home / 'annotator.db'}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_prefix="ANNOTATOR_")

    database_url: str = _default_db_url()
    host: str = "127.0.0.1"
    port: int = 8092
    allowed_origins: str = "*"

    # Local mode: when true, accept any token (single-user laptop scenario).
    # The CLI sets this. Hosted deployments leave it false.
    local_mode: bool = False
    local_token: str = "local"
    local_project: str = "local"

    # Filesystem sink: when set, every accepted feedback writes a PNG + .md
    # pair under <sink_dir>/<project_id>/. Agents (Claude Code, Codex, Cursor)
    # read these directly — no API access required.
    sink_dir: str = ""

    r2_account_id: str = ""
    r2_access_key: str = ""
    r2_secret_key: str = ""
    r2_bucket: str = "annotator"


settings = Settings()
