from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from auth import verify_token
import models

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"]
)

@router.post("/")
def add_transaction(
    amount: float,
    category: str,
    type: str,
    description: str,
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    transaction = models.Transaction(
        user_id=uid,
        amount=amount,
        category=category,
        type=type,
        description=description
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("/")
def get_transactions(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    return db.query(models.Transaction).filter(
        models.Transaction.user_id == uid
    ).all()