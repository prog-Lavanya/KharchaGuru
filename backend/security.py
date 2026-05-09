# security.py
import os
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from database import get_db
from database_models import User as DBUser

load_dotenv()

GOOGLE_CLIENT_ID = "Client Id Google"   
SECRET_KEY = "simple-secret-key"        
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme (used by Swagger + frontend)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# hashing 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# password helpers
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# JWT HELPERS
def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    data MUST contain:
    {
        "sub": user.MailId
    }
    """
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    return encoded_jwt

# protecting routes
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> DBUser:
    """
    - Reads JWT from Authorization: Bearer <token>
    - Expects sub = MailId
    - Returns DBUser
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        mail_id: str = payload.get("sub")
        if mail_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = (
        db.query(DBUser)
        .filter(DBUser.MailId == mail_id)
        .first()
    )
    if user is None:
        raise credentials_exception
    return user
