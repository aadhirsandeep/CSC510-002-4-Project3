from app.database import SessionLocal
from app.models import Refund, RefundStatus

db = SessionLocal()
refunds = db.query(Refund).all()
print(f'Total refunds: {len(refunds)}')
pending = db.query(Refund).filter(Refund.status == RefundStatus.PENDING).all()
print(f'Pending refunds: {len(pending)}')
if refunds:
    print('Sample refund:', refunds[0].__dict__)
db.close()
