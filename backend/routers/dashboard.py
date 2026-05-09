from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from database import get_db
from security import get_current_user
from database_models import Budget, Expense, Goal, Category
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
@router.get("/")
def dashboard_report(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user.UserId
    total_budget = (
        db.query(func.coalesce(func.sum(Budget.BudgetAmount), 0))
        .filter(Budget.UserID == user_id, Budget.IsActive == True)
        .scalar()
    )
    total_expense = (
        db.query(func.coalesce(func.sum(Expense.Amount), 0))
        .filter(Expense.UserID == user_id)
        .scalar()
    )
    total_savings = total_budget - total_expense
    spent_subquery = (
        db.query(
            Budget.CategoryID.label("category_id"),
            func.coalesce(func.sum(Expense.Amount), 0).label("spent"),
        )
        .outerjoin(
            Expense,
            (Expense.CategoryID == Budget.CategoryID)
            & (Expense.UserID == user_id)
            & (Expense.Date >= Budget.StartDate)
            & (Expense.Date <= Budget.EndDate)
        )
        .filter(
            Budget.UserID == user_id,
            Budget.IsActive == True
        )
        .group_by(Budget.CategoryID)
        .subquery()
    )
    budget_rows = (
        db.query(
            Category.CategoryName.label("category"),
            Budget.BudgetAmount.label("limit"),
            func.coalesce(spent_subquery.c.spent, 0).label("spent"),
        )
        .join(Category, Category.CategoryID == Budget.CategoryID)
        .outerjoin(
            spent_subquery,
            spent_subquery.c.category_id == Budget.CategoryID
        )
        .filter(
            Budget.UserID == user_id,
            Budget.IsActive == True
        )
        .all()
    )
    budgets = []
    for row in budget_rows:
        limit = Decimal(row.limit)
        spent = Decimal(row.spent)

        if spent < limit * Decimal("0.8"):
            status = "ok"
        elif spent <= limit:
            status = "warning"
        else:
            status = "exceeded"

        budgets.append({
            "category": row.category,
            "limit": float(limit),
            "spent": float(spent),
            "status": status,
        })
    goals_db = (
        db.query(Goal)
        .filter(Goal.UserID == user_id)
        .all()
    )

    goals = []
    for g in goals_db:
        progress = (
            (Decimal(g.CurrentAmount) / Decimal(g.TargetAmount)) * 100
            if g.TargetAmount else Decimal("0")
        )

        goals.append({
            "name": g.GoalName,
            "target": float(g.TargetAmount),
            "current": float(g.CurrentAmount),
            "progress": round(float(progress), 2),
        })

    # RESPONSE 
    return {
        "total_budget": float(total_budget),
        "total_expense": float(total_expense),
        "total_savings": float(total_savings),
        "budgets": budgets,
        "goals": goals,
    }
