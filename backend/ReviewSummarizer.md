<!--
Copyright (c) 2025 Group 2
All rights reserved.

This project and its source code are the property of Group 2:
- Aryan Tapkire
- Dilip Irala Narasimhareddy
- Sachi Vyas
- Supraj Gijre
-->

# Cafe Review System Documentation

## Overview
This documentation covers the new review and review summarization system for the cafe application. The system allows users to submit reviews for cafes and automatically generates AI-powered summaries of all reviews for each cafe.

---

## Files Added

### 1. `models.py` - Database Models

#### Review Model
Stores individual user reviews for cafes.

```python
class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    cafe_id = Column(Integer, ForeignKey("cafes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Float, nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

**Fields:**
- `id`: Primary key
- `cafe_id`: Foreign key linking to the cafe
- `user_id`: Foreign key linking to the user who wrote the review
- `rating`: Optional numerical rating (e.g., 1-5 stars)
- `text`: The review content
- `created_at`: Timestamp when review was created

#### ReviewSummary Model
Stores AI-generated summaries of all reviews for a cafe.

```python
class ReviewSummary(Base):
    __tablename__ = "review_summaries"
    id = Column(Integer, primary_key=True, index=True)
    cafe_id = Column(Integer, ForeignKey("cafes.id"), unique=True, nullable=False)
    summary_text = Column(Text, nullable=False)
    review_count = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Fields:**
- `id`: Primary key
- `cafe_id`: Foreign key to cafe (unique - one summary per cafe)
- `summary_text`: AI-generated summary of reviews
- `review_count`: Number of reviews included in the summary
- `updated_at`: Timestamp of last summary update

---

### 2. `schemas.py` - Pydantic Schemas

#### ReviewBase
Base schema with common review fields.

```python
class ReviewBase(BaseModel):
    rating: Optional[float] = None
    text: str
```

#### ReviewCreate
Schema for creating a new review.

```python
class ReviewCreate(ReviewBase):
    cafe_id: int
    user_id: int
```

#### ReviewOut
Schema for review responses (includes all fields).

```python
class ReviewOut(ReviewBase):
    id: int
    cafe_id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
```

---

### 3. `review_summarizer.py` - AI Summarization Service

Contains the `ReviewSummarizerService` class that handles AI-powered review summarization using Claude API.

**Key Method:**
```python
async def summarize_reviews(db: Session, cafe_id: int, force: bool = False)
```

**Parameters:**
- `db`: Database session
- `cafe_id`: ID of the cafe to summarize reviews for
- `force`: If True, regenerates summary even if cached

**Returns:**
```json
{
  "summary": "AI-generated summary text",
  "review_count": 15,
  "cached": false
}
```

---

### 4. `reviews.py` - API Router

FastAPI router with endpoints for review operations.

---

## API Endpoints

### 1. Get All Reviews for a Cafe
**Endpoint:** `GET /cafes/{cafe_id}/reviews`

**Description:** Retrieves all reviews for a specific cafe.

**Parameters:**
- `cafe_id` (path): ID of the cafe

**Response:** Array of `ReviewOut` objects

**Example:**
```bash
curl -X GET "http://localhost:8000/cafes/1/reviews"
```

**Response:**
```json
[
  {
    "id": 1,
    "cafe_id": 1,
    "user_id": 5,
    "rating": 4.5,
    "text": "Great coffee and atmosphere!",
    "created_at": "2025-10-24T10:30:00Z"
  }
]
```

---

### 2. Get Review Summary (AI-Generated)
**Endpoint:** `GET /cafes/{cafe_id}/reviews/summary`

**Description:** Gets an AI-generated summary of all reviews for a cafe. Uses cached summary if available.

**Parameters:**
- `cafe_id` (path): ID of the cafe
- `force` (query, optional): Set to `true` to force regeneration of summary

**Response:**
```json
{
  "summary": "This cafe is praised for its excellent coffee quality and cozy atmosphere. Customers appreciate the friendly staff and comfortable seating. Some mention it can get crowded during peak hours. The wifi is reliable, making it popular with remote workers.",
  "review_count": 15,
  "cached": true
}
```

**Examples:**
```bash
# Get cached summary
curl -X GET "http://localhost:8000/cafes/1/reviews/summary"

# Force regenerate summary
curl -X GET "http://localhost:8000/cafes/1/reviews/summary?force=true"
```

---

### 3. Create a New Review
**Endpoint:** `POST /cafes/{cafe_id}/reviews`

**Description:** Creates a new review for a cafe.

**Parameters:**
- `cafe_id` (path): ID of the cafe

**Request Body:**
```json
{
  "cafe_id": 1,
  "user_id": 5,
  "rating": 4.5,
  "text": "Amazing espresso and great wifi!"
}
```

**Response:** `ReviewOut` object

**Example:**
```bash
curl -X POST "http://localhost:8000/cafes/1/reviews" \
  -H "Content-Type: application/json" \
  -d '{
    "cafe_id": 1,
    "user_id": 5,
    "rating": 4.5,
    "text": "Amazing espresso and great wifi!"
  }'
```

---

## Setup Instructions

### 1. Database Migration
Add the new tables to your database:

```bash
# Generate migration
alembic revision --autogenerate -m "Add review and review_summary tables"

# Apply migration
alembic upgrade head
```

### 2. Environment Variables
Add to your `.env` file:

```env
ANTHROPIC_API_KEY=your_claude_api_key_here
```

### 3. Install Dependencies
If not already installed:

```bash
pip install anthropic
```

### 4. Register Router
In your main `app.py` or wherever you register routers:

```python
from app.routers import reviews

app.include_router(reviews.router)
```

---

## Usage Flow

### Creating and Viewing Reviews

1. **User submits a review:**
   ```bash
   POST /cafes/1/reviews
   ```

2. **Retrieve all reviews:**
   ```bash
   GET /cafes/1/reviews
   ```

3. **Get AI summary (first time - generates new summary):**
   ```bash
   GET /cafes/1/reviews/summary
   ```
   Response: `"cached": false`

4. **Get AI summary (subsequent calls - uses cached):**
   ```bash
   GET /cafes/1/reviews/summary
   ```
   Response: `"cached": true`

5. **Force regenerate summary after new reviews:**
   ```bash
   GET /cafes/1/reviews/summary?force=true
   ```

---

## How the Summarization Works

1. **First Request:** When you request a summary for the first time, the system:
   - Fetches all reviews from the database
   - Sends them to Claude API for summarization
   - Stores the summary in `review_summaries` table
   - Returns the summary with `"cached": false`

2. **Cached Requests:** Subsequent requests return the cached summary with `"cached": true`

3. **Force Regeneration:** Using `?force=true` will:
   - Fetch fresh reviews from database
   - Generate a new summary
   - Update the cached summary
   - Return new summary with `"cached": false`

---

## Database Relationships

```
Cafe (1) ──< (many) Review
User (1) ──< (many) Review
Cafe (1) ──── (1) ReviewSummary
```

Each cafe can have many reviews, each review belongs to one user and one cafe, and each cafe has one summary that aggregates all its reviews.

---

## Error Handling

The API handles the following errors:

- **404 Not Found:** Cafe doesn't exist when creating a review
- **500 Internal Server Error:** Issues with AI summarization service

---

## Future Enhancements

Potential improvements to consider:

- Add review editing and deletion endpoints
- Implement review voting (helpful/not helpful)
- Add pagination for large review lists
- Include review sentiment analysis
- Add review moderation/flagging
- Implement automatic summary regeneration when new reviews are added
- Add review filtering (by rating, date, etc.)

---

## Notes

- Reviews use timezone-aware timestamps (UTC)
- Summaries are cached for performance
- The `force` parameter allows manual cache invalidation
- Rating field is optional (some reviews may be text-only)