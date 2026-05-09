from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from database_models import Expense


def calculate_budget_utilization(db: Session, budget, user_id: int):

    total_spent = (
        db.query(func.coalesce(func.sum(Expense.Amount), 0))
        .filter(
            Expense.UserID == user_id,
            Expense.CategoryID == budget.CategoryID,
            cast(Expense.Date, Date) >= budget.StartDate,  # datetime → date cast
            cast(Expense.Date, Date) <= budget.EndDate,    # datetime → date cast
        )
        .scalar()
    )

    total_spent   = float(total_spent)
    budget_amount = float(budget.BudgetAmount)

    utilization = (
        (total_spent / budget_amount) * 100
        if budget_amount > 0
        else 0.0
    )

    return {
        "spent":       round(total_spent, 2),
        "remaining":   round(budget_amount - total_spent, 2),
        "utilization": round(utilization, 2),
    }