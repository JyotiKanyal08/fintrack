from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import verify_token
import models
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor

router = APIRouter(prefix="/analytics", tags=["analytics"])

def safe_float(val, default=0.0):
    try:
        f = float(val)
        if f != f or f == float('inf') or f == float('-inf'):
            return default
        return round(f, 2)
    except Exception:
        return default
    
def get_latest_month_df(df):
    """Returns rows from the most recent month in the dataframe."""
    if df.empty:
        return df
    latest = df["month"].max()
    return df[df["month"] == latest]

#Spending Analytics
@router.get("/spending")
def spending_analytics(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    try:
        txns = db.query(models.Transaction).filter(
            models.Transaction.user_id == uid
        ).all()

        if not txns:
            return {"message": "No transaction data yet", "data": {}}

        # Build DataFrame
        df = pd.DataFrame([{
            "amount":      t.amount,
            "category":    t.category,
            "type":        t.type,
            "description": t.description,
            "date":        t.date
        } for t in txns])

        df["date"]       = pd.to_datetime(df["date"])
        df["month"]      = df["date"].dt.to_period("M").astype(str)
        df["month_name"] = df["date"].dt.strftime("%b %Y")
        df["day_name"]   = df["date"].dt.day_name()

        expenses = df[df["type"] == "expense"].copy()
        income   = df[df["type"] == "income"].copy()

        # If there are no expense transactions yet, return a minimal-but-valid response
        if expenses.empty:
            this_month_income = float(income["amount"].sum()) if not income.empty else 0.0
            return {
                "summary": {
                    "total_income":        round(this_month_income, 2),
                    "total_expense":       0.0,
                    "avg_monthly_expense": 0.0,
                    "savings_rate":        0.0,
                    "biggest_category":    "N/A",
                    "total_transactions":  0
                },
                "category_totals":  {},
                "monthly_totals":   [],
                "monthly_category": [],
                "day_of_week":      [{"day_name": d, "avg_spend": 0} for d in
                                    ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]],
                "top_transactions": [],
                "mom_change":       {}
            }

        #Use the most recent month for summary stats
        latest_month     = df["month"].max()
        latest_month_exp = expenses[expenses["month"] == latest_month]
        latest_month_inc = income[income["month"] == latest_month]

        this_month_income  = float(latest_month_inc["amount"].sum())
        this_month_expense = float(latest_month_exp["amount"].sum())

        savings_rate = (
            round(((this_month_income - this_month_expense) / this_month_income) * 100, 1)
            if this_month_income > 0
            else 0
        )

        #Category totals (all time, for pie chart)
        category_totals = (
            expenses.groupby("category")["amount"]
            .sum()
            .round(2)
            .sort_values(ascending=False)
            .to_dict()
        )

        biggest_cat = max(category_totals, key=category_totals.get) if category_totals else "N/A"

        #Monthly totals trend
        monthly_totals = (
            expenses.groupby(["month", "month_name"])["amount"]
            .sum()
            .round(2)
            .reset_index()
            .rename(columns={"amount": "total"})
            .sort_values("month")
            .to_dict(orient="records")
        )

        #Average monthly expense
        avg_monthly_series = expenses.groupby("month")["amount"].sum()
        avg_monthly = round(float(avg_monthly_series.mean()), 2) if not avg_monthly_series.empty else 0.0
        if avg_monthly != avg_monthly:  # NaN check
            avg_monthly = 0.0

        #Monthly spend per category 
        monthly_category = (
            expenses.groupby(["month", "month_name", "category"])["amount"]
            .sum()
            .round(2)
            .reset_index()
            .rename(columns={"amount": "total"})
            .sort_values("month")
            .to_dict(orient="records")
        )

        #Day of week pattern 
        day_order = ["Monday", "Tuesday", "Wednesday", "Thursday",
                    "Friday", "Saturday", "Sunday"]
        dow = (
            expenses.groupby("day_name")["amount"]
            .mean()
            .round(2)
            .reindex(day_order, fill_value=0)
            .reset_index()
            .rename(columns={"amount": "avg_spend"})
            .to_dict(orient="records")
        )

        #Top 5 largest single transactions
        top_transactions = (
            expenses.nlargest(5, "amount")[["description", "category", "amount", "date"]]
            .assign(date=lambda x: x["date"].dt.strftime("%d %b %Y"))
            .to_dict(orient="records")
        )

        #Month-over-month change 
        months = sorted(expenses["month"].unique())
        mom_change = {}
        if len(months) >= 2:
            last_month = months[-1]
            prev_month = months[-2]
            last_spend = expenses[expenses["month"] == last_month].groupby("category")["amount"].sum()
            prev_spend = expenses[expenses["month"] == prev_month].groupby("category")["amount"].sum()

            for cat in set(last_spend.index) | set(prev_spend.index):
                last_val = float(last_spend.get(cat, 0))
                prev_val = float(prev_spend.get(cat, 0))
                if prev_val > 0:
                    pct = round(((last_val - prev_val) / prev_val) * 100, 1)
                else:
                    pct = 100.0
                mom_change[cat] = {
                    "last_month":  round(last_val, 0),
                    "prev_month":  round(prev_val, 0),
                    "change_pct":  pct,
                    "direction":   "up" if pct > 0 else "down"
                }

        return {
            "summary": {
                "total_income":        round(this_month_income, 2),
                "total_expense":       round(this_month_expense, 2),
                "avg_monthly_expense": avg_monthly,
                "savings_rate":        savings_rate,
                "biggest_category":    biggest_cat,
                "total_transactions":  len(expenses)
            },
            "category_totals":  category_totals,
            "monthly_totals":   monthly_totals,
            "monthly_category": monthly_category,
            "day_of_week":      dow,
            "top_transactions": top_transactions,
            "mom_change":       mom_change
        }

    except Exception as e:
        print("ERROR in /analytics/spending:", str(e))
        return {"message": "No transaction data yet", "data": {}}
    
#Expense Predictor
@router.get("/predict")
def predict_expenses(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    txns = db.query(models.Transaction).filter(
        models.Transaction.user_id == uid
    ).all()

    if not txns:
        return {"message": "No transaction data yet", "predictions": {}}

    # Build DataFrame
    df = pd.DataFrame([{
        "amount":   t.amount,
        "category": t.category,
        "type":     t.type,
        "date":     t.date
    } for t in txns])

    df["date"]      = pd.to_datetime(df["date"])
    df["month"]     = df["date"].dt.to_period("M").astype(str)
    df["month_num"] = df["date"].dt.month
    df["month_str"] = df["date"].dt.strftime("%b %Y")

    expenses = df[df["type"] == "expense"].copy()
    income   = df[df["type"] == "income"].copy()

    if expenses.empty:
        return {"message": "No expense data yet", "predictions": {}}

    # Average monthly income (used as a feature)
    monthly_income = float(income.groupby("month")["amount"].sum().mean())
    if np.isnan(monthly_income):
        monthly_income = 0

    # Group by month + category
    monthly_cat = (
        expenses.groupby(["month", "month_str", "month_num", "category"])["amount"]
        .sum()
        .reset_index()
        .rename(columns={"amount": "total_spend"})
        .sort_values("month")
    )

    categories  = monthly_cat["category"].unique().tolist()
    predictions = {}

    for cat in categories:
        cat_df = monthly_cat[monthly_cat["category"] == cat].copy()
        cat_df = cat_df.sort_values("month").reset_index(drop=True)

        # Only one data point — use as baseline, mark low confidence
        if len(cat_df) < 2:
            last_val = float(cat_df["total_spend"].iloc[-1])
            predictions[cat] = {
                "predicted_amount":  round(last_val, 0),
                "last_month_actual": round(last_val, 0),
                "change_pct":        0.0,
                "trend":             "stable",
                "confidence":        "low",
                "data_points":       len(cat_df),
                "insight":           f"Only 1 month of {cat} data. Keep logging to improve predictions.",
                "model_used":        "baseline"
            }
            continue

        # Feature engineering
        cat_df["lag_1"]          = cat_df["total_spend"].shift(1)
        cat_df["rolling_3"]      = cat_df["total_spend"].rolling(3, min_periods=1).mean()
        cat_df["spend_index"]    = range(len(cat_df))
        cat_df["monthly_income"] = monthly_income

        # Trend slope
        x_trend     = np.arange(len(cat_df)).reshape(-1, 1)
        y_trend     = cat_df["total_spend"].values
        slope_model = LinearRegression().fit(x_trend, y_trend)
        trend_slope = float(slope_model.coef_[0])
        cat_df["trend_slope"] = trend_slope

        train_df = cat_df.dropna(subset=["lag_1"])
        if train_df.empty:
            last_val = float(cat_df["total_spend"].iloc[-1])
            predictions[cat] = {
                "predicted_amount":  round(last_val, 0),
                "last_month_actual": round(last_val, 0),
                "change_pct":        0.0,
                "trend":             "stable",
                "confidence":        "low",
                "data_points":       len(cat_df),
                "insight":           f"Insufficient history for {cat}. Keep logging transactions.",
                "model_used":        "baseline"
            }
            continue

        features = ["spend_index", "lag_1", "rolling_3",
                    "trend_slope", "monthly_income", "month_num"]
        X_train  = train_df[features].values
        y_train  = train_df["total_spend"].values

        # Model selection
        if len(X_train) >= 4:
            model      = RandomForestRegressor(n_estimators=50, random_state=42)
            model_name = "random_forest"
        else:
            model      = LinearRegression()
            model_name = "linear_regression"

        model.fit(X_train, y_train)

        last_row   = cat_df.iloc[-1]
        next_index = len(cat_df)
        next_month = int(last_row["month_num"]) % 12 + 1

        X_pred = np.array([[
            next_index,
            float(last_row["total_spend"]),
            float(last_row["rolling_3"]),
            trend_slope,
            monthly_income,
            next_month
        ]])

        predicted   = float(model.predict(X_pred)[0])
        predicted   = max(0, round(predicted, 0))
        last_actual = float(last_row["total_spend"])

        change_pct = round(
            ((predicted - last_actual) / last_actual) * 100, 1
        ) if last_actual > 0 else 0.0

        if trend_slope > 50:
            trend = "increasing"
        elif trend_slope < -50:
            trend = "decreasing"
        else:
            trend = "stable"

        if len(cat_df) >= 4:
            confidence = "high"
        elif len(cat_df) >= 2:
            confidence = "medium"
        else:
            confidence = "low"

        abs_change = abs(change_pct)
        if abs_change < 5:
            insight = f"Your {cat} spending looks stable — expected around ₹{predicted:,.0f} next month."
        elif change_pct > 0:
            insight = f"Your {cat} spending may rise by {abs_change}% next month (₹{predicted:,.0f}). Consider reviewing this."
        else:
            insight = f"Great — your {cat} spending is trending down by {abs_change}%. Predicted ₹{predicted:,.0f} next month."

        predictions[cat] = {
            "predicted_amount":  predicted,
            "last_month_actual": round(last_actual, 0),
            "change_pct":        change_pct,
            "trend":             trend,
            "confidence":        confidence,
            "data_points":       len(cat_df),
            "insight":           insight,
            "model_used":        model_name
        }


    total_predicted  = round(sum(v["predicted_amount"]  for v in predictions.values()), 0)
    total_last_month = round(sum(v["last_month_actual"] for v in predictions.values()), 0)
    overall_change   = round(
        ((total_predicted - total_last_month) / total_last_month) * 100, 1
    ) if total_last_month > 0 else 0

    return {
        "predictions": predictions,
        "summary": {
            "total_predicted_next_month": total_predicted,
            "total_last_month":           total_last_month,
            "overall_change_pct":         overall_change,
            "monthly_income":             round(monthly_income, 0),
            "categories_predicted":       len(predictions)
        }
    }
    
@router.get("/features")
def feature_engineering(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
    ):
    txns = db.query(models.Transaction).filter(
        models.Transaction.user_id == uid
        ).all()

    if not txns:
        return {"message": "No transaction data yet"}

    df = pd.DataFrame([{
        "amount":   t.amount,
        "category": t.category,
        "type":     t.type,
        "date":     t.date
    } for t in txns])

    df["date"]  = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M").astype(str)

    expenses = df[df["type"] == "expense"].copy()
    income   = df[df["type"] == "income"].copy()

    monthly_expense = expenses.groupby("month")["amount"].sum().sort_index()
    monthly_income  = income.groupby("month")["amount"].sum().sort_index()

    all_months = sorted(set(monthly_expense.index) | set(monthly_income.index))
    monthly_expense = monthly_expense.reindex(all_months, fill_value=0)
    monthly_income  = monthly_income.reindex(all_months, fill_value=0)

    rolling_avg = monthly_expense.rolling(3, min_periods=1).mean().round(2)

    savings_rate = ((monthly_income - monthly_expense) / monthly_income.replace(0, np.nan) * 100).round(2)

    savings_velocity = savings_rate.diff().round(2)

    expense_ratio = (monthly_expense / monthly_income.replace(0, np.nan) * 100).round(2)

    category_monthly = (
        expenses.groupby(["month", "category"])["amount"]
        .sum()
        .unstack(fill_value=0)
    )
    volatility = {}
    for cat in category_monthly.columns:
        std  = float(category_monthly[cat].std())
        mean = float(category_monthly[cat].mean())
        cv   = round((std / mean) * 100, 1) if mean > 0 else 0
        volatility[cat] = {
            "std":              round(std, 2),
            "mean":             round(mean, 2),
            "coefficient_of_variation": cv,
            "stability":        "stable" if cv < 20 else "moderate" if cv < 50 else "volatile"
        }

    inc_mean = float(monthly_income.mean())
    inc_std  = float(monthly_income.std())
    income_stability = round(
        max(0, 1 - (inc_std / inc_mean)), 3
    ) if inc_mean > 0 else 0

    avg_expense_ratio = float(expense_ratio.mean())
    avg_savings_rate  = float(savings_rate.mean())
    avg_volatility    = float(
        sum(v["coefficient_of_variation"] for v in volatility.values()) /
        len(volatility)
    ) if volatility else 0

    stress_index = round(
        (avg_expense_ratio * 0.5) +
        (max(0, 100 - avg_savings_rate) * 0.3) +
        (min(avg_volatility, 100) * 0.2),
        1
    )

    biggest_month     = str(monthly_expense.idxmax())
    biggest_month_amt = float(monthly_expense.max())

    mom_growth = monthly_expense.pct_change().mul(100).round(2)
    
    time_series = []
    for m in all_months:
        time_series.append({
            "month":            m,
            "month_label":      pd.to_datetime(m + "-01").strftime("%b %Y"),
            "expense":          safe_float(monthly_expense.get(m, 0)),
            "income":           safe_float(monthly_income.get(m, 0)),
            "rolling_avg":      safe_float(rolling_avg.get(m, 0)),
            "savings_rate":     safe_float(savings_rate.get(m, 0)),
            "savings_velocity": safe_float(savings_velocity.get(m, 0)),
            "expense_ratio":    safe_float(expense_ratio.get(m, 0)),
            "mom_growth":       safe_float(mom_growth.get(m, 0)),
        }),

    return {
        "time_series": time_series,
        "volatility":  volatility,
        "summary_features": {
            "income_stability_score": income_stability,
            "financial_stress_index": stress_index,
            "avg_savings_rate":       avg_savings_rate,
            "avg_expense_ratio":      avg_expense_ratio,
            "biggest_spending_month": biggest_month,
            "biggest_month_amount":   round(biggest_month_amt, 2),
            "total_months_tracked":   len(all_months),
            "avg_monthly_volatility": round(avg_volatility, 2)
        }
    }
