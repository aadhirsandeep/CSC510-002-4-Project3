# Contributing Guide

Thank you for your interest in contributing to Calorie Connect! This guide outlines coding standards, best practices, and tips for extending the system without breaking existing functionality.

## Table of Contents

- [Code Style](#code-style)
- [Project Structure](#project-structure)
- [Testing Requirements](#testing-requirements)
- [API Design Patterns](#api-design-patterns)
- [Database Patterns](#database-patterns)
- [Authentication & Authorization](#authentication--authorization)
- [Common Patterns](#common-patterns)
- [Extending the System](#extending-the-system)
- [Common Pitfalls](#common-pitfalls)

## Code Style

### Python (Backend)

- **Follow PEP 8** style guidelines
- **Use type hints** for function parameters and return types
- **Docstrings**: Use triple-quoted strings for module, class, and function documentation
- **Copyright Header**: All files must include the copyright header at the top:
  ```python
  # Copyright (c) 2025 Group 2
  # All rights reserved.
  # 
  # This project and its source code are the property of Group 2:
  # - Aryan Tapkire
  # - Dilip Irala Narasimhareddy
  # - Sachi Vyas
  # - Supraj Gijre
  ```

### Naming Conventions

- **Files**: `snake_case.py` (e.g., `cart.py`, `order_management.py`)
- **Classes**: `PascalCase` (e.g., `Order`, `CartItem`)
- **Functions/Variables**: `snake_case` (e.g., `place_order`, `get_cart_summary`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_ORDER_ITEMS`)
- **Database Models**: Singular `PascalCase` (e.g., `User`, `Order`, `Cafe`)

### Code Organization

```python
# 1. Copyright header
# 2. Module docstring
"""Brief description of the module."""

# 3. Standard library imports
from datetime import datetime
from typing import List, Optional

# 4. Third-party imports
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# 5. Local imports
from ..database import get_db
from ..models import Order
from ..schemas import OrderOut
```

## Project Structure

```
proj2/backend/
├── app/
│   ├── main.py              # FastAPI app setup, CORS, router mounting
│   ├── database.py          # SQLAlchemy engine, session factory
│   ├── config.py            # Settings and environment variables
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic schemas for validation
│   ├── auth.py              # JWT authentication helpers
│   ├── deps.py              # FastAPI dependencies (get_current_user, etc.)
│   ├── routers/             # API route handlers (one file per domain)
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── cafes.py
│   │   ├── orders.py
│   │   └── ...
│   └── services/            # Business logic (reusable across routers)
│       ├── driver.py
│       ├── ocr.py
│       └── recommend.py
└── tests/                   # Test files (mirror app/ structure)
    ├── conftest.py          # Pytest fixtures
    ├── test_integration_*.py
    └── test_unit_*.py
```

### Where to Put New Code

- **New API endpoints**: Add to the appropriate router in `app/routers/`
- **Business logic**: Create or extend services in `app/services/`
- **Database models**: Add to `app/models.py`
- **Request/Response schemas**: Add to `app/schemas.py`
- **Shared dependencies**: Add to `app/deps.py`
- **Tests**: Add to `tests/` with descriptive names

## Testing Requirements

### Test Naming

- **Integration tests**: `test_integration_<feature>.py`
- **Unit tests**: `test_unit_<component>.py`
- **Test functions**: `test_<what_it_tests>`

### Test Quality Standards

**✅ Good Tests:**
- Test complete workflows (e.g., place order → update status → assign driver)
- Test business logic and edge cases
- Test authorization and permissions
- Test data integrity and constraints

**❌ Avoid:**
- Trivial tests (e.g., setting a variable and checking it)
- Tests that don't validate core assumptions
- Tests that duplicate trivial logic

### Example Test Structure

```python
def test_order_workflow_with_driver_assignment(client, db_session):
    """Test complete order lifecycle with automatic driver assignment."""
    # 1. Setup: Create users, cafe, items
    # 2. Action: Place order, update status
    # 3. Assert: Verify driver assignment, status transitions
    pass
```

### Running Tests

```bash
# Run all tests
pytest -q

# Run specific test file
pytest tests/test_integration_orders.py

# Run with coverage
pytest --cov=app --cov-report=term-missing

# Run only integration tests
pytest tests/test_integration_*.py
```

## API Design Patterns

### Router Setup

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("/place", response_model=OrderOut)
def place_order(
    data: PlaceOrderRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user)
):
    """Clear docstring explaining what this endpoint does."""
    # Implementation
    pass
```

### Error Handling

```python
# Use HTTPException with appropriate status codes
if not order:
    raise HTTPException(status_code=404, detail="Order not found")

if order.user_id != current.id:
    raise HTTPException(status_code=403, detail="Not authorized")

# For validation errors, FastAPI/Pydantic handles 422 automatically
```

### Response Models

- Always specify `response_model` in route decorators
- Use Pydantic schemas from `app/schemas.py` for responses
- Create separate schemas for requests (`*Request`) and responses (`*Out`)

## Database Patterns

### Model Definition

```python
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")
```

### Database Sessions

- **Always use dependency injection**: `db: Session = Depends(get_db)`
- **Never create sessions manually** in route handlers
- **Commit explicitly**: `db.commit()` after changes
- **Refresh objects**: `db.refresh(order)` after commit to get updated fields
- **Handle transactions**: Use try/except and rollback on errors

### Query Patterns

```python
# Single object
order = db.query(Order).filter(Order.id == order_id).first()
if not order:
    raise HTTPException(status_code=404, detail="Order not found")

# Multiple objects with joins
rows = db.query(CartItem, Item).join(Item, CartItem.item_id == Item.id).all()

# Aggregations
total = db.query(func.sum(Order.total_price)).filter(...).scalar()
```

## Authentication & Authorization

### User Roles

- **USER**: Regular customers
- **OWNER**: Cafe owners
- **STAFF**: Cafe staff members
- **ADMIN**: System administrators
- **DRIVER**: Delivery drivers

### Protecting Endpoints

```python
from ..deps import get_current_user, require_cafe_staff_or_owner

# Require authentication
@router.get("/my-orders")
def get_my_orders(current: User = Depends(get_current_user)):
    pass

# Require specific role
@router.post("/admin/action")
def admin_action(current: User = Depends(require_admin)):
    pass

# Require cafe ownership/staff
@router.get("/cafes/{cafe_id}/orders")
def get_cafe_orders(
    cafe_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_cafe_staff_or_owner)
):
    # require_cafe_staff_or_owner checks ownership automatically
    pass
```

### Authorization Checks

```python
# Check ownership
if order.user_id != current.id:
    raise HTTPException(status_code=403, detail="Not authorized")

# Check role
if current.role != Role.ADMIN:
    raise HTTPException(status_code=403, detail="Admin only")
```

## Common Patterns

### Order Status Transitions

Order statuses follow a strict workflow:
```
PENDING → ACCEPTED → READY → PICKED_UP → DELIVERED
    ↓         ↓
DECLINED   CANCELLED
```

**Always validate transitions** before updating:
```python
valid_transitions = {
    OrderStatus.PENDING: [OrderStatus.ACCEPTED, OrderStatus.DECLINED],
    OrderStatus.ACCEPTED: [OrderStatus.READY, OrderStatus.CANCELLED],
    # ...
}
if new_status not in valid_transitions.get(order.status, []):
    raise HTTPException(status_code=400, detail="Invalid status transition")
```

### Driver Assignment

- **Auto-assignment**: Happens automatically when order status changes to `ACCEPTED` or `READY`
- **Manual assignment**: Use `/orders/{order_id}/assign` endpoint
- **Check existing assignment**: Always verify if driver is already assigned before manual assignment
- **Update driver status**: Set to `OCCUPIED` when assigned, `IDLE` after delivery

### Cart Management

- **Single restaurant**: Cart can only contain items from one cafe
- **Cart merging**: Items with same `item_id` and `assignee_user_id` are merged
- **Clear on order**: Cart is cleared after successful order placement

## Extending the System

### Adding a New Endpoint

1. **Identify the router**: Add to existing router or create new one
2. **Define schemas**: Add request/response schemas to `app/schemas.py`
3. **Implement route**: Add endpoint with proper authentication
4. **Add tests**: Write integration and/or unit tests
5. **Update docs**: Add endpoint to `backend/README.md` if significant

### Adding a New Model

1. **Define model**: Add to `app/models.py` with proper relationships
2. **Create migration**: Tables are auto-created, but document schema changes
3. **Add schemas**: Create Pydantic schemas in `app/schemas.py`
4. **Update routers**: Add CRUD endpoints if needed
5. **Add tests**: Test model creation, relationships, constraints

### Adding a New Service

1. **Create service file**: Add to `app/services/` (e.g., `app/services/notifications.py`)
2. **Keep it pure**: Services should be independent of FastAPI/HTTP concerns
3. **Use dependency injection**: Accept `db: Session` as parameter
4. **Add tests**: Write unit tests for service functions

### Adding a New Router

1. **Create router file**: `app/routers/new_feature.py`
2. **Define router**: `router = APIRouter(prefix="/feature", tags=["feature"])`
3. **Mount in main.py**: `app.include_router(new_feature_router)`
4. **Add tests**: Create `tests/test_integration_new_feature.py`

## Common Pitfalls

### ❌ Don't Do This

1. **Direct database access in routes**: Always use dependency injection
   ```python
   # BAD
   db = SessionLocal()
   
   # GOOD
   def my_route(db: Session = Depends(get_db)):
   ```

2. **Missing error handling**: Always check for None/empty results
   ```python
   # BAD
   order = db.query(Order).filter(Order.id == id).first()
   return order.user_id  # Could be None
   
   # GOOD
   order = db.query(Order).filter(Order.id == id).first()
   if not order:
       raise HTTPException(status_code=404, detail="Order not found")
   ```

3. **Hardcoded values**: Use configuration or constants
   ```python
   # BAD
   token_expiry = 60
   
   # GOOD
   token_expiry = settings.ACCESS_TOKEN_EXPIRE_MINUTES
   ```

4. **Missing authorization checks**: Always verify permissions
   ```python
   # BAD
   @router.delete("/orders/{order_id}")
   def delete_order(order_id: int):
       db.query(Order).filter(Order.id == order_id).delete()
   
   # GOOD
   @router.delete("/orders/{order_id}")
   def delete_order(order_id: int, current: User = Depends(get_current_user)):
       order = db.query(Order).filter(Order.id == order_id).first()
       if order.user_id != current.id and current.role != Role.ADMIN:
           raise HTTPException(status_code=403, detail="Not authorized")
   ```

5. **Ignoring status transitions**: Validate state changes
   ```python
   # BAD
   order.status = new_status
   
   # GOOD
   if new_status not in valid_transitions.get(order.status, []):
       raise HTTPException(status_code=400, detail="Invalid transition")
   order.status = new_status
   ```

6. **Not refreshing after commit**: Refresh objects to get updated fields
   ```python
   # BAD
   db.add(order)
   db.commit()
   return order  # May not have generated fields (e.g., id, timestamps)
   
   # GOOD
   db.add(order)
   db.commit()
   db.refresh(order)
   return order
   ```

7. **Cart from wrong cafe**: Always validate cart items belong to the same cafe
   ```python
   # BAD
   order = Order(cafe_id=cafe_id, ...)
   
   # GOOD
   if any(item.cafe_id != cafe_id for item in cart_items):
       raise HTTPException(status_code=400, detail="All items must be from same cafe")
   ```

### ✅ Best Practices

1. **Use type hints**: Improves code clarity and IDE support
2. **Write docstrings**: Document what functions do, not how
3. **Test edge cases**: Test error conditions, empty results, invalid inputs
4. **Use enums**: For status fields, roles, etc.
5. **Validate inputs**: Let Pydantic handle validation via schemas
6. **Keep routes thin**: Move business logic to services
7. **Use transactions**: Group related database operations
8. **Handle errors gracefully**: Return meaningful error messages

## Code Review Checklist

Before submitting a pull request, ensure:

- [ ] Code follows style guidelines (PEP 8, naming conventions)
- [ ] Copyright header is present
- [ ] Type hints are used
- [ ] Docstrings are present for public functions
- [ ] Tests are added/updated and passing
- [ ] No hardcoded values (use config/settings)
- [ ] Authorization checks are in place
- [ ] Error handling is proper
- [ ] Database sessions are managed correctly
- [ ] No breaking changes to existing APIs (or documented)

## Getting Help

- Check existing code in `app/routers/` for examples
- Review test files in `tests/` for testing patterns
- Consult `backend/README.md` for API documentation
- Open an issue for questions or clarifications

Thank you for contributing to Calorie Connect! 🎉

