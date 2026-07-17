from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from auth import verify_token
import models
import schemas

router = APIRouter(
    prefix="/bills",
    tags=["bills"]
)

@router.post("/")
def add_bill(
    name: str,
    amount: float,
    due_day: int,
    category: str,
    is_paid: bool = False,
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):

    bill = models.Bill(
        user_id=uid,
        name=name,
        amount=amount,
        due_day=due_day,
        category=category,
        is_paid=is_paid,
        last_paid_month=None,
        last_paid_year=None
    )

    db.add(bill)
    db.commit()
    db.refresh(bill)

    return bill

@router.get("/")
def get_bills(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):

    bills = db.query(models.Bill).filter(
        models.Bill.user_id == uid
    ).all()

    today = datetime.now()
    updated = False

    for bill in bills:

        if bill.is_paid:

            if (
                bill.last_paid_month != today.month or
                bill.last_paid_year != today.year
            ):
                bill.is_paid = False
                updated = True

    if updated:
        db.commit()

    return bills

@router.put("/{bill_id}")
def mark_bill_paid(
    bill_id: int,
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):

    bill = db.query(models.Bill).filter(
        models.Bill.id == bill_id,
        models.Bill.user_id == uid
    ).first()

    if not bill:
        return {"error": "Bill not found"}

    today = datetime.now()

    bill.is_paid = True
    bill.last_paid_month = today.month
    bill.last_paid_year = today.year

    db.commit()
    db.refresh(bill)

    return bill