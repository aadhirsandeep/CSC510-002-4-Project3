# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""Application settings loaded from environment with sensible defaults."""
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseModel):
    """Application configuration settings loaded from environment variables with sensible defaults."""
    APP_NAME: str = "Cafe Calories API"
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_EXPIRE_MIN", 60))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_EXPIRE_DAYS", 7))
    SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    ORDER_CANCEL_GRACE_MINUTES: int = int(os.getenv("ORDER_CANCEL_GRACE_MINUTES", 15))
    POSTGRES_DATABASE_URL: str = os.getenv("POSTGRES_DATABASE_URL", "postgresql://postgres:1234@localhost:5432/cafe_calories")
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")

settings = Settings()


