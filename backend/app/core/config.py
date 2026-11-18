from pathlib import Path
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class SupabaseConfigurationError(RuntimeError):
    """Supabase database credentials are missing from the backend environment."""

    def __init__(self):
        super().__init__(
            "Supabase PostgreSQL configuration is missing. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in backend/.env."
        )


class Settings(BaseSettings):
    PROJECT_NAME: str = "CodeMentor AI Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Supabase Configuration
    # The JWT secret is only used for legacy HS256 sessions.
    SUPABASE_URL: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Judge0 CE Execution
    JUDGE0_API_URL: str = ""
    JUDGE0_AUTH_TOKEN: str = ""
    EXECUTION_RATE_WINDOW_SECONDS: int = Field(default=60, ge=1, le=3600)
    EXECUTION_RUN_LIMIT: int = Field(default=20, ge=1, le=10000)
    EXECUTION_SUBMIT_LIMIT: int = Field(default=3, ge=1, le=10000)

    # LLM / AI Mentor configuration
    LLM_API_URL: str = ""
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_EMBEDDING_URL: str = ""
    LLM_EMBEDDING_MODEL: str = "text-embedding-3-small"
    LLM_EMBEDDING_API_KEY: str = ""
    MENTOR_REQUEST_LIMIT: int = Field(default=10, ge=1, le=10000)

    # CORS configuration for Next.js frontend
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=(".env", Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
