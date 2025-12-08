# Copyright (c) 2025 Group 2
# All rights reserved.
#
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""Refund router handling refund-related API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..schemas import (
    RefundCreate, RefundOut, RefundApprove, RefundReject,
    RefundReasonCreate, RefundReasonOut,
    OrderIssueCreate, OrderIssueOut, OrderIssueResolve
)
from ..models import (
    Refund, RefundReason, OrderIssue, Order, User, Role,
    RefundStatus, IssueStatus, RefundCategory
)
from ..deps import get_current_user, require_roles
from ..services.refund import (
    create_refund, approve_refund, reject_refund, process_refund
)

router = APIRouter(prefix="/refunds", tags=["refunds"])


@router.post("/request", response_model=RefundOut)
def request_refund(
    data: RefundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Request a refund for an order.
    Users can only refund their own orders.
    Staff/Admin can refund any order.
    """
    # Get the order
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check permissions
    if current_user.role not in [Role.ADMIN, Role.STAFF]:
        if order.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot refund another user's order")

    # Check if order already has any refund request
    existing_refund = db.query(Refund).filter(
        Refund.order_id == data.order_id
    ).first()

    if existing_refund:
        raise HTTPException(status_code=400, detail="A refund has already been requested for this order")

    try:
        refund = create_refund(
            order_id=data.order_id,
            reason_category=data.reason_category,
            initiated_by_user_id=current_user.id,
            db=db,
            reason_code=data.reason_code,
            reason_description=data.reason_description,
            refund_amount=data.refund_amount,
            refund_percentage=data.refund_percentage,
        )
        return refund
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/pending", response_model=List[RefundOut])
def get_pending_refunds(
    db: Session = Depends(get_db),
    staff_or_admin: User = Depends(require_roles(Role.STAFF, Role.ADMIN))
):
    """Get all pending refunds (staff/admin only)."""
    refunds = db.query(Refund).filter(Refund.status == RefundStatus.PENDING).all()
    return refunds


@router.get("/my", response_model=List[RefundOut])
def get_my_refunds(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all refunds initiated by current user."""
    refunds = db.query(Refund).filter(Refund.initiated_by_user_id == current_user.id).all()
    return refunds


@router.get("/order/{order_id}", response_model=List[RefundOut])
def get_refunds_for_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all refunds for a specific order."""
    # Get the order and check permissions
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if current_user.role not in [Role.ADMIN, Role.STAFF]:
        if order.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    refunds = db.query(Refund).filter(Refund.order_id == order_id).all()
    return refunds


@router.get("/{refund_id}", response_model=RefundOut)
def get_refund(
    refund_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific refund."""
    refund = db.query(Refund).filter(Refund.id == refund_id).first()
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")

    # Check permissions
    order = db.query(Order).filter(Order.id == refund.order_id).first()
    if current_user.role not in [Role.ADMIN, Role.STAFF]:
        if order and order.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    return refund


@router.post("/{refund_id}/approve", response_model=RefundOut)
def approve_refund_endpoint(
    refund_id: int,
    data: RefundApprove,
    db: Session = Depends(get_db),
    staff_or_admin: User = Depends(require_roles(Role.STAFF, Role.ADMIN))
):
    """Approve a pending refund (staff/admin only)."""
    try:
        refund = approve_refund(
            refund_id=refund_id,
            approved_by_user_id=staff_or_admin.id,
            db=db,
            approved_amount=data.approved_amount,
            notes=data.notes
        )
        return refund
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{refund_id}/reject", response_model=RefundOut)
def reject_refund_endpoint(
    refund_id: int,
    data: RefundReject,
    db: Session = Depends(get_db),
    staff_or_admin: User = Depends(require_roles(Role.STAFF, Role.ADMIN))
):
    """Reject a pending refund (staff/admin only)."""
    try:
        refund = reject_refund(
            refund_id=refund_id,
            rejected_by_user_id=staff_or_admin.id,
            db=db,
            rejection_reason=data.rejection_reason
        )
        return refund
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Refund Reasons Management
# ============================================================================

@router.get("/reasons/", response_model=List[RefundReasonOut])
def list_refund_reasons(
    category: Optional[RefundCategory] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get available refund reasons, optionally filtered by category."""
    query = db.query(RefundReason)

    if active_only:
        query = query.filter(RefundReason.active == True)

    if category:
        query = query.filter(RefundReason.category == category)

    return query.all()


@router.post("/reasons/", response_model=RefundReasonOut)
def create_refund_reason(
    data: RefundReasonCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN))
):
    """Create a new refund reason (admin only)."""
    # Check if code already exists
    existing = db.query(RefundReason).filter(RefundReason.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Reason code '{data.code}' already exists")

    reason = RefundReason(**data.dict())
    db.add(reason)
    db.commit()
    db.refresh(reason)
    return reason


# ============================================================================
# Order Issues
# ============================================================================

@router.post("/issues/report", response_model=OrderIssueOut)
def report_order_issue(
    data: OrderIssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Report an issue with an order.
    Can optionally trigger a refund request.
    """
    # Get the order
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check permissions
    if current_user.role not in [Role.ADMIN, Role.STAFF, Role.DRIVER]:
        if order.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot report issue for another user's order")

    # Create order issue
    issue = OrderIssue(
        order_id=data.order_id,
        reported_by_user_id=current_user.id,
        reporter_role=current_user.role,
        issue_type=data.issue_type,
        description=data.description,
        status=IssueStatus.REPORTED,
        reported_at=datetime.utcnow()
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)

    # If refund requested, create refund
    if data.request_refund:
        # Map issue type to refund category
        category_mapping = {
            "QUALITY": RefundCategory.RESTAURANT_ISSUE,
            "DELAY": RefundCategory.RESTAURANT_ISSUE,
            "DAMAGE": RefundCategory.DRIVER_ISSUE,
            "NO_SHOW": RefundCategory.DRIVER_ISSUE,
            "OUT_OF_STOCK": RefundCategory.RESTAURANT_ISSUE,
            "CANCELLATION": RefundCategory.RESTAURANT_ISSUE,
            "OTHER": RefundCategory.OTHER,
        }

        category = category_mapping.get(data.issue_type.value, RefundCategory.OTHER)

        try:
            create_refund(
                order_id=data.order_id,
                reason_category=category,
                initiated_by_user_id=current_user.id,
                db=db,
                reason_code=data.issue_type.value,
                reason_description=data.description,
            )
        except ValueError as e:
            # Issue created but refund failed - log but don't fail the request
            pass

    return issue


@router.get("/issues/order/{order_id}", response_model=List[OrderIssueOut])
def get_order_issues(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all issues reported for a specific order."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if current_user.role not in [Role.ADMIN, Role.STAFF]:
        if order.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    issues = db.query(OrderIssue).filter(OrderIssue.order_id == order_id).all()
    return issues


@router.put("/issues/{issue_id}/resolve", response_model=OrderIssueOut)
def resolve_order_issue(
    issue_id: int,
    data: OrderIssueResolve,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN))
):
    """Resolve an order issue (admin only)."""
    issue = db.query(OrderIssue).filter(OrderIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.status = IssueStatus.RESOLVED
    issue.assigned_to_user_id = admin.id
    issue.resolution_notes = data.resolution_notes
    issue.resolved_at = datetime.utcnow()

    # If refund approved, create refund
    if data.refund_approved:
        category_mapping = {
            "QUALITY": RefundCategory.RESTAURANT_ISSUE,
            "DELAY": RefundCategory.RESTAURANT_ISSUE,
            "DAMAGE": RefundCategory.DRIVER_ISSUE,
            "NO_SHOW": RefundCategory.DRIVER_ISSUE,
            "OUT_OF_STOCK": RefundCategory.RESTAURANT_ISSUE,
            "CANCELLATION": RefundCategory.RESTAURANT_ISSUE,
            "OTHER": RefundCategory.OTHER,
        }

        category = category_mapping.get(issue.issue_type.value, RefundCategory.OTHER)

        try:
            create_refund(
                order_id=issue.order_id,
                reason_category=category,
                initiated_by_user_id=admin.id,
                db=db,
                reason_code=issue.issue_type.value,
                reason_description=f"Resolved issue #{issue_id}: {data.resolution_notes}",
                refund_amount=data.refund_amount,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Failed to create refund: {str(e)}")

    db.commit()
    db.refresh(issue)
    return issue
