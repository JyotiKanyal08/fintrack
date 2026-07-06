from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id              = Column(String, primary_key=True, index=True)  
    email           = Column(String, unique=True, index=True)
    name            = Column(String)
    monthly_income  = Column(Float, default=0)
    created_at      = Column(DateTime, server_default=func.now())

class Transaction(Base):
    __tablename__ = "transactions"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(String, ForeignKey("users.id"))   
    amount      = Column(Float)
    category    = Column(String)
    type        = Column(String)
    description = Column(String)
    date        = Column(DateTime, server_default=func.now())

class Bill(Base):
    __tablename__ = "bills"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(String, ForeignKey("users.id"))  
    name        = Column(String)
    amount      = Column(Float)
    due_day     = Column(Integer)
    category    = Column(String)
    is_paid = Column(Boolean, default=False)
    last_paid_month = Column(Integer, nullable=True)
    last_paid_year = Column(Integer, nullable=True)

class Goal(Base):
    __tablename__ = "goals"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(String, ForeignKey("users.id"))  
    name          = Column(String)
    target_amount = Column(Float)
    saved_amount  = Column(Float, default=0)
    deadline      = Column(DateTime)

class Budget(Base):
    __tablename__ = "budgets"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(String, ForeignKey("users.id"))  
    month       = Column(String)
    category    = Column(String)
    allocated   = Column(Float)
    spent       = Column(Float, default=0)