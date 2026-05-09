from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional

from database_models import User as DBUser
from security import get_current_user
from schemas import StandardProfileDisplay
from database import get_db

router = APIRouter(prefix="/profile", tags=["User Profile"])


# ✅ GET PROFILE (WITH INCOME)
@router.get("/me", response_model=StandardProfileDisplay)
def get_my_profile(
    current_user: DBUser = Depends(get_current_user)
):
    return {
        "FullName": f"{current_user.FirstName} {current_user.LastName}",
        "Username": current_user.Username,
        "Email": current_user.MailId,
        "DateOfBirth": current_user.DateOfBirth,
        "UserType": current_user.UserType,
        "MonthlyIncome": (
            current_user.user_profile.MonthlyIncome
            if current_user.user_profile else None
        )
    }


# ✅ UPDATE USERNAME (WITH UNIQUE CHECK)
@router.put("/update-username")
def update_username(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    new_username = data.get("Username")

    if not new_username:
        raise HTTPException(status_code=400, detail="Username is required")

    # 🔥 CHECK UNIQUE USERNAME
    existing_user = db.query(DBUser).filter(
        DBUser.Username == new_username
    ).first()

    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(status_code=400, detail="Username already taken")

    current_user.Username = new_username

    db.commit()
    db.refresh(current_user)

    return {"message": "Username updated successfully"}


# ✅ UPDATE MONTHLY INCOME
@router.put("/update-income")
def update_income(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    income = data.get("MonthlyIncome")

    try:
        income = float(income) if income is not None else None
    except:
        raise HTTPException(status_code=400, detail="Invalid income")

    # 👉 existing profile use karo
    if current_user.user_profile:
        current_user.user_profile.MonthlyIncome = income
    else:
        # 👉 only if missing (rare case)
        from database_models import UserProfile
        profile = UserProfile(
            user_id=current_user.id,
            MonthlyIncome=income
        )
        db.add(profile)

    db.commit()

    return {"message": "Income updated successfully"}