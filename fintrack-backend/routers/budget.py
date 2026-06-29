from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from auth import verify_token
import models

router = APIRouter(
    prefix="/budget",
    tags=["budget"]
)


@router.post("/")
def add_budget(
    month: str,
    category: str,
    allocated: float,
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)

):
    budget = models.Budget(
        month=month,
        category=category,
        allocated=allocated
    )

    db.add(budget)
    db.commit()
    db.refresh(budget)

    return budget


@router.get("/")
def get_budgets(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)

):
    return db.query(models.Budget).all()