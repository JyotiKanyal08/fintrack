from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from auth import verify_token
import models
import schemas

router = APIRouter(
    prefix="/goals",
    tags=["goals"]
)


@router.post("/")
def add_goal(
    payload: schemas.GoalCreate,
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    goal = models.Goal(
        user_id=uid,
        name=payload.name,
        target_amount=payload.target_amount,
        deadline=payload.deadline,
        saved_amount=payload.saved_amount
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