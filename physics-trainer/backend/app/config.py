from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://physics:physics@localhost:5432/physics"
    UPLOAD_DIR: str = "/app/uploads"

    class Config:
        env_file = ".env"


settings = Settings()
