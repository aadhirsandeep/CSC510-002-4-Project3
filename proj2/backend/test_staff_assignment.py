"""
Quick script to check and assign staff to cafe for testing.
"""
from app.database import SessionLocal
from app.models import User, Cafe, StaffAssignment, Role

db = SessionLocal()

# Find the staff user
staff_user = db.query(User).filter(User.email == "staff@gmail.com").first()
print(f"Staff user: {staff_user}")
if staff_user:
    print(f"  - ID: {staff_user.id}")
    print(f"  - Name: {staff_user.name}")
    print(f"  - Role: {staff_user.role}")

# Find the owner user
owner_user = db.query(User).filter(User.email == "bob@gmail.com").first()
print(f"\nOwner user: {owner_user}")
if owner_user:
    print(f"  - ID: {owner_user.id}")
    print(f"  - Name: {owner_user.name}")
    print(f"  - Role: {owner_user.role}")

# Find the cafe
cafe = db.query(Cafe).filter(Cafe.owner_id == owner_user.id).first() if owner_user else None
print(f"\nCafe: {cafe}")
if cafe:
    print(f"  - ID: {cafe.id}")
    print(f"  - Name: {cafe.name}")
    print(f"  - Owner ID: {cafe.owner_id}")

# Check if staff is already assigned
if staff_user and cafe:
    existing = db.query(StaffAssignment).filter(
        StaffAssignment.user_id == staff_user.id,
        StaffAssignment.cafe_id == cafe.id
    ).first()

    print(f"\nExisting assignment: {existing}")
    if existing:
        print(f"  - Assignment ID: {existing.id}")
        print(f"  - User ID: {existing.user_id}")
        print(f"  - Cafe ID: {existing.cafe_id}")
        print(f"  - Role: {existing.role}")
    else:
        print("  - No assignment found. Creating one...")
        assignment = StaffAssignment(
            user_id=staff_user.id,
            cafe_id=cafe.id,
            role=Role.STAFF
        )
        db.add(assignment)
        db.commit()
        print(f"  [SUCCESS] Created assignment ID: {assignment.id}")

db.close()
