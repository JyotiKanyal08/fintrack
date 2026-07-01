from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from stable_baselines3 import PPO
import numpy as np

from database import get_db
from auth import verify_token
import models

rl_model = PPO.load("budget_optimizer_model")

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

@router.get("/recommend")
def recommend_budget(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    user = db.query(models.User).filter(models.User.id == uid).first()

    txns = db.query(models.Transaction).filter(
        models.Transaction.user_id == uid,
        models.Transaction.type == "expense"
    ).all()

    food_spend = sum(t.amount for t in txns if t.category == "Food") or 5000
    entertainment_spend = sum(t.amount for t in txns if t.category == "Entertainment") or 1500
    income = user.monthly_income or 35000
    state = np.array([income, food_spend, entertainment_spend, 10, 1], dtype=np.float32)

    action, _ = rl_model.predict(state)
    action = np.clip(action, 0, None)
    action = action / (np.sum(action) + 1e-8)  

    labels = ["savings", "food", "entertainment", "transport", "misc"]

    tips = {
        "savings": "Aim to automate this — set up an auto-transfer right after payday so it never feels optional.",
        "food": "Cooking 2-3 meals a week at home can meaningfully reduce this without feeling restrictive.",
        "entertainment": "Keep this guilt-free, just track it so it doesn't quietly creep up month over month.",
        "transport": "Consider a monthly metro/bus pass if you commute daily — usually cheaper than per-ride costs.",
        "misc": "This is your buffer for unexpected costs — try not to dip into savings before this runs out.",
    }

    recommendation = {}
    for label, pct in zip(labels, action):
        pct_val = round(float(pct) * 100, 1)
        amount_val = round(income * float(pct), 0)
        recommendation[label] = {
            "percentage": pct_val,
            "amount": amount_val,
            "tip": tips[label]
        }

    return {
        "income_used": income,
        "recommendation": recommendation
    }