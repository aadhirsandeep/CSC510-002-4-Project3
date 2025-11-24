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
from typing import List
from ..database import get_db
from ..schemas import ItemCreate, ItemOut
from ..models import Item, Cafe, User, Role
from ..deps import get_current_user

router = APIRouter(prefix="/items", tags=["items"])

@router.post("/{cafe_id}", response_model=ItemOut)
def add_item(cafe_id: int, data: ItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Add a new menu item to a cafe (owner/admin only)."""
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    if not (user.role == Role.ADMIN or cafe.owner_id == user.id):
        raise HTTPException(status_code=403, detail="Only owner/admin can add items")
    item = Item(cafe_id=cafe_id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{item_id}", response_model=ItemOut)
def update_item(item_id: int, data: ItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Update an existing menu item (owner/admin only)."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    cafe = db.query(Cafe).filter(Cafe.id == item.cafe_id).first()
    if not (user.role == Role.ADMIN or (cafe and cafe.owner_id == user.id)):
        raise HTTPException(status_code=403, detail="Only owner/admin can update items")
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Delete a menu item (owner/admin only)."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    cafe = db.query(Cafe).filter(Cafe.id == item.cafe_id).first()
    if not (user.role == Role.ADMIN or (cafe and cafe.owner_id == user.id)):
        raise HTTPException(status_code=403, detail="Only owner/admin can delete items")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}

# NEW: Get all items across all cafes (for AI recommendations)
@router.get("", response_model=List[ItemOut])
def list_all_items(q: str | None = None, db: Session = Depends(get_db)):
    """List all active menu items across all cafes (for AI recommendations)"""
    query = db.query(Item).filter(Item.active == True)
    if q:
        like = f"%{q}%"
        query = query.filter(Item.name.ilike(like))
    return query.order_by(Item.name).all()

@router.get("/{cafe_id}", response_model=List[ItemOut])
def list_items(cafe_id: int, q: str | None = None, db: Session = Depends(get_db)):
    """List active items for a given cafe, optionally filtered by name."""
    query = db.query(Item).filter(Item.cafe_id == cafe_id, Item.active == True)
    if q:
        like = f"%{q}%"
        query = query.filter(Item.name.ilike(like))
    return query.order_by(Item.name).all()
