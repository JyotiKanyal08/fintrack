import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjJmMjk1MGEyNGFlYWRkMjYzYzIxM2I2MDNhZjMxNWEzMjdiNmM3MjAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vZmludHJhY2stNjU1MGYiLCJhdWQiOiJmaW50cmFjay02NTUwZiIsImF1dGhfdGltZSI6MTc4MjcyOTQyMSwidXNlcl9pZCI6Im5aRTZFZVJMMDVTTUZaQXRhc252UkZaYXkwZzIiLCJzdWIiOiJuWkU2RWVSTDA1U01GWkF0YXNudlJGWmF5MGcyIiwiaWF0IjoxNzgyNzI5NDIxLCJleHAiOjE3ODI3MzMwMjEsImVtYWlsIjoianlvdGlrYW55YWw0OEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsianlvdGlrYW55YWw0OEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.glrrSIqbIy9Sjc9yfyqotnye1yb8ArBRmShzWFDrtXNOw1KbTsash1jyHZJY5M_T4F6nM3NDraDWGEmnaFhkaE3cIAsv6v2NlCZ1DRfGiIi0LKIYgYOJ4ttc87tO4LTpMiJh8qnhzwEdh4yq1O9Ueinds2oBU9BMHCaT2RIUMdwWEzRpgyQa-ENxC4gd-_m9A3LtcF89v0epZwxeE-scAAt2WNWjkU8Io9pcCyMUKLZoTIx2rdwZPHobe_7wW8oc2ZY8nWpIcQe8917IoSrNm0WCfyIp1ALU0PEIyrsAuq8McjBW9V4J759h2zv4lWJjhZ3pV2How8-If1dDpzC5Hw"

HEADERS = {"Authorization": f"Bearer {TOKEN}"}


def add_transaction(amount, category, type_, description):
    payload = {
        "amount": amount,
        "category": category,
        "type": type_,
        "description": description,
    }
    res = requests.post(f"{BASE_URL}/transactions/", params=payload, headers=HEADERS)
    print(f"  [{res.status_code}] {description} - ₹{amount}")
    return res


def add_bill(name, amount, due_day, category, is_paid=False):
    payload = {
        "name": name,
        "amount": amount,
        "due_day": due_day,
        "category": category,
        "is_paid": is_paid,
    }
    res = requests.post(f"{BASE_URL}/bills/", params=payload, headers=HEADERS)
    print(f"  [{res.status_code}] Bill: {name} - ₹{amount}")
    return res


def add_goal(name, target_amount, saved_amount, deadline):
    payload = {
        "name": name,
        "target_amount": target_amount,
        "saved_amount": saved_amount,
        "deadline": deadline,
    }
    res = requests.post(f"{BASE_URL}/goals/", params=payload, headers=HEADERS)
    print(f"  [{res.status_code}] Goal: {name}")
    return res


print("Seeding transactions...")
add_transaction(35000, "Other", "income", "Monthly Salary")
add_transaction(8000, "Rent", "expense", "Room rent - June")
add_transaction(450, "Food", "expense", "Groceries - BigBasket")
add_transaction(180, "Transport", "expense", "Auto to office")
add_transaction(1200, "Food", "expense", "Swiggy orders - week 1")
add_transaction(599, "Entertainment", "expense", "Netflix + Prime")
add_transaction(2500, "Shopping", "expense", "New shoes")
add_transaction(220, "Transport", "expense", "Metro card recharge")
add_transaction(850, "Food", "expense", "Groceries - week 2")
add_transaction(300, "Health", "expense", "Pharmacy")
add_transaction(1500, "Bills", "expense", "Mobile + internet recharge")
add_transaction(5000, "Other", "income", "Freelance project")
add_transaction(250, "Food", "expense", "Lunch")
add_transaction(300, "Food", "expense", "Dinner")
add_transaction(4000, "Food", "expense", "Luxury restaurant")

print("\nSeeding bills...")
add_bill("Electricity", 650, 10, "Bills", is_paid=True)
add_bill("Water", 150, 8, "Bills", is_paid=True)
add_bill("Internet (WiFi)", 799, 5, "Bills", is_paid=False)
add_bill("Netflix", 199, 15, "Entertainment", is_paid=False)
add_bill("Health Insurance", 1200, 20, "Insurance", is_paid=False)

print("\nSeeding goals...")
six_months = (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")
one_year = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")

add_goal("Emergency Fund (3 months expenses)", 50000, 12000, six_months)
add_goal("New Laptop", 60000, 8000, one_year)
add_goal("Goa Trip", 15000, 3000, six_months)

print("\nDone! Refresh your dashboard to see the data.")
