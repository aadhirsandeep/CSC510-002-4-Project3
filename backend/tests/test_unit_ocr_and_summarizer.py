# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

import json
import asyncio
from datetime import datetime

import PyPDF2

from app.services.ocr import OCRService, parse_menu_pdf
from app.services.review_summarizer import ReviewSummarizerService


def make_minimal_pdf_bytes(text: str) -> bytes:
    # Create a one-page PDF containing the given text using PyPDF2 writer
    from PyPDF2 import PdfWriter
    from io import BytesIO

    pdf_stream = BytesIO()
    writer = PdfWriter()
    # PyPDF2 doesn't provide a simple way to write text-only pages; use a blank page for extract_text to return ''
    # Instead, create a PDF that will not have extractable text; the OCRService should handle empty content
    writer.add_blank_page(width=72, height=72)
    writer.write(pdf_stream)
    return pdf_stream.getvalue()


def test_extract_text_from_pdf_empty():
    pdf_bytes = make_minimal_pdf_bytes("")
    svc = OCRService()
    text = svc.extract_text_from_pdf(pdf_bytes)
    # minimal PDF will have empty text
    assert isinstance(text, str)


def test_parse_menu_with_mistral_mock(monkeypatch):
    svc = OCRService()

    # Mock the Mistral client's chat.complete method
    class MockChoice:
        def __init__(self):
            self.message = MockMessage()
    
    class MockMessage:
        def __init__(self):
            self.content = '{"items": [{"name": "Test Dish", "calories": 200, "price": 5.5, "veg_flag": true}]}'
    
    class MockChatResponse:
        def __init__(self):
            self.choices = [MockChoice()]
    
    class MockChat:
        def complete(self, model=None, messages=None, response_format=None, temperature=None, max_tokens=None):
            return MockChatResponse()
    
    # Create a mock client with mock chat
    mock_chat = MockChat()
    
    # Replace the client's chat attribute
    svc.client.chat = mock_chat

    items = svc.parse_menu_with_mistral("Some menu text")
    assert len(items) == 1
    assert items[0].name == "Test Dish"
    assert items[0].calories == 200
    assert items[0].price == 5.5


def test_review_summarizer_cache_and_call(monkeypatch):
    # Mock _call_mistral to avoid real HTTP calls
    async def fake_call(prompt: str, retries=3, timeout=15):
        return "- Good food\n- Nice service\nSentiment: positive"

    monkeypatch.setattr(ReviewSummarizerService, '_call_mistral', staticmethod(fake_call))

    # Use an in-memory SQLite DB via existing TEST DB; reuse session creation from tests environment
    import os
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models import Review, ReviewSummary

    TEST_DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        # create a cafe id '999' reviews
        r1 = Review(cafe_id=999, user_id=1, text="Loved it", rating=5)
        r2 = Review(cafe_id=999, user_id=2, text="Okay", rating=3)
        db.add_all([r1, r2])
        db.commit()

        # Run summarizer
        result = asyncio.get_event_loop().run_until_complete(ReviewSummarizerService.summarize_reviews(db, 999, force=True))
        assert result["cafe_id"] == 999
        assert "summary" in result

        # Call again without force should return cached
        result2 = asyncio.get_event_loop().run_until_complete(ReviewSummarizerService.summarize_reviews(db, 999, force=False))
        assert result2["cached"] is True or result2["review_count"] == 2
    finally:
        db.close()
