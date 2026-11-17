from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CodeMentor AI Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Supabase Configuration
    # In production, SUPABASE_JWT_SECRET matches your Supabase Project Settings -> API -> JWT Secret
    SUPABASE_URL: str = ""
    SUPABASE_JWT_SECRET: str = "dev-secret-key-change-in-production-supabase-jwt-secret-key-32chars"
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Judge0 CE Execution
    JUDGE0_API_URL: str = ""
    JUDGE0_AUTH_TOKEN: str = ""

    # LLM / AI Mentor configuration
    LLM_API_URL: str = ""
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"

    # CORS configuration for Next.js frontend
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
