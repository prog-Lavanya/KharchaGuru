from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
from database import get_db
from database_models import Budget as DBBudget, Category, User as DBUser
from schemas import BudgetCreate, BudgetUpdate, CategoryResponse
from security import get_current_user
from utils.date_logic import get_budget_date_range
from utils.budget_utilization import calculate_budget_utilization
from services.categories import get_or_create_category

# NEW IMPORTS
from services.budget_alerts import BudgetAlertsService
from services.budget_tips import BudgetTipsService


router = APIRouter(prefix="/budgets", tags=["Budgets"])
# GET ALL CATEGORIES
  
@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    return (
        db.query(Category)
        .filter(Category.UserID == current_user.UserId)
        .all()
    )
# ── AUTO-REPEAT HELPER ───────────────────────────────────────────────────────
def _auto_repeat_budgets(db: Session, user_id: int):
    """
    Called every time GET / is hit.
    For each Monthly/Weekly budget whose EndDate has passed:
      1. Mark it inactive
      2. If no active budget exists for this category in the new period → create one
         with the same amount. Spent resets to 0 (new date range, no expenses yet).
    Custom budgets are NOT auto-repeated.
    """
    today = datetime.now()

    expired = (
        db.query(DBBudget)
        .filter(
            DBBudget.UserID == user_id,
            DBBudget.IsActive == True,
            DBBudget.EndDate < today,
            DBBudget.BudgetPeriod.in_(["Monthly", "Weekly"])
        )
        .all()
    )

    for old in expired:
        old.IsActive = False
        new_start, new_end = get_budget_date_range(
            period=old.BudgetPeriod,
            reference_date=today
        )
        already_exists = (
            db.query(DBBudget)
            .filter(
                DBBudget.UserID == user_id,
                DBBudget.CategoryID == old.CategoryID,
                DBBudget.IsActive == True,
                DBBudget.StartDate >= new_start,
            )
            .first()
        )
        if not already_exists:
            db.add(DBBudget(
                UserID       = user_id,
                CategoryID   = old.CategoryID,
                BudgetAmount = old.BudgetAmount,
                BudgetPeriod = old.BudgetPeriod,
                StartDate    = new_start,
                EndDate      = new_end,
                IsActive     = True,
                CreatedDate  = today,
            ))

    if expired:
        db.commit()


# GET ALL ACTIVE BUDGETS ALERTS + TIPS

@router.get("/")
def get_user_budgets(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    # Auto-repeat expired Monthly/Weekly budgets before fetching
    _auto_repeat_budgets(db, current_user.UserId)

    budgets = (
        db.query(DBBudget)
        .filter(
            DBBudget.UserID == current_user.UserId,
            DBBudget.IsActive == True
        )
        .all()
    )

    budget_list = []

    for b in budgets:
        # utilization stats 
        stats = calculate_budget_utilization(db, b, current_user.UserId)

        utilization = stats["utilization"]
        spent = stats["spent"]
        remaining = stats["remaining"]

        # date logic 
        days_elapsed = max(
            (datetime.now().date() - b.StartDate).days + 1,
            1
        )
        total_days = max(
            (b.EndDate - b.StartDate).days + 1,
            1
        )

        # ALERTS 
        alerts = BudgetAlertsService.generate_budget_alerts(
            utilization=utilization,
            db=db,
            user_id=current_user.UserId,
            category_id=b.CategoryID,
            budget_amount=b.BudgetAmount,
            spent_so_far=spent,
            days_elapsed=days_elapsed,
            total_days=total_days
        )

        #TIPS
        tips = BudgetTipsService.generate_budget_tips(
            db=db,
            user_id=current_user.UserId,
            category_name=b.categories.CategoryName,
            utilization=utilization
        )

        # ---- RESPONSE OBJECT ----
        budget_list.append({
            "BudgetID": b.BudgetID,
            "Category": b.categories.CategoryName,
            "CategoryID": b.CategoryID,
            "BudgetAmount": float(b.BudgetAmount),
            "BudgetPeriod": b.BudgetPeriod,
            "StartDate": b.StartDate.strftime("%d %b %Y") if b.StartDate else None,
            "EndDate":   b.EndDate.strftime("%d %b %Y")   if b.EndDate   else None,
            "Spent": spent,
            "Remaining": remaining,
            "Utilization": utilization,
            "alerts": alerts,
            "tips": tips
        })

    return {
        "active_count": len(budget_list),
        "budgets": budget_list
    }  
# CREATE BUDGET
  
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    if budget_in.CategoryID:
        category = (
            db.query(Category)
            .filter(Category.CategoryID == budget_in.CategoryID,Category.UserID == current_user.UserId,
                Category.CategoryType == "Expense"
            )
            .first()
        )
        if not category:
            raise HTTPException(404, "Invalid category")
        category_id = category.CategoryID
    elif budget_in.CategoryName:
        category_id = get_or_create_category(db,
            category_name=budget_in.CategoryName,
            category_type="Expense",
            user_id=current_user.UserId
        )
        if not category_id:
            raise HTTPException(400, "Failed to create category")
    else:
        raise HTTPException(400, "CategoryID or CategoryName required")
    existing = (
        db.query(DBBudget)
        .filter(
            DBBudget.UserID == current_user.UserId,
            DBBudget.CategoryID == category_id,
            DBBudget.IsActive == True
        )
        .first()
    )
    if existing:
        raise HTTPException(400,"Active budget already exists for this category")

    # ---- Date logic ----
    today = datetime.now()

    if budget_in.BudgetPeriod in ("Monthly", "Weekly"):
        start_date, end_date = get_budget_date_range(
            period=budget_in.BudgetPeriod,
            reference_date=today
        )

    elif budget_in.BudgetPeriod == "Custom":
        if not budget_in.StartDate or not budget_in.EndDate:
            raise HTTPException(400, "StartDate & EndDate required")

        if budget_in.StartDate < today - timedelta(days=15):
            raise HTTPException(400, "Start date too old")

        if (budget_in.EndDate - budget_in.StartDate).days > 92:
            raise HTTPException(400, "Custom budget > 3 months not allowed")

        start_date = budget_in.StartDate
        end_date = budget_in.EndDate

    else:
        raise HTTPException(400, "Invalid BudgetPeriod")

    # ---- Create Budget ----
    budget = DBBudget(
        UserID=current_user.UserId,
        CategoryID=category_id,
        BudgetAmount=budget_in.BudgetAmount,
        BudgetPeriod=budget_in.BudgetPeriod,
        StartDate=start_date,
        EndDate=end_date,
        IsActive=True,
        CreatedDate=today
    )

    db.add(budget)
    db.commit()
    db.refresh(budget)

    return {
        "message": "Budget created successfully",
        "BudgetID": budget.BudgetID
    }
  
# DELETE BUDGET (SOFT)
@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    budget = (
        db.query(DBBudget)
        .filter(
            DBBudget.BudgetID == budget_id,
            DBBudget.UserID == current_user.UserId
        )
        .first()
    )

    if not budget:
        raise HTTPException(404, "Budget not found")

    #completely remove from database
    db.delete(budget)
    db.commit()

    return {
        "message": "Budget deleted successfully",
        "budget_id": budget_id
    }


# GET BUDGET HISTORY BY CATEGORY ID — with Spent/Remaining/Utilization
@router.get("/history/{category_id}")
def get_budget_history(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    """
    Fetch ALL budgets for this category (active + inactive = full history).
    Each entry now includes Spent, Remaining, and Utilization
    so the frontend month-picker can show full breakdown.
    """
    # Get the category for this category_id
    cat = (
        db.query(Category)
        .filter(Category.CategoryID == category_id, Category.UserID == current_user.UserId)
        .first()
    )
    if not cat:
        return []

    # Find ALL category IDs with this name for this user (handles duplicates)
    all_cat_ids = [
        c.CategoryID for c in
        db.query(Category)
        .filter(
            Category.UserID == current_user.UserId,
            Category.CategoryName == cat.CategoryName
        )
        .all()
    ]

    # Fetch all budgets across all those category IDs
    budgets = (
        db.query(DBBudget)
        .filter(
            DBBudget.UserID == current_user.UserId,
            DBBudget.CategoryID.in_(all_cat_ids),
        )
        .order_by(DBBudget.StartDate.desc())
        .limit(24)
        .all()
    )

    result = []
    for b in budgets:
        # Reuse the same utilization helper so numbers are consistent
        try:
            stats = calculate_budget_utilization(db, b, current_user.UserId)
            spent      = stats["spent"]
            remaining  = stats["remaining"]
            utilization = stats["utilization"]
        except Exception:
            spent       = 0.0
            remaining   = float(b.BudgetAmount)
            utilization = 0.0

        result.append({
            "BudgetID":     b.BudgetID,
            "BudgetAmount": float(b.BudgetAmount),
            "BudgetPeriod": b.BudgetPeriod,
            "StartDate":    b.StartDate.strftime("%d %b %Y") if b.StartDate else None,
            "EndDate":      b.EndDate.strftime("%d %b %Y")   if b.EndDate   else None,
            # MonthLabel used as the key for the month picker (e.g. "Mar 2025")
            "MonthLabel":   b.StartDate.strftime("%b %Y")    if b.StartDate else None,
            "IsActive":     b.IsActive,
            # ── NEW FIELDS ──
            "Spent":        spent,
            "Remaining":    remaining,
            "Utilization":  utilization,
        })

    return result


# ── inline schema (no schemas.py change needed) ──────────────────────────────
from pydantic import BaseModel as _BaseModel
from typing import Optional as _Opt

class _BudgetEditPayload(_BaseModel):
    new_amount: _Opt[float] = None   # None = keep existing amount
    renew:      bool        = False  # True = reset date range from today


# EDIT BUDGET
@router.patch("/{budget_id}")
def edit_budget(
    budget_id: int,
    payload: _BudgetEditPayload,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    """
    Edit an active budget.
    - new_amount: optional — if omitted, existing amount is kept
    - renew: if True, reset the date range starting from today
             For Monthly/Weekly → uses get_budget_date_range
             For Custom         → extends by the same number of days as the original period
    """
    budget = (
        db.query(DBBudget)
        .filter(
            DBBudget.BudgetID == budget_id,
            DBBudget.UserID == current_user.UserId
        )
        .first()
    )

    if not budget:
        raise HTTPException(404, "Budget not found")

    # ── Amount update ────────────────────────────────────────────────────────
    if payload.new_amount is not None:
        if payload.new_amount <= 0:
            raise HTTPException(400, "Amount must be greater than 0")
        budget.BudgetAmount = payload.new_amount

    # ── Renew date range ─────────────────────────────────────────────────────
    if payload.renew:
        today = datetime.now()

        if budget.BudgetPeriod in ("Monthly", "Weekly"):
            # Standard helper handles these
            start_date, end_date = get_budget_date_range(
                period=budget.BudgetPeriod,
                reference_date=today
            )
        else:
            # Custom: keep the same duration, start from today
            original_days = max((budget.EndDate - budget.StartDate).days, 1)
            start_date    = today
            end_date      = today + timedelta(days=original_days)

        budget.StartDate = start_date
        budget.EndDate   = end_date

    db.commit()
    db.refresh(budget)

    return {
        "message":      "Budget updated successfully",
        "BudgetID":     budget.BudgetID,
        "BudgetAmount": float(budget.BudgetAmount),
        "StartDate":    budget.StartDate.strftime("%d %b %Y"),
        "EndDate":      budget.EndDate.strftime("%d %b %Y"),
    }