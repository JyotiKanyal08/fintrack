from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import verify_token
import models
import schemas

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

def get_or_create_user(uid: str, db: Session):
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        user = models.User(id=uid, email="", name="", monthly_income=0)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@router.get("/me")
def get_current_user(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    return get_or_create_user(uid, db)

@router.put("/onboarding")
def complete_onboarding(
    payload: schemas.OnboardingUpdate,
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    user = get_or_create_user(uid, db)
    user.monthly_income = payload.monthly_income
    user.onboarding_completed = True
    db.commit()
    db.refresh(user)
    return user