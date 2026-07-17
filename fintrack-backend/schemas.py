from pydantic import BaseModel

class OnboardingUpdate(BaseModel):
    monthly_income: float