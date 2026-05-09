from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from sqlalchemy import or_
from database import get_db
from services.categories import seed_default_categories
from database_models import User as DBUser, UserProfile as DBProfile
from schemas import (
    UserCreate,
    UserResponse,
    UserLogin,
    LoginResponse
)
from security import (
    hash_password,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
router = APIRouter(prefix="/auth", tags=["Authentication"])


# registration
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    try:
        existing_user = db.query(DBUser).filter(
            (DBUser.Username == user_in.Username) |
            (DBUser.MailId == user_in.mailId)
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or Email already registered"
            )
        hashed_pwd = hash_password(user_in.Password)
        hashed_answer = hash_password(user_in.SecurityAnswer)
        new_user = DBUser(
            Username=user_in.Username,
            MailId=user_in.mailId,
            PasswordHash=hashed_pwd,
            FirstName=user_in.FirstName,
            LastName=user_in.LastName,
            DateOfBirth=user_in.DateOfBirth,
            UserType=user_in.UserType,
            SecurityQuestion=user_in.SecurityQuestion,
            SecurityAnswerHash=hashed_answer
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        new_profile = DBProfile(UserID=new_user.UserId)
        db.add(new_profile)
        seed_default_categories(db, new_user.UserId)
        db.commit()
        return UserResponse(
            UserId=new_user.UserId,
            mailId=new_user.MailId,
            Username=new_user.Username,
            FirstName=new_user.FirstName,
            LastName=new_user.LastName,
            DateOfBirth=new_user.DateOfBirth,
            UserType=new_user.UserType,
            SecurityQuestion=new_user.SecurityQuestion,
            CreatedDate=new_user.CreatedDate,
            LastLoginDate=new_user.LastLoginDate,
            IsActive=new_user.IsActive
        )
    except Exception as e:
        db.rollback()
        print("🔥 REGISTER ERROR:", e) 
        raise HTTPException(
            status_code=500,
            detail="Registration failed due to server error"
        )

# now login

@router.post("/login", response_model=LoginResponse)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(
        or_(
            DBUser.Username == user_credentials.Identifier,
            DBUser.MailId == user_credentials.Identifier
        )
    ).first()
    if not user or not verify_password(user_credentials.Password, user.PasswordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    user.LastLoginDate = datetime.now()
    db.commit()
    expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.MailId},
        expires_delta=expires
    )
    return LoginResponse(
        UserId=user.UserId,
        Username=user.Username,
        mailId=user.MailId,
        access_token=access_token,
        UserType=user.UserType,
        token_type="bearer"
    )