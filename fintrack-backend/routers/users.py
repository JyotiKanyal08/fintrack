from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from firebase_admin import auth as firebase_auth

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
        try:
            firebase_user = firebase_auth.get_user(uid)
            email = firebase_user.email or f"{uid}@fintrack.local"
        except Exception:
            email = f"{uid}@fintrack.local"

        user = models.User(id=uid, email=email, name="", monthly_income=0)
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

    # Seed a first income transaction so the dashboard isn't empty
    existing_txns = db.query(models.Transaction).filter(
        models.Transaction.user_id == uid
    ).count()

    if existing_txns == 0 and payload.monthly_income > 0:
        seed_txn = models.Transaction(
            user_id=uid,
            amount=payload.monthly_income,
            category="Salary",
            type="income",
            description="Monthly Income (from onboarding)"
        )
        db.add(seed_txn)
        db.commit()

    return user