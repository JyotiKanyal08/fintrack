from fastapi import Header, HTTPException
import firebase_admin
from firebase_admin import credentials
from firebase_admin import auth as firebase_auth

cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        token = credentials.credentials

        decoded = firebase_auth.verify_id_token(token)

        return decoded["uid"]

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )