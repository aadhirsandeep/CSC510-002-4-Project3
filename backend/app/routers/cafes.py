# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas import CafeCreate, CafeOut, ItemCreate, OCRResult
from ..models import Cafe, Item, User, Role
from ..deps import get_current_user, require_roles
from ..services.ocr import parse_menu_pdf
router = APIRouter(prefix="/cafes", tags=["cafes"])
@router.get("/mine", response_model=CafeOut)
def get_my_cafe(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.OWNER))
):
    """Return the cafe owned by the logged-in owner."""
    cafe = db.query(Cafe).filter(Cafe.owner_id == user.id, Cafe.active == True).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="You have no cafe registered yet.")
    return cafe

@router.post("/", response_model=CafeOut)
def create_cafe(data: CafeCreate, db: Session = Depends(get_db), owner: User = Depends(require_roles(Role.OWNER, Role.ADMIN))):
    """Create a cafe. Only OWNER or ADMIN may call this endpoint.
    For seeding, prefer `/admin/cafes` which accepts query params and is intended for administrative creation.
    """
    cafe = Cafe(
        name=data.name,
        address=data.address,
        phone=getattr(data, 'phone', None),
        lat=data.lat,
        lng=data.lng,
        cuisine=getattr(data, "cuisine", None),
        timings=getattr(data, "timings", None),
        owner_id=owner.id if owner.role == Role.OWNER else None,
    )
    db.add(cafe)
    db.commit()
    db.refresh(cafe)
    return cafe

@router.get("/", response_model=List[CafeOut])
def list_cafes(q: str | None = None, db: Session = Depends(get_db)):
    """List active cafes, optionally filtered by case-insensitive name match."""
    query = db.query(Cafe).filter(Cafe.active == True)
    if q:
        like = f"%{q}%"
        query = query.filter(Cafe.name.ilike(like))
    return query.order_by(Cafe.name).all()


@router.get("/{cafe_id}", response_model=CafeOut)
def get_cafe(cafe_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific cafe by id (public)."""
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id, Cafe.active == True).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    return cafe
@router.post("/{cafe_id}/menu/upload", response_model=OCRResult)
def upload_menu(cafe_id: int, pdf: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Upload a cafe menu PDF and return OCR-parsed items (owner/admin only)."""
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    if not (user.role == Role.ADMIN or cafe.owner_id == user.id):
        raise HTTPException(status_code=403, detail="Only owner/admin can upload menu")
    content = pdf.file.read()
    items = parse_menu_pdf(content)
    return OCRResult(items=items)

@router.put("/{cafe_id}/menu", response_model=dict)
def replace_menu(
    cafe_id: int,
    items: List[ItemCreate],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Replace entire cafe menu with provided items (owner/admin only)."""
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    if not (user.role == Role.ADMIN or cafe.owner_id == user.id):
        raise HTTPException(status_code=403, detail="Only owner/admin can replace menu")

    # Remove old items
    db.query(Item).filter(Item.cafe_id == cafe_id).delete()

    # Add new items
    new_items = [Item(cafe_id=cafe_id, **item.model_dump()) for item in items]
    db.add_all(new_items)
    db.commit()

    return {"success": True, "items_created": len(new_items)}
