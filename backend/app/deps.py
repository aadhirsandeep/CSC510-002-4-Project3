# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .auth import decode_token
from .models import User, Role, StaffAssignment, Cafe

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    """Resolve and return the active user from a Bearer token or raise 401."""
    payload = decode_token(token)
    user = db.query(User).filter(User.id == payload.uid, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user

def require_roles(*roles: Role):
    """Create a dependency that ensures the current user has one of the required roles.
    
    Args:
        *roles: Variable number of Role enum values that are allowed
        
    Returns:
        A dependency function that checks user role and raises 403 if not authorized
    """
    def checker(user: User = Depends(get_current_user)):
        """Ensure the current user has one of the required roles or raise 403."""
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return checker

def require_cafe_staff_or_owner(cafe_id: int, db: Session, user: User):
    """Authorize current user as cafe owner/staff/admin for the given cafe or raise 403."""
    if user.role == Role.ADMIN:
        return
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    if cafe and cafe.owner_id == user.id:
        return
    sa = db.query(StaffAssignment).filter(StaffAssignment.cafe_id == cafe_id, StaffAssignment.user_id == user.id).first()
    if not sa:
        raise HTTPException(status_code=403, detail="Not staff/owner of this cafe")
