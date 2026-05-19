"""
TaskHub Configuration — Pydantic Settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # AI
    FAL_KEY: str
    OPENAI_API_KEY: str

    # Email
    RESEND_API_KEY: str
    RESEND_FROM_EMAIL: str = "noreply@taskhub.app"
    RESEND_FROM_NAME: str = "TaskHub"

    # Redis / Queue
    REDIS_URL: str = "redis://localhost:6379/0"

    # Flask
    FLASK_SECRET_KEY: str = "dev-secret-key-change-in-production"
    FLASK_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    PORT: int = 5000

    @property
    def is_production(self) -> bool:
        return self.FLASK_ENV == "production"


settings = Settings()
