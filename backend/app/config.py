from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ChatBook"
    secret_key: str = "change-this-secret-key-in-production"
    access_token_expire_minutes: int = 60 * 24

    database_url: str = f"sqlite:///{BASE_DIR / 'data' / 'chatbook.db'}"
    upload_dir: Path = BASE_DIR / "uploads"
    vector_store_dir: Path = BASE_DIR / "vector_store"

    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384
    llm_model: str = "llama3.2:3b"
    ollama_base_url: str = "http://localhost:11434"

    chunk_size: int = 800
    chunk_overlap: int = 100
    top_k: int = 4
    max_upload_mb: int = 100

    history_context_turns: int = 6

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
