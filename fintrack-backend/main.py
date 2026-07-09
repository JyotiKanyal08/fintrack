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
    buddy,
    insights,
    analytics
)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinTrack API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
    "https://fintrack-nine-sepia.vercel.app",
    "https://fintrack-ahc4hwer0-jyoti-kanyal08.vercel.app",
    "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router)
app.include_router(bills.router)
app.include_router(goals.router)
app.include_router(budget.router)
app.include_router(buddy.router)
app.include_router(insights.router)
app.include_router(analytics.router)


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
    user = db.query(models.User).filter(models.User.id == uid).first()

    if not user:
        user = models.User(
            id=uid,
            email="",
            name="",
            monthly_income=0
        )
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
    now  = datetime.now()
    
    txns = db.query(models.Transaction).filter(
        models.Transaction.user_id == user.id,
        extract('month', models.Transaction.date) == now.month,
        extract('year',  models.Transaction.date) == now.year
    ).all()
    
    if not txns:
        all_txns = db.query(models.Transaction).filter(
            models.Transaction.user_id == user.id
        ).order_by(models.Transaction.date.desc()).all()

        if all_txns:
            latest_date = all_txns[0].date
            txns = [
                t for t in all_txns
                if t.date.month == latest_date.month
                and t.date.year  == latest_date.year
            ]

    print("Transactions Found:", len(txns))

    income = sum(
        t.amount
        for t in txns
        if t.type.lower() == "income"
    )

    expense = sum(
        t.amount
        for t in txns
        if t.type.lower() == "expense"
    )

    print("Income:", income)
    print("Expense:", expense)

    if income > 0:
        savings_rate = ((income - expense) / income) * 100
    else:
        savings_rate = 0

    user_bills = db.query(models.Bill).filter(
        models.Bill.user_id == user.id
    ).all()

    if len(user_bills) > 0:
        bill_score = (
            sum(1 for b in user_bills if b.is_paid)
            / len(user_bills)
        ) * 100
    else:
        bill_score = 100

    user_goals = db.query(models.Goal).filter(
        models.Goal.user_id == user.id
    ).all()

    if len(user_goals) > 0:
        goal_score = (
            sum(
                g.saved_amount / g.target_amount
                for g in user_goals
            )
            / len(user_goals)
        ) * 100
    else:
        goal_score = 50

    score = (
        savings_rate * 0.5
        + bill_score * 0.3
        + goal_score * 0.2
    )

    score = round(max(0, min(score, 100)))

    return {
        "score": score,
        "savings_rate": round(savings_rate, 1),
        "bill_consistency": round(bill_score, 1),
        "goal_progress": round(goal_score, 1),
        "income": round(income, 2),
        "expense": round(expense, 2)
    }