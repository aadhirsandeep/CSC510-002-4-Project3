# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os, sys

import os, sys

def _ensure_backend_on_syspath():
    # Try current file's parent (backend), then parents up to repo root
    this_dir = os.path.dirname(__file__)
    candidates = [
        os.path.abspath(os.path.join(this_dir, os.pardir)),                     # backend/
        os.path.abspath(os.path.join(this_dir, os.pardir, os.pardir)),          # repo root
        os.getcwd(),                                                            # current working dir
        os.path.abspath(os.path.join(os.getcwd(), "backend")),                  # cwd/backend
    ]
    seen = set()
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            if os.path.isdir(os.path.join(c, "app")) and os.path.isfile(os.path.join(c, "app", "__init__.py")):
                if c not in sys.path:
                    sys.path.insert(0, c)
                return
    # Fallback: walk up looking for a dir that has app/__init__.py
    cur = os.path.abspath(this_dir)
    for _ in range(6):
        if os.path.isdir(os.path.join(cur, "app")) and os.path.isfile(os.path.join(cur, "app", "__init__.py")):
            if cur not in sys.path:
                sys.path.insert(0, cur)
            return
        cur = os.path.abspath(os.path.join(cur, os.pardir))

_ensure_backend_on_syspath()

# Ensure 'app' package is importable whether pytest runs from repo root or /backend
THIS_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(THIS_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app
from app.database import Base, get_db

# Use a temporary SQLite DB for tests
TEST_DB_URL = "sqlite:///./test.db"

# Ensure env var so app/database.py selects this URL
os.environ["DATABASE_URL"] = TEST_DB_URL

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables once
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c