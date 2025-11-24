# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from ..models import User, Role
from ..schemas import LoginRequest, Token
from ..auth import create_token, verify_password, hash_password
from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user by email/password/role and issue access/refresh tokens."""
    print(data.email)
    print(data.password)
    user = db.query(User).filter(User.email == data.email).first()
    print(user)
    print(user.hashed_password)
    roleMap ={
        Role.USER: "USER",
        Role.OWNER: "OWNER",
        Role.STAFF: "STAFF",
        Role.DRIVER: "DRIVER",
        Role.ADMIN: "ADMIN"
    }
    if roleMap[user.role] != data.role:
        raise HTTPException(status_code=401, detail="Invalid role for user")
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access = create_token(user.id, user.email, user.role, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh = create_token(user.id, user.email, user.role, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    return Token(access_token=access, refresh_token=refresh)

@router.get("/refresh_token", response_model=Token)
def refresh_token():
    """Placeholder for refresh token flow (not implemented)."""
    raise HTTPException(status_code=501, detail="Refresh flow not implemented in this sample")

@router.post("/validate")
def validate():
    """Validate current authentication context (simple OK)."""
    return {"ok": True}

@router.post("/seed_user", response_model=dict)
def seed_user(email: str, name: str, password: str, role: Role = Role.USER, db: Session = Depends(get_db)):
    """Create a development user with the given role if it does not exist."""
    if db.query(User).filter(User.email == email).first():
        return {"status": "exists"}
    u = User(email=email, name=name, hashed_password=hash_password(password), role=role)
    db.add(u)
    db.commit()
    return {"status": "created"}
