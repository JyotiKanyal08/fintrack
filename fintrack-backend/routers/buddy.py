from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import verify_token
import models, os
from dotenv import load_dotenv

load_dotenv()

# New Google GenAI SDK
from google import genai
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

router = APIRouter(prefix="/buddy", tags=["buddy"])


@router.post("/ask")
def ask_buddy(question: str,
            db: Session = Depends(get_db),
            uid: str = Depends(verify_token)):

    user = db.query(models.User).filter(models.User.id == uid).first()
    txns = db.query(models.Transaction).filter(models.Transaction.user_id == uid).all()

    income  = sum(t.amount for t in txns if t.type == "income")
    expense = sum(t.amount for t in txns if t.type == "expense")
    savings_rate = round(((income - expense) / income) * 100, 1) if income > 0 else 0

    prompt = f"""You are a financial advisor for first-time earners in India.
Explain everything simply, no jargon. Never push specific products or companies.
Be honest even if the advice is don't invest yet, build emergency fund first.

User's current situation:
- Monthly income: Rs.{income}
- Monthly expenses: Rs.{expense}
- Savings rate: {savings_rate}%

Answer this question directly and practically in 3-4 sentences max: {question}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return {"answer": response.text}