from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from sqlalchemy import or_
from database import get_db
from security import (
    verify_password,
    create_access_token,
    GOOGLE_CLIENT_ID,
)
from database_models import User as DBUser, UserProfile as DBProfile
from services.categories import seed_default_categories

router = APIRouter(prefix="/auth", tags=["Authentication"])
class GoogleLoginRequest(BaseModel):
    idToken: str

#login for backend only 
@router.post("/token")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(DBUser).filter(
        or_(
            DBUser.Username == form_data.username,
            DBUser.MailId == form_data.username
        )
    ).first()
    if not user or not verify_password(form_data.password, user.PasswordHash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username/email or password"
        )
    # mail token
    token = create_access_token({"sub": user.MailId})
    return {
        "access_token": token,
        "token_type": "bearer"
    }

