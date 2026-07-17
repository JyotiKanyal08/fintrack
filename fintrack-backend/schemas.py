from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class OnboardingUpdate(BaseModel):
    monthly_income: float

class GoalCreate(BaseModel):
    name: str
    target_amount: float
    saved_amount: float = 0
    deadline: Optional[datetime] = None

class BillCreate(BaseModel):
    name: str
    amount: float
    due_day: int
    category: str