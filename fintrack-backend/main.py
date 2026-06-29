from fastapi import FastAPI, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime

from database import engine, get_db
from auth import verify_token
import models
from routers import (
    transactions,
    bills,
    goals,
    budget,
    buddy
)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinTrack API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router)
app.include_router(bills.router)
app.include_router(goals.router)
app.include_router(budget.router)
app.include_router(buddy.router)


@app.get("/")
def root():
    return {"message": "FinTrack API running"}


@app.get("/protected")
def protected_route(uid: str = Depends(verify_token)):
    return {"message": f"Hello user {uid}"}


@app.get("/test-token")
def test_token(authorization: str = Header(...)):
    return {"received": authorization}


def get_or_create_user(uid: str, db: Session):
    """Looks up the user by Firebase UID. Creates a new user row if one doesn't exist yet."""
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        user = models.User(id=uid, email="", name="", monthly_income=0)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@app.get("/health-score")
def health_score(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    user = get_or_create_user(uid, db)

    now = datetime.now()
    txns = db.query(models.Transaction).filter(
        models.Transaction.user_id == user.id,
        extract('month', models.Transaction.date) == now.month
    ).all()

    income = sum(t.amount for t in txns if t.type == "income")
    expense = sum(t.amount for t in txns if t.type == "expense")

    savings_rate = (
        ((income - expense) / income) * 100
        if income > 0 else 0
    )

    user_bills = db.query(models.Bill).filter(
        models.Bill.user_id == user.id
    ).all()

    bill_score = (
        sum(1 for b in user_bills if b.is_paid) / len(user_bills) * 100
        if user_bills else 100
    )

    user_goals = db.query(models.Goal).filter(
        models.Goal.user_id == user.id
    ).all()

    goal_score = (
        sum(g.saved_amount / g.target_amount for g in user_goals) / len(user_goals) * 100
        if user_goals else 50
    )

    score = (
        savings_rate * 0.5
        + bill_score * 0.3
        + goal_score * 0.2
    )
    score = round(min(max(score, 0), 100))
    
    print("Bills:", len(user_bills))
    print("Goals:", len(user_goals))
    print("Score:", score)

    return {
        "score": score,
        "savings_rate": round(savings_rate, 1),
        "bill_consistency": round(bill_score, 1),
        "goal_progress": round(goal_score, 1),
        "income": income,
        "expense": expense
    }