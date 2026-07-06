from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from auth import verify_token
import models
import re

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"]
)

@router.post("/")
def add_transaction(
    amount: float,
    category: str,
    type: str,
    description: str,
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    transaction = models.Transaction(
        user_id=uid,
        amount=amount,
        category=category,
        type=type,
        description=description
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("/")
def get_transactions(
    db: Session = Depends(get_db),
    uid: str = Depends(verify_token)
):
    return db.query(models.Transaction).filter(
        models.Transaction.user_id == uid
    ).all()
    

@router.post("/parse-sms")
def parse_sms(sms_text: str, db: Session = Depends(get_db),
            uid: str = Depends(verify_token)):
    
    text = sms_text.strip()

    debit_keywords  = ['debited', 'debit', 'spent', 'paid', 'withdrawn', 'purchase', 'payment', 'sent', 'transferred out']
    credit_keywords = ['credited', 'credit', 'received', 'deposited', 'refund', 'cashback', 'transferred in', 'added']

    txn_type = 'expense'
    for kw in credit_keywords:
        if kw in text.lower():
            txn_type = 'income'
            break

    amount = None
    amount_patterns = [
        r'(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)',   
        r'([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)',  
        r'(?:amount|amt)[:\s]+(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)',
    ]
    for pattern in amount_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(',', '')
            try:
                amount = float(amount_str)
                break
            except ValueError:
                continue
            
    merchant = None
    merchant_patterns = [
        r'(?:at|to|from|merchant|towards|for)\s+([A-Za-z0-9\s&\.\-]{3,40}?)(?:\s+on|\s+via|\s+ref|\.|$)',
        r'(?:trf to|transfer to|paid to)\s+([A-Za-z0-9\s&\.\-]{3,40}?)(?:\s+on|\s+via|\s+ref|\.|$)',
        r'(?:UPI|IMPS|NEFT)\s*[-/]?\s*([A-Za-z0-9\s&\.\-]{3,30}?)(?:\s+on|\s+ref|\.|$)',
    ]
    for pattern in merchant_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            merchant = match.group(1).strip().title()
            if len(merchant) > 3:
                break

    category_rules = {
        'Food':          ['swiggy', 'zomato', 'mcdonalds', 'dominos', 'pizza',
                        'restaurant', 'cafe', 'food', 'biryani', 'hotel',
                        'dining', 'eat', 'kfc', 'burger'],
        'Transport':     ['uber', 'ola', 'rapido', 'metro', 'bus', 'auto',
                        'petrol', 'fuel', 'irctc', 'railway', 'flight',
                        'indigo', 'spicejet', 'cab', 'taxi'],
        'Shopping':      ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho',
                        'nykaa', 'mall', 'store', 'shop', 'market',
                        'retail', 'purchase'],
        'Entertainment': ['netflix', 'spotify', 'prime', 'hotstar', 'zee5',
                        'bookmyshow', 'pvr', 'inox', 'game', 'youtube'],
        'Health':        ['pharmacy', 'medical', 'hospital', 'clinic', 'doctor',
                        'apollo', 'medplus', 'health', 'medicine'],
        'Bills':         ['electricity', 'water', 'gas', 'airtel', 'jio',
                        'vodafone', 'bsnl', 'bill', 'recharge', 'broadband',
                        'internet', 'wifi'],
        'Rent':          ['rent', 'housing', 'pg', 'hostel', 'accommodation'],
    }

    guessed_category = 'Other'
    text_lower = text.lower()
    merchant_lower = (merchant or '').lower()

    for category, keywords in category_rules.items():
        for kw in keywords:
            if kw in text_lower or kw in merchant_lower:
                guessed_category = category
                break
        if guessed_category != 'Other':
            break

    bank_patterns = ['sbi', 'hdfc', 'icici', 'axis', 'kotak', 'yes bank',
                    'pnb', 'bob', 'canara', 'union bank', 'idbi', 'indusind']
    bank = None
    for b in bank_patterns:
        if b in text.lower():
            bank = b.upper()
            break

    success = amount is not None

    return {
        "success":     success,
        "parsed": {
            "amount":      amount,
            "type":        txn_type,
            "description": merchant or "SMS Transaction",
            "category":    guessed_category,
            "bank":        bank
        },
        "confidence": "high" if (amount and merchant) else "medium" if amount else "low",
        "message":    "Parsed successfully" if success else "Could not extract amount from SMS"
    }