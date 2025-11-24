# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""Database configuration and session management for SQLAlchemy."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings
import os

# Resolve the database URL and initialize SQLAlchemy engine/session.
# Choose database URL with sensible precedence to support Postgres and SQLite
# 1) POSTGRES_DATABASE_URL (explicit Postgres override)
# 2) DATABASE_URL (generic SQLAlchemy URL)
# 3) settings default (defaults to sqlite:///./app.db)
database_uri = (
    os.getenv("POSTGRES_DATABASE_URL")
    or os.getenv("DATABASE_URL")
    or settings.SQLALCHEMY_DATABASE_URI
)

print("DB URI in use:", database_uri)


engine = create_engine(
    database_uri,
    connect_args={"check_same_thread": False} if database_uri.startswith("sqlite") else {},
    pool_pre_ping=True,
)
"""SQLAlchemy engine instance for database connections."""

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
"""Session factory for creating database sessions."""

Base = declarative_base()
"""Base class for all SQLAlchemy ORM models."""

from typing import Generator
def get_db() -> Generator:
    """Yield a SQLAlchemy session scoped to the request lifecycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
