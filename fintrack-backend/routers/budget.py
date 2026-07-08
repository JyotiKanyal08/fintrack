from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import verify_token
import models

router = APIRouter(prefix="/budget", tags=["budget"])

rl_model = None
try:
    import numpy as np
    from stable_baselines3 import PPO
    rl_model = PPO.load("budget_optimizer_model")
    print("RL model loaded successfully")
except Exception as e:
    print(f"RL model not available: {e} — using rule-based fallback")


def rule_based_recommendation(income):
    tips = {
        "savings":       "Automate this — set up an auto-transfer right after payday.",
        "food":          "Cooking 2-3 meals at home per week can reduce this significantly.",
        "entertainment": "Keep this guilt-free, just track it monthly.",
        "transport":     "Consider a monthly pass if you commute daily.",
        "misc":          "Your buffer for unexpected costs."
    }
    return {
        "savings":       {"percentage": 20.0, "amount": round(income * 0.20, 0), "tip": tips["savings"]},
        "food":          {"percentage": 15.0, "amount": round(income * 0.15, 0), "tip": tips["food"]},
        "entertainment": {"percentage": 10.0, "amount": round(income * 0.10, 0), "tip": tips["entertainment"]},
        "transport":     {"percentage": 10.0, "amount": round(income * 0.10, 0), "tip": tips["transport"]},
        "misc":          {"percentage": 5.0,  "amount": round(income * 0.05, 0), "tip": tips["misc"]},
    }


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

    food_spend          = sum(t.amount for t in txns if t.category == "Food") or 5000
    entertainment_spend = sum(t.amount for t in txns if t.category == "Entertainment") or 1500
    income              = user.monthly_income or 35000

    if rl_model is not None:
        import numpy as np
        state  = np.array([income, food_spend, entertainment_spend, 10, 1], dtype=np.float32)
        action, _ = rl_model.predict(state)
        action = action / (np.sum(action) + 1e-8)
        labels = ["savings", "food", "entertainment", "transport", "misc"]
        tips   = {
            "savings":       "Automate this — set up an auto-transfer right after payday.",
            "food":          "Cooking 2-3 meals at home per week can reduce this.",
            "entertainment": "Keep this guilt-free, just track it monthly.",
            "transport":     "Consider a monthly pass if you commute daily.",
            "misc":          "Your buffer for unexpected costs."
        }
        recommendation = {}
        for label, pct in zip(labels, action):
            recommendation[label] = {
                "percentage": round(float(pct) * 100, 1),
                "amount":     round(income * float(pct), 0),
                "tip":        tips[label]
            }
    else:
        recommendation = rule_based_recommendation(income)

    return {
        "income_used":    income,
        "recommendation": recommendation,
        "model_used":     "rl_model" if rl_model is not None else "rule_based"
    }