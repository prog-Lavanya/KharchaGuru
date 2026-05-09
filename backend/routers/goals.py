from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal
from datetime import datetime

from database import get_db
from database_models import Goal as DBGoal, User as DBUser, Category, Expense
from schemas import (
    GoalCreate, GoalUpdate, GoalResponse,
    GoalDetailsResponse, ContributionResponse
)
from security import get_current_user
from services.goal_services import GoalService
from services.goal_tips import GoalTipsService
from services.goal_alerts import GoalAlertsService

router = APIRouter(prefix="/goals", tags=["Goals"])


# CREATE 
@router.post("/", response_model=GoalResponse)
def create_goal(
    goal_in: GoalCreate,
    db: Session = Depends(get_db),
    user: DBUser = Depends(get_current_user)
):
    if goal_in.CurrentAmount > goal_in.TargetAmount:
        raise HTTPException(400, "Current amount cannot exceed target")

    goal = DBGoal(
        **goal_in.model_dump(),
        UserID=user.UserId
    )

    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal

#GET ALL 
@router.get("/", response_model=List[GoalResponse])
def get_goals(
    db: Session = Depends(get_db),
    user: DBUser = Depends(get_current_user)
):
    return (
        db.query(DBGoal)
        .filter(DBGoal.UserID == user.UserId)
        .order_by(DBGoal.CreatedDate.desc())
        .all()
    )


# ---------------- DETAILS ----------------
@router.get("/{goal_id}/details", response_model=GoalDetailsResponse)
def goal_details(
    goal_id: int,
    db: Session = Depends(get_db),
    user: DBUser = Depends(get_current_user)
):
    goal = db.query(DBGoal).filter(
        DBGoal.GoalID == goal_id,
        DBGoal.UserID == user.UserId
    ).first()

    if not goal:
        raise HTTPException(404, "Goal not found")

    progress = GoalService.calculate_progress_percentage(
        goal.CurrentAmount, goal.TargetAmount
    )
    days_left = GoalService.calculate_days_remaining(goal.TargetDate)
    monthly_required = GoalService.calculate_monthly_required(
        goal.TargetAmount, goal.CurrentAmount, goal.TargetDate
    )
    milestones = GoalAlertsService.milestone_alerts(
        goal.CurrentAmount, goal.TargetAmount
    )
    return GoalDetailsResponse(
        goal=goal,
        progress_percentage=round(progress, 2),
        days_remaining=days_left,
        amount_remaining=float(goal.TargetAmount - goal.CurrentAmount),
        monthly_savings_needed=float(monthly_required),
        is_on_track=GoalService.is_goal_on_track(goal, progress, days_left),
        savings_tips=GoalTipsService.generate_savings_tips(
            db, user.UserId, monthly_required, days_left
        ),
        milestones=milestones,
        alert=GoalAlertsService.deadline_risk_alert(days_left, progress)
    )


# ---------------- UPDATE ----------------
@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    update: GoalUpdate,
    db: Session = Depends(get_db),
    user: DBUser = Depends(get_current_user)
):
    goal = db.query(DBGoal).filter(
        DBGoal.GoalID == goal_id,
        DBGoal.UserID == user.UserId
    ).first()

    if not goal:
        raise HTTPException(404, "Goal not found")

    data = update.model_dump(exclude_unset=True)

    if "CurrentAmount" in data:
        if data["CurrentAmount"] > goal.TargetAmount:
            raise HTTPException(400, "CurrentAmount cannot exceed TargetAmount")

    if "TargetAmount" in data:
        if goal.CurrentAmount > data["TargetAmount"]:
            raise HTTPException(400, "CurrentAmount cannot exceed TargetAmount")

    for k, v in data.items():
        setattr(goal, k, v)

    GoalService.auto_update_completion(goal, db)
    db.refresh(goal)
    return goal


# ---------------- CONTRIBUTION ----------------
@router.post("/{goal_id}/contribute", response_model=ContributionResponse)
def contribute(
    goal_id: int,
    amount: Decimal = Query(..., gt=0),
    db: Session = Depends(get_db),
    user: DBUser = Depends(get_current_user)
):
    goal = db.query(DBGoal).filter(
        DBGoal.GoalID == goal_id,
        DBGoal.UserID == user.UserId
    ).first()

    if not goal:
        raise HTTPException(404, "Goal not found")

    previous = goal.CurrentAmount

    remaining = goal.TargetAmount - goal.CurrentAmount

# 🔥 SPLIT LOGIC
    if amount <= remaining:
        goal.CurrentAmount += amount
        extra_amount = Decimal("0")
    else:
        goal.CurrentAmount = goal.TargetAmount
        extra_amount = amount - remaining

        if extra_amount > 0:

            # 1️⃣ find existing savings category
            savings_category = db.query(Category).filter(
                Category.UserID == user.UserId,
                Category.CategoryName == "Savings"
            ).first()

            # 2️⃣ create if not exists
            if not savings_category:
                savings_category = Category(
                    CategoryName="Savings",
                    CategoryType="Income",   # ⚠️ IMPORTANT
                    UserID=user.UserId
                )
                db.add(savings_category)
                db.commit()
                db.refresh(savings_category)

            # 3️⃣ add entry (VERY IMPORTANT)
            new_entry = Expense(
                Amount=extra_amount,
                CategoryID=savings_category.CategoryID,
                UserID=user.UserId,
                Date=datetime.now()
            )

            db.add(new_entry)
            db.commit()

# 🎯 milestone
    milestone = GoalAlertsService.contribution_milestone(
    previous, goal.CurrentAmount, goal.TargetAmount
)

# ✅ completion update
    GoalService.auto_update_completion(goal, db)

# 📊 progress
    progress = GoalService.calculate_progress_percentage(
        goal.CurrentAmount, goal.TargetAmount
    )   

# 🔥 NEW ALERT BASED ON EXTRA
    excess_alert = GoalAlertsService.excess_savings_alert(extra_amount)

    return ContributionResponse(
        message="",
        new_balance=float(goal.CurrentAmount),
        progress=progress,
        completed=goal.IsCompleted,
        milestone=milestone,
        excess_alert=excess_alert
    )
# ---------------- DELETE ----------------
@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    user: DBUser = Depends(get_current_user)
):
    goal = db.query(DBGoal).filter(
        DBGoal.GoalID == goal_id,
        DBGoal.UserID == user.UserId
    ).first()

    if not goal:
        raise HTTPException(404, "Goal not found")

    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted successfully"}
