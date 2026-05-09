from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List
from database import get_db
from security import get_current_user
from database_models import Expense as DBExpense, User as DBUser, Category
from utils.amt import get_final_parse
from services.ml_services import predict_category_from_ml
from schemas import (
    QuickExpenseRequest,
    ExpensePreviewResponse,
    ExpenseConfirmRequest,
    ExpenseResponse,
    CategoryResponse,
    ExpenseEditRequest
)
router = APIRouter(prefix="/expenses", tags=["Expenses"])
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

# 1. view expense
@router.post("/preview", response_model=ExpensePreviewResponse)
def preview_expense(
    request: QuickExpenseRequest,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    amount, description = get_final_parse(request.raw_input)
    predicted_category = predict_category_from_ml(description)
    category_name = (
        predicted_category[0]
        if isinstance(predicted_category, list)
        else str(predicted_category)
    )
    return {
        "Amount": float(amount),
        "Description": description.strip().title(),
        "CategoryName": category_name.strip().title() if category_name else "General",
        "Date": datetime.utcnow()
    }

#2. confirmation
@router.post("/confirm", response_model=ExpenseResponse)
def confirm_expense(
    data: ExpenseConfirmRequest,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    category = (
        db.query(Category)
        .filter(
            Category.UserID == current_user.UserId,
            Category.CategoryName == data.CategoryName,
            Category.CategoryType == "Expense"
        )
        .first()
    )
    if not category:
        category = Category(
            CategoryName=data.CategoryName,
            CategoryType="Expense",
            UserID=current_user.UserId
        )
        db.add(category)
        db.commit()
        db.refresh(category)
    expense_date = data.Date if data.Date else datetime.now()
    new_expense = DBExpense(
        Amount=data.Amount,
        Description=data.Description,
        CategoryID=category.CategoryID,
        UserID=current_user.UserId,
        Date=expense_date
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return {
        "ExpenseID": new_expense.ExpenseID,
        "Amount": float(new_expense.Amount),
        "Description": new_expense.Description,
        "Date": new_expense.Date,
        "CategoryName": category.CategoryName,
        "UserID": current_user.UserId
    }
    # check_budget_alerts(
    #     db=db,
    #     user_id=expense.UserID,
    #     expense_date=expense.ExpenseDate
    # )

# 3. summary display
@router.get("/summary")
def expense_summary(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    total_amount, total_count = (
        db.query(
            func.coalesce(func.sum(DBExpense.Amount), 0),
            func.count(DBExpense.ExpenseID)
        )
        .filter(DBExpense.UserID == current_user.UserId)
        .first()
    )
    category_data = (
        db.query(
            Category.CategoryName,
            func.coalesce(func.sum(DBExpense.Amount), 0)
        )
        .join(DBExpense, DBExpense.CategoryID == Category.CategoryID)
        .filter(DBExpense.UserID == current_user.UserId)
        .group_by(Category.CategoryName)
        .all()
    )
    return {
        "total_expense": float(total_amount),
        "total_transactions": total_count,
        "category_summary": [
            {"category": name, "total": float(amount)}
            for name, amount in category_data
        ]
    }

# expense list
@router.get("", summary="Get all expenses (flat list)")
def get_all_expenses(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    expenses = (
        db.query(
            DBExpense.ExpenseID,
            DBExpense.Amount,
            DBExpense.Description,
            DBExpense.Date,
            Category.CategoryName
        )
        .outerjoin(Category, Category.CategoryID == DBExpense.CategoryID)
        .filter(DBExpense.UserID == current_user.UserId)
        .order_by(DBExpense.Date.desc())
        .all()
    )
    return [
        {
            "ExpenseID": e.ExpenseID,
            "Amount": float(e.Amount),
            "Description": e.Description,
            "Date": e.Date,
            "CategoryName": e.CategoryName or "Uncategorized"
        }
        for e in expenses
    ]

# 5. category-wise list
@router.get("/category-wise", summary="Get expenses grouped by category")
def get_expenses_category_wise(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    expenses = (
        db.query(
            DBExpense.ExpenseID,
            DBExpense.Amount,
            DBExpense.Description,
            DBExpense.Date,
            Category.CategoryName
        )
        .outerjoin(Category, Category.CategoryID == DBExpense.CategoryID)
        .filter(DBExpense.UserID == current_user.UserId)
        .order_by(DBExpense.Date.desc())
        .all()
    )
    grouped = {}
    for e in expenses:
        category = e.CategoryName or "Uncategorized"
        if category not in grouped:
            grouped[category] = {
                "category": category,
                "total": 0.0,
                "count": 0,
                "expenses": []
            }
        grouped[category]["total"] += float(e.Amount)
        grouped[category]["count"] += 1
        grouped[category]["expenses"].append({
            "ExpenseID": e.ExpenseID,
            "title": e.Description,
            "amount": float(e.Amount),
            "date": e.Date
        })
    return list(grouped.values())

@router.patch("/{expense_id}", response_model=ExpenseResponse)
def edit_expense(
    expense_id: int,
    data: ExpenseEditRequest,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    expense = (
        db.query(DBExpense)
        .filter(
            DBExpense.ExpenseID == expense_id,
            DBExpense.UserID == current_user.UserId
        )
        .first()
    )

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Update category (if sent)
    if data.CategoryName:
        category = (
            db.query(Category)
            .filter(
                Category.UserID == current_user.UserId,
                Category.CategoryName == data.CategoryName
            )
            .first()
        )
        if not category:
            category = Category(
                CategoryName=data.CategoryName,
                CategoryType="Expense",
                UserID=current_user.UserId
            )
            db.add(category)
            db.commit()
            db.refresh(category)
        expense.CategoryID = category.CategoryID

    # Update other fields
    if data.Description is not None:
        expense.Description = data.Description
    if data.Amount is not None:
        expense.Amount = data.Amount
    if data.Date is not None:
        expense.Date = data.Date
    try:
        db.commit()
        db.refresh(expense)

        return {
            "ExpenseID": expense.ExpenseID,
            "Amount": float(expense.Amount),
            "Description": expense.Description,
            "Date": expense.Date,
            "CategoryName": data.CategoryName,
            "UserID": expense.UserID
        }
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update expense")

#deletion ofexpense
@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    expense = (
        db.query(DBExpense)
        .filter(
            DBExpense.ExpenseID == expense_id,
            DBExpense.UserID == current_user.UserId
        )
        .first()
    )

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    try:
        db.delete(expense)
        db.commit()
        return {"message": "Expense deleted successfully"}

    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete expense")