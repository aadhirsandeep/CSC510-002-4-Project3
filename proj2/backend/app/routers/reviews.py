# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
# from app.schemas.review import ReviewOut, ReviewCreate
from ..schemas import ReviewOut, ReviewCreate
from ..models import Review, Cafe
from app.services.review_summarizer import ReviewSummarizerService

router = APIRouter(prefix="/cafes", tags=["Reviews"])

@router.get("/{cafe_id}/reviews", response_model=List[ReviewOut])
def get_reviews(cafe_id: int, db: Session = Depends(get_db)):
    """List all reviews for a cafe (public)."""
    reviews = db.query(Review).filter(Review.cafe_id == cafe_id).all()
    return reviews

@router.get("/{cafe_id}/reviews/summary")
async def get_review_summary(
    cafe_id: int,
    db: Session = Depends(get_db),
    force: bool = Query(False, description="Force regeneration of summary even if cached")
):
    """Get AI-generated summary of reviews for a cafe (cached or regenerated)."""
    try:
        result = await ReviewSummarizerService.summarize_reviews(db, cafe_id, force)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{cafe_id}/reviews", response_model=ReviewOut)
def create_review(cafe_id: int, review: ReviewCreate, db: Session = Depends(get_db)):
    """Create a new review for a cafe (public, requires user_id in body)."""
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Café not found")

    new_review = Review(
        cafe_id=cafe_id,
        user_id=review.user_id,   # <- add this
        rating=review.rating,     # <- if your model has a rating column
        text=review.text,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

