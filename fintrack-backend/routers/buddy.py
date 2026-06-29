from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import verify_token
import google.generativeai as genai
import models, os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

router = APIRouter(prefix="/buddy", tags=["buddy"])


@router.post("/ask")
def ask_buddy(question: str,
            db: Session = Depends(get_db),
            uid: str = Depends(verify_token)):

    user = db.query(models.User).filter(models.User.id == uid).first()
    txns = db.query(models.Transaction).filter(models.Transaction.user_id == uid).all()

    income = sum(t.amount for t in txns if t.type == "income")
    expense = sum(t.amount for t in txns if t.type == "expense")

    print(f"DEBUG — uid from token: {uid}")
    print(f"DEBUG — user found in DB: {user}")
    print(f"DEBUG — number of transactions found: {len(txns)}")
    print(f"DEBUG — income calculated: {income}")
    print(f"DEBUG — expense calculated: {expense}")

    savings_rate = round(((income - expense) / income) * 100, 1) if income > 0 else 0

    system_prompt = f"""You are a financial advisor for first-time earners in India.
Explain everything simply, no jargon. Never push specific products or companies.
Be honest even if the advice is "don't invest yet, build emergency fund first."

User's current situation:
- Monthly income: Rs.{income}
- Monthly expenses: Rs.{expense}
- Savings rate: {savings_rate}%

Answer the user's question directly and practically in 3-4 sentences max."""

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system_prompt
    )

    response = model.generate_content(question)

    return {"answer": response.text}