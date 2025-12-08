# Copyright (c) 2025 Group 2
# All rights reserved.
#
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""Refund service layer containing business logic for refund processing."""

from __future__ import annotations

from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, Dict
from ..models import (
    Refund, RefundReason, OrderIssue, Order, Payment, User,
    RefundStatus, RefundCategory, OrderStatus, PaymentStatus, IssueType
)


def calculate_refund_percentage(order: Order, reason_code: Optional[str], db: Session) -> float:
    """
    Calculate refund percentage based on order status and reason code.

    Returns:
        float: Refund percentage (0-100)
    """
    # If reason code provided, look it up
    if reason_code:
        reason = db.query(RefundReason).filter(RefundReason.code == reason_code).first()
        if reason:
            return reason.refund_percentage

    # Default refund percentages based on order status
    status_percentages: Dict[OrderStatus, float] = {
        OrderStatus.PENDING: 100.0,
        OrderStatus.ACCEPTED: 75.0,
        OrderStatus.READY: 50.0,
        OrderStatus.PICKED_UP: 25.0,
        OrderStatus.DELIVERED: 0.0,
        OrderStatus.CANCELLED: 0.0,
        OrderStatus.REFUNDED: 0.0,
    }

    return status_percentages.get(order.status, 0.0)


def should_auto_approve(
    order: Order,
    reason_category: RefundCategory,
    reason_code: Optional[str],
    refund_amount: float,
    db: Session
) -> bool:
    """
    Determine if a refund should be auto-approved based on business rules.

    Returns:
        bool: True if should auto-approve, False if requires manual approval
    """
    # Auto-approve if reason code specifies it
    if reason_code:
        reason = db.query(RefundReason).filter(RefundReason.code == reason_code).first()
        if reason and reason.auto_approve:
            return True

    # Auto-approve for system errors and driver issues
    if reason_category in [RefundCategory.SYSTEM_ERROR, RefundCategory.DRIVER_ISSUE]:
        return True

    # Auto-approve for restaurant issues if order is PENDING or ACCEPTED
    if reason_category == RefundCategory.RESTAURANT_ISSUE:
        if order.status in [OrderStatus.PENDING, OrderStatus.ACCEPTED]:
            return True

    # Require approval for high-value refunds (>$50)
    if refund_amount > 50:
        return False

    # Require approval for post-delivery refunds
    if order.status == OrderStatus.DELIVERED:
        return False

    # Default to auto-approve for smaller amounts in early stages
    if order.status in [OrderStatus.PENDING, OrderStatus.ACCEPTED] and refund_amount <= 50:
        return True

    return False


def create_refund(
    order_id: int,
    reason_category: RefundCategory,
    initiated_by_user_id: int,
    db: Session,
    reason_code: Optional[str] = None,
    reason_description: Optional[str] = None,
    refund_amount: Optional[float] = None,
    refund_percentage: Optional[float] = None,
) -> Refund:
    """
    Create a refund for an order.

    Args:
        order_id: The order to refund
        reason_category: Category of the refund reason
        initiated_by_user_id: User who initiated the refund
        db: Database session
        reason_code: Optional specific reason code
        reason_description: Optional description
        refund_amount: Optional custom refund amount (if None, auto-calculate)
        refund_percentage: Optional custom percentage (if None, auto-calculate)

    Returns:
        Refund: The created refund object
    """
    # Check if order already has a refund request
    existing_refund = db.query(Refund).filter(Refund.order_id == order_id).first()
    if existing_refund:
        raise ValueError(f"Order {order_id} already has a refund request")

    # Get the order
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError(f"Order {order_id} not found")

    # Get the payment if exists
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()

    # Calculate refund amount
    original_amount = order.total_price

    if refund_amount is None:
        # Customers always request full refund amount
        # Restaurant staff can decide on partial refunds during approval
        refund_amount = original_amount
        refund_percentage = 100.0
    else:
        # Calculate percentage from amount
        refund_percentage = (refund_amount / original_amount * 100.0) if original_amount > 0 else 100.0

    # Determine initial status
    auto_approve = should_auto_approve(order, reason_category, reason_code, refund_amount, db)
    initial_status = RefundStatus.APPROVED if auto_approve else RefundStatus.PENDING

    # Create refund
    refund = Refund(
        order_id=order_id,
        payment_id=payment.id if payment else None,
        original_amount=original_amount,
        refund_amount=refund_amount,
        refund_percentage=refund_percentage,
        reason_category=reason_category,
        reason_code=reason_code,
        reason_description=reason_description,
        status=initial_status,
        initiated_by_user_id=initiated_by_user_id,
        requested_at=datetime.utcnow(),
    )

    db.add(refund)
    db.commit()
    db.refresh(refund)

    # If auto-approved, process immediately
    if auto_approve:
        process_refund(refund.id, db, approved_by_user_id=initiated_by_user_id)

    return refund


def process_refund(refund_id: int, db: Session, approved_by_user_id: Optional[int] = None) -> Refund:
    """
    Process an approved refund (update payment status, order status, etc.).

    Args:
        refund_id: The refund to process
        db: Database session
        approved_by_user_id: User who approved (for audit trail)

    Returns:
        Refund: The processed refund
    """
    refund = db.query(Refund).filter(Refund.id == refund_id).first()
    if not refund:
        raise ValueError(f"Refund {refund_id} not found")

    # Update refund status
    refund.status = RefundStatus.PROCESSED
    refund.processed_at = datetime.utcnow()
    if approved_by_user_id:
        refund.approved_by_user_id = approved_by_user_id

    # Mock payment provider refund (in real system, call actual provider API)
    refund.provider_refund_id = f"MOCK_REFUND_{refund_id}"
    refund.provider_status = "success"

    # Update payment status if exists
    if refund.payment_id:
        payment = db.query(Payment).filter(Payment.id == refund.payment_id).first()
        if payment:
            payment.status = PaymentStatus.REFUNDED

    # Update order status
    order = db.query(Order).filter(Order.id == refund.order_id).first()
    if order:
        order.status = OrderStatus.REFUNDED

    db.commit()
    db.refresh(refund)

    return refund


def approve_refund(
    refund_id: int,
    approved_by_user_id: int,
    db: Session,
    approved_amount: Optional[float] = None,
    notes: Optional[str] = None
) -> Refund:
    """
    Approve a pending refund.

    Args:
        refund_id: The refund to approve
        approved_by_user_id: User approving the refund
        db: Database session
        approved_amount: Optional override amount
        notes: Optional admin notes

    Returns:
        Refund: The approved refund
    """
    refund = db.query(Refund).filter(Refund.id == refund_id).first()
    if not refund:
        raise ValueError(f"Refund {refund_id} not found")

    if refund.status != RefundStatus.PENDING:
        raise ValueError(f"Refund {refund_id} is not pending (status: {refund.status})")

    # Update amount if provided
    if approved_amount is not None:
        refund.refund_amount = approved_amount
        refund.refund_percentage = (approved_amount / refund.original_amount * 100.0) if refund.original_amount > 0 else 100.0

    # Approve and process
    refund.status = RefundStatus.APPROVED
    refund.approved_by_user_id = approved_by_user_id

    if notes:
        refund.reason_description = f"{refund.reason_description or ''}\nAdmin notes: {notes}"

    db.commit()
    db.refresh(refund)

    # Process the refund
    return process_refund(refund_id, db, approved_by_user_id)


def reject_refund(
    refund_id: int,
    rejected_by_user_id: int,
    db: Session,
    rejection_reason: str
) -> Refund:
    """
    Reject a pending refund.

    Args:
        refund_id: The refund to reject
        rejected_by_user_id: User rejecting the refund
        db: Database session
        rejection_reason: Reason for rejection

    Returns:
        Refund: The rejected refund
    """
    refund = db.query(Refund).filter(Refund.id == refund_id).first()
    if not refund:
        raise ValueError(f"Refund {refund_id} not found")

    if refund.status != RefundStatus.PENDING:
        raise ValueError(f"Refund {refund_id} is not pending (status: {refund.status})")

    refund.status = RefundStatus.REJECTED
    refund.approved_by_user_id = rejected_by_user_id
    refund.reason_description = f"{refund.reason_description or ''}\nRejection reason: {rejection_reason}"
    refund.processed_at = datetime.utcnow()

    db.commit()
    db.refresh(refund)

    return refund


def get_refund_amount_for_cancellation(order: Order, db: Session) -> float:
    """
    Calculate refund amount for a user-initiated cancellation based on timing.

    Args:
        order: The order being cancelled
        db: Database session

    Returns:
        float: Refund amount
    """
    # Check if within cancellation window
    now = datetime.utcnow()
    if order.can_cancel_until and now <= order.can_cancel_until:
        # Within window - calculate based on status
        percentage = calculate_refund_percentage(order, "USER_CANCEL", db)
        return order.total_price * (percentage / 100.0)

    # Outside window - no refund
    return 0.0
