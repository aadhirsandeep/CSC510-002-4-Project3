# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

import httpx
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from ..models import Review, ReviewSummary
from app.config import settings

class ReviewSummarizerService:
    @staticmethod
    def get_reviews(db: Session, cafe_id: int):
        """Fetch all reviews for a given café."""
        return db.query(Review).filter(Review.cafe_id == cafe_id).all()

    @staticmethod
    def get_cached_summary(db: Session, cafe_id: int):
        """Fetch cached summary for café if available."""
        return db.query(ReviewSummary).filter(ReviewSummary.cafe_id == cafe_id).first()

    @staticmethod
    async def summarize_reviews(db: Session, cafe_id: int, force: bool = False):
        """
        Generate or return cached summary for a café’s reviews.
        If 'force' is True, always re-generate even if cache is valid.
        """
        reviews = ReviewSummarizerService.get_reviews(db, cafe_id)
        if not reviews:
            return {"message": "No reviews found for this café."}

        cached = ReviewSummarizerService.get_cached_summary(db, cafe_id)

        # ✅ Return cached summary if valid
        if cached and not force:
            if cached.review_count == len(reviews):
                return {
                    "cafe_id": cafe_id,
                    "summary": cached.summary_text,
                    "cached": True,
                    "review_count": cached.review_count,
                    "updated_at": cached.updated_at
                }

        # 🧠 Build Mistral prompt
        review_text = "\n".join([f"- {r.text}" for r in reviews])
        prompt = (
            "You are an assistant that summarizes customer reviews of cafés.\n"
            "Summarize the following reviews into 3-5 concise bullet points and state the overall sentiment "
            "(positive, neutral, or negative).\n\n"
            f"REVIEWS:\n{review_text}"
        )

        # 🪄 Call Mistral
        summary_text = await ReviewSummarizerService._call_mistral(prompt)

        # 💾 Save/update cached summary in DB
        if cached:
            cached.summary_text = summary_text
            cached.review_count = len(reviews)
            cached.updated_at = datetime.utcnow()
        else:
            cached = ReviewSummary(
                cafe_id=cafe_id,
                summary_text=summary_text,
                review_count=len(reviews),
                updated_at=datetime.utcnow(),
            )
            db.add(cached)
        db.commit()

        return {
            "cafe_id": cafe_id,
            "summary": summary_text,
            "cached": False,
            "review_count": len(reviews),
            "updated_at": cached.updated_at,
        }

    # ----------------------------------
    # Internal helper for Mistral call
    # ----------------------------------
    @staticmethod
    async def _call_mistral(prompt: str, retries: int = 3, timeout: int = 15):
        """Call Mistral API with retries and error handling."""
        url = "https://api.mistral.ai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {settings.MISTRAL_API_KEY}"}
        payload = {
            "model": "mistral-small",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 300,
        }

        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
            except Exception as e:
                if attempt == retries - 1:
                    raise RuntimeError(f"Mistral API failed after {retries} retries: {e}")
                await asyncio.sleep(2 * (attempt + 1))
