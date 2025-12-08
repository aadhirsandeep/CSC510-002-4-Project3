# Copyright (c) 2025 Group 2
# All rights reserved.
#
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""Staff management router for assigning and managing staff members for cafes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, Role, StaffAssignment, Cafe
from ..schemas import StaffAssignmentCreate, StaffAssignByEmail, StaffAssignmentOut, StaffMemberOut
from ..deps import get_current_user, require_roles

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post("/assign", response_model=StaffAssignmentOut)
def assign_staff_to_cafe(
    assignment: StaffAssignmentCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(Role.OWNER, Role.ADMIN))
):
    """
    Assign a user as staff to a cafe.
    Only cafe owners and admins can assign staff.
    Owner can only assign staff to their own cafes.
    """
    # Verify cafe exists
    cafe = db.query(Cafe).filter(Cafe.id == assignment.cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")

    # If user is OWNER (not ADMIN), verify they own this cafe
    if current.role == Role.OWNER and cafe.owner_id != current.id:
        raise HTTPException(status_code=403, detail="You can only assign staff to your own cafes")

    # Verify user to be assigned exists
    user = db.query(User).filter(User.id == assignment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user is already assigned to this cafe
    existing = db.query(StaffAssignment).filter(
        StaffAssignment.user_id == assignment.user_id,
        StaffAssignment.cafe_id == assignment.cafe_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already assigned to this cafe")

    # Create staff assignment
    staff_assignment = StaffAssignment(
        user_id=assignment.user_id,
        cafe_id=assignment.cafe_id,
        role=assignment.role or Role.STAFF
    )

    # Update user's role if they're currently just a regular user
    if user.role == Role.USER:
        user.role = assignment.role or Role.STAFF
        db.add(user)

    db.add(staff_assignment)
    db.commit()
    db.refresh(staff_assignment)

    return staff_assignment


@router.post("/assign-by-email", response_model=StaffAssignmentOut)
def assign_staff_by_email(
    assignment: StaffAssignByEmail,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(Role.OWNER, Role.ADMIN))
):
    """
    Assign a user as staff to a cafe by email address.
    Only cafe owners and admins can assign staff.
    Owner can only assign staff to their own cafes.
    """
    # Verify cafe exists
    cafe = db.query(Cafe).filter(Cafe.id == assignment.cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")

    # If user is OWNER (not ADMIN), verify they own this cafe
    if current.role == Role.OWNER and cafe.owner_id != current.id:
        raise HTTPException(status_code=403, detail="You can only assign staff to your own cafes")

    # Find user by email
    user = db.query(User).filter(User.email == assignment.email).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No user found with email: {assignment.email}")

    # Check if user is already assigned to this cafe
    existing = db.query(StaffAssignment).filter(
        StaffAssignment.user_id == user.id,
        StaffAssignment.cafe_id == assignment.cafe_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already assigned to this cafe")

    # Create staff assignment
    staff_assignment = StaffAssignment(
        user_id=user.id,
        cafe_id=assignment.cafe_id,
        role=assignment.role or Role.STAFF
    )

    # Update user's role if they're currently just a regular user
    if user.role == Role.USER:
        user.role = assignment.role or Role.STAFF
        db.add(user)

    db.add(staff_assignment)
    db.commit()
    db.refresh(staff_assignment)

    return staff_assignment


@router.get("/cafe/{cafe_id}", response_model=List[StaffMemberOut])
def get_cafe_staff(
    cafe_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user)
):
    """
    Get all staff members assigned to a cafe.
    Owner, staff, and admins can view staff list.
    """
    # Verify cafe exists
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")

    # Check authorization
    if current.role != Role.ADMIN and cafe.owner_id != current.id:
        # Check if current user is staff at this cafe
        is_staff = db.query(StaffAssignment).filter(
            StaffAssignment.cafe_id == cafe_id,
            StaffAssignment.user_id == current.id
        ).first()
        if not is_staff:
            raise HTTPException(status_code=403, detail="Not authorized to view staff for this cafe")

    # Get all staff assignments for this cafe
    assignments = db.query(StaffAssignment).filter(
        StaffAssignment.cafe_id == cafe_id
    ).all()

    # Build response with user details
    staff_members = []
    for assignment in assignments:
        user = db.query(User).filter(User.id == assignment.user_id).first()
        if user:
            staff_members.append(StaffMemberOut(
                id=assignment.id,
                user_id=user.id,
                cafe_id=assignment.cafe_id,
                name=user.name,
                email=user.email,
                role=assignment.role,
                is_active=user.is_active
            ))

    return staff_members


@router.put("/{assignment_id}", response_model=StaffAssignmentOut)
def update_staff_assignment(
    assignment_id: int,
    role: Role,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(Role.OWNER, Role.ADMIN))
):
    """
    Update a staff assignment's role.
    Only cafe owners and admins can update staff roles.
    """
    assignment = db.query(StaffAssignment).filter(StaffAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Staff assignment not found")

    # Verify authorization
    cafe = db.query(Cafe).filter(Cafe.id == assignment.cafe_id).first()
    if current.role == Role.OWNER and cafe.owner_id != current.id:
        raise HTTPException(status_code=403, detail="You can only update staff for your own cafes")

    # Update role
    assignment.role = role

    # Also update user's role
    user = db.query(User).filter(User.id == assignment.user_id).first()
    if user:
        user.role = role
        db.add(user)

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment


@router.delete("/{assignment_id}")
def remove_staff_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(Role.OWNER, Role.ADMIN))
):
    """
    Remove a staff assignment from a cafe.
    Only cafe owners and admins can remove staff.
    """
    assignment = db.query(StaffAssignment).filter(StaffAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Staff assignment not found")

    # Verify authorization
    cafe = db.query(Cafe).filter(Cafe.id == assignment.cafe_id).first()
    if current.role == Role.OWNER and cafe.owner_id != current.id:
        raise HTTPException(status_code=403, detail="You can only remove staff from your own cafes")

    # Check if user has other staff assignments
    user_id = assignment.user_id
    other_assignments = db.query(StaffAssignment).filter(
        StaffAssignment.user_id == user_id,
        StaffAssignment.id != assignment_id
    ).count()

    # If no other assignments, revert user role to USER
    if other_assignments == 0:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.role in [Role.STAFF]:
            user.role = Role.USER
            db.add(user)

    db.delete(assignment)
    db.commit()

    return {"message": "Staff assignment removed successfully"}


@router.post("/{assignment_id}/toggle-active")
def toggle_staff_active_status(
    assignment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(Role.OWNER, Role.ADMIN))
):
    """
    Toggle a staff member's active status.
    Only cafe owners and admins can toggle staff status.
    """
    assignment = db.query(StaffAssignment).filter(StaffAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Staff assignment not found")

    # Verify authorization
    cafe = db.query(Cafe).filter(Cafe.id == assignment.cafe_id).first()
    if current.role == Role.OWNER and cafe.owner_id != current.id:
        raise HTTPException(status_code=403, detail="You can only modify staff for your own cafes")

    # Toggle user's active status
    user = db.query(User).filter(User.id == assignment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": f"Staff member {'activated' if user.is_active else 'deactivated'} successfully", "is_active": user.is_active}
