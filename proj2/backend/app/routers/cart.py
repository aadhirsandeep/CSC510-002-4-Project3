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
from collections import defaultdict
from ..database import get_db
from ..schemas import CartAddItem, CartSummary, CartOut
from ..models import Cart, CartItem, Item, User
from ..deps import get_current_user

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("/", response_model=CartOut)
def get_cart(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Get or create the current user's cart and return its metadata."""
    cart = get_or_create_cart(db, current.id)
    return CartOut(id=cart.id, user_id=cart.user_id, created_at=cart.created_at)


def get_or_create_cart(db: Session, user_id: int) -> Cart:
    """Fetch the user's cart or create a new one if missing."""
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart

@router.post("/add", response_model=dict)
def add_to_cart(data: CartAddItem, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Add or increment an item in the cart; enforce single-cafe constraint."""
    item = db.query(Item).filter(Item.id == data.item_id, Item.active == True).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    assignee_id = current.id
    if data.assignee_email:
        assignee = db.query(User).filter(User.email == data.assignee_email, User.is_active == True).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Assignee must be a registered active user")
        assignee_id = assignee.id
    cart = get_or_create_cart(db, current.id)

    # Enforce single-restaurant per cart: if cart already has items from a different cafe, reject
    existing_cafe = db.query(Item.cafe_id).join(CartItem, CartItem.item_id == Item.id).filter(CartItem.cart_id == cart.id).distinct().first()
    if existing_cafe and existing_cafe[0] != item.cafe_id:
        raise HTTPException(status_code=400, detail="Cart contains items from another restaurant. Clear cart before adding items from a different restaurant.")

    # If the same item already exists in the cart (same cart_id & item_id), increment quantity
    existing_ci = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.item_id == item.id).first()
    if existing_ci:
        existing_ci.quantity = (existing_ci.quantity or 0) + int(data.quantity)
        db.add(existing_ci)
        db.commit()
        return {"status": "updated", "cart_item_id": existing_ci.id}

    ci = CartItem(cart_id=cart.id, item_id=item.id, quantity=data.quantity, assignee_user_id=assignee_id)
    db.add(ci)
    db.commit()
    db.refresh(ci)
    return {"status": "added", "cart_item_id": ci.id}

@router.get("/summary", response_model=CartSummary)
def cart_summary(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Return calories and price totals grouped by assignee, plus cart totals."""
    cart = get_or_create_cart(db, current.id)
    rows = db.query(CartItem, Item, User).join(Item, CartItem.item_id == Item.id).join(User, CartItem.assignee_user_id == User.id).filter(CartItem.cart_id == cart.id).all()
    by_person = defaultdict(lambda: {"calories": 0.0, "price": 0.0})
    total_cals = 0
    total_price = 0.0
    for ci, it, person in rows:
        cals = it.calories * ci.quantity
        price = it.price * ci.quantity
        email = person.email
        by_person[email]["calories"] += cals
        by_person[email]["price"] += price
        total_cals += cals
        total_price += price
    return CartSummary(by_person=by_person, total_calories=total_cals, total_price=round(total_price, 2))

@router.delete("/clear", response_model=dict)
def clear_cart(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Remove all items from the current user's cart."""
    cart = get_or_create_cart(db, current.id)
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    return {"status": "cleared"}


@router.get("/items", response_model=list)
def get_cart_items(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Return detailed cart items for the current user."""
    cart = get_or_create_cart(db, current.id)
    rows = db.query(CartItem, Item).join(Item, CartItem.item_id == Item.id).filter(CartItem.cart_id == cart.id).all()
    results = []
    for ci, it in rows:
        results.append({
            "id": ci.id,
            "cart_id": ci.cart_id,
            "item": {
                "id": it.id,
                "cafe_id": it.cafe_id,
                "name": it.name,
                "description": it.description,
                "price": float(it.price),
                "calories": it.calories,
                "category": it.kind or "",
                # send empty string when no image is available to simplify frontend handling
                "image": getattr(it, "image", None) or None,
                "veg_flag": bool(it.veg_flag),
            },
            "quantity": ci.quantity,
            "assignee_user_id": ci.assignee_user_id
        })
    return results


@router.put("/item/{cart_item_id}")
def update_cart_item(cart_item_id: int, payload: dict, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Update quantity (and optionally assignee) for a cart item belonging to the current user."""
    cart = get_or_create_cart(db, current.id)
    ci = db.query(CartItem).filter(CartItem.id == cart_item_id, CartItem.cart_id == cart.id).first()
    if not ci:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if "quantity" in payload:
        qty = int(payload.get("quantity") or 0)
        if qty <= 0:
            db.delete(ci)
            db.commit()
            return {"status": "removed"}
        ci.quantity = qty
    if "assignee_email" in payload and payload.get("assignee_email"):
        from ..models import User as UserModel
        ass = db.query(UserModel).filter(UserModel.email == payload.get("assignee_email")).first()
        if not ass:
            raise HTTPException(status_code=400, detail="Assignee not found or inactive")
        ci.assignee_user_id = ass.id
    db.add(ci)
    db.commit()
    return {"status": "updated"}


@router.delete("/item/{cart_item_id}")
def delete_cart_item(cart_item_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Delete a specific cart item belonging to the current user."""
    cart = get_or_create_cart(db, current.id)
    ci = db.query(CartItem).filter(CartItem.id == cart_item_id, CartItem.cart_id == cart.id).first()
    if not ci:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(ci)
    db.commit()
    return {"status": "deleted"}
