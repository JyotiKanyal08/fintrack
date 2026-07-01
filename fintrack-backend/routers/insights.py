from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sklearn.ensemble import IsolationForest
import pandas as pd

from database import get_db
from auth import verify_token
import models

router = APIRouter(
    prefix="/insights",
    tags=["insights"]
)


@router.get("/anomalies")
def detect_anomalies(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    txns = db.query(models.Transaction).filter(
        models.Transaction.user_id == uid,
        models.Transaction.type == "expense"
    ).all()

    if len(txns) < 5:
        return {
            "anomalies": [],
            "message": "Not enough data yet"
        }

    df = pd.DataFrame([
        {
            "id": t.id,
            "amount": t.amount,
            "category": t.category,
            "description": t.description
        }
        for t in txns
    ])

    results = []

    for cat in df["category"].unique():

        cat_df = df[df["category"] == cat]

        if len(cat_df) < 3:
            continue

        model = IsolationForest(
            contamination=0.2,
            random_state=42
        )

        cat_df = cat_df.copy()

        cat_df["anomaly"] = model.fit_predict(
            cat_df[["amount"]]
        )

        flagged = cat_df[
            cat_df["anomaly"] == -1
        ]

        for _, row in flagged.iterrows():

            avg = cat_df["amount"].mean()

            results.append({
                "id": int(row["id"]),
                "description": row["description"],
                "category": cat,
                "amount": row["amount"],
                "category_average": round(avg, 0),
                "message":
                    f"This {cat} expense "
                    f"(Rs.{row['amount']:.0f}) "
                    f"is unusually high vs your average "
                    f"of Rs.{avg:.0f}"
            })

    return {"anomalies": results}