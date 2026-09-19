"""Application configuration using pydantic-settings."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


WORKSPACE_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    APP_NAME: str = "Ignite Agent API"
    DEBUG: bool = False
    IGNITE_DATA_DIR: str = str(WORKSPACE_ROOT)
    IGNITE_STATE_DB: str = str(WORKSPACE_ROOT / "data" / "ignite-state.db")
    
    # OpenAI / Custom LLM
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = ""  # Custom endpoint (e.g., OpenRouter, Together AI)
    
    # Tavily
    TAVILY_API_KEY: str = ""
    
    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = ""
    NEO4J_DATABASE: str = "neo4j"
    NEO4J_TRUST_ALL_CERTIFICATES: bool = False
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore undefined env variables


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
