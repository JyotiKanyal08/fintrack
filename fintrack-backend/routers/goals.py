from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from auth import verify_token
import models

router = APIRouter(
    prefix="/goals",
    tags=["goals"]
)


@router.post("/")
def add_goal(
    name: str,
    target_amount: float,
    saved_amount: float = 0,
    deadline: datetime = None,
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    goal = models.Goal(
        user_id=uid,
        name=name,
        target_amount=target_amount,
        deadline=deadline,
        saved_amount=saved_amount
    )

    db.add(goal)
    db.commit()
    db.refresh(goal)

    return goal


@router.get("/")
def get_goals(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    return db.query(models.Goal).filter(
        models.Goal.user_id == uid
        ).all()


@router.put("/{goal_id}")
def add_savings(
    goal_id: int,
    amount: float,
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == uid
        ).first()

    if not goal:
        return {"error": "Goal not found"}

    goal.saved_amount += amount

    db.commit()
    db.refresh(goal)

    return goal