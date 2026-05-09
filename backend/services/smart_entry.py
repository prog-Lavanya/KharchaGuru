import re
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from database_models import Category, Expense, Goal, User, UserProfile
from services.ml_services import predict_category_from_ml


INCOME_KEYWORDS = ["salary", "income", "earned", "received", "credit", "credited", "payslip", "salary slip"]
SAVING_KEYWORDS = ["save", "saving", "goal", "for buying", "for gift", "for gifts", "for trip", "for vacation"]


def _extract_amount(text: str) -> Decimal:
    matches = re.findall(r"(\d+(?:\.\d{1,2})?)", text.replace(",", ""))
    if not matches:
        return Decimal("0")
    return Decimal(matches[-1])


def _clean_description(text: str, words_to_strip: list[str]) -> str:
    cleaned = text
    for word in words_to_strip:
        cleaned = re.sub(rf"\b{re.escape(word)}\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\d+(?:\.\d{1,2})?", " ", cleaned)
    cleaned = re.sub(r"\b(rs|rupees|rupee|inr)\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .,-")
    return cleaned.title() if cleaned else ""


# 🔥 ML ONLY CATEGORY (NO KEYWORDS)
def infer_expense_category(description: str) -> str:
    return str(predict_category_from_ml(description)).title()


def parse_smart_entry(text: str):
    lowered = text.lower().strip()
    amount = _extract_amount(lowered)

    if amount <= 0:
        description = text.strip() or "Expense"
        return {
            "entry_type": "expense",
            "amount": 0,   # user edit karega
            "description": description,
            "category": infer_expense_category(description),
            "source": "voice",
        }

    # 🟢 INCOME
    if any(keyword in lowered for keyword in INCOME_KEYWORDS):
        description = _clean_description(text, INCOME_KEYWORDS) or "Salary Income"
        return {
            "entry_type": "income",
            "amount": amount,
            "description": description,
            "category": "Salary" if "salary" in lowered else "Income",
            "source": "voice",
        }

    # 🟢 SAVINGS
    if any(keyword in lowered for keyword in SAVING_KEYWORDS):
        goal_name = ""
        match = re.search(
            r"(?:save|saving)\s+\d+(?:\.\d{1,2})?\s*(?:rs|rupees|rupee|inr)?\s*(?:for|towards)?\s*(.*)",
            text,
            re.IGNORECASE,
        )
        if match:
            goal_name = match.group(1).strip(" .,-").title()

        if not goal_name:
            goal_name = _clean_description(text, SAVING_KEYWORDS) or "Savings Goal"

        return {
            "entry_type": "saving_goal",
            "amount": amount,
            "description": goal_name,
            "category": "Savings Goal",
            "source": "voice",
        }

    # 🔥 EXPENSE (ML BASED)
    description = _clean_description(text, [])
    category = infer_expense_category(description)

    return {
        "entry_type": "expense",
        "amount": amount,
        "description": description,
        "category": category,
        "source": "voice",
    }


def ensure_category(db: Session, user_id: int, category_name: str, category_type: str = "Expense"):
    category = (
        db.query(Category)
        .filter(Category.UserID == user_id, Category.CategoryName == category_name)
        .first()
    )

    if category:
        return category

    category = Category(
        UserID=user_id,
        CategoryName=category_name,
        CategoryType=category_type,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def apply_smart_entry(db: Session, user: User, payload: dict):
    entry_type = payload["entry_type"]
    amount = Decimal(payload["amount"])
    description = payload["description"]
    category_name = payload.get("category") or "General"

    # 🟢 EXPENSE
    if entry_type == "expense":
        category = ensure_category(db, user.UserId, category_name, "Expense")

        expense = Expense(
            UserID=user.UserId,
            CategoryID=category.CategoryID,
            Amount=amount,
            Date=datetime.utcnow(),
            Description=description,
        )

        db.add(expense)
        db.commit()
        db.refresh(expense)

        return {
            "message": f"Expense saved under {category_name}.",
            "entity_id": expense.ExpenseID,
        }

    # 🟢 INCOME
    if entry_type == "income":
        profile = user.user_profile

        if not profile:
            profile = UserProfile(UserID=user.UserId)
            db.add(profile)
            db.commit()
            db.refresh(profile)

        profile.MonthlyIncome = amount
        profile.UpdatedDate = datetime.utcnow()
        db.commit()

        return {
            "message": "Monthly income updated from smart entry.",
            "entity_id": profile.ProfileID,
        }

    # 🟢 SAVINGS GOAL
    goal = Goal(
        UserID=user.UserId,
        GoalName=description,
        TargetAmount=amount,
        CurrentAmount=Decimal("0"),
        TargetDate=datetime.now() + timedelta(days=90),
        Priority="Medium",
        Description=f"Created from {payload.get('source', 'smart entry')}",
        IsCompleted=False,
    )

    db.add(goal)
    db.commit()
    db.refresh(goal)

    return {
        "message": "Savings goal created from smart entry.",
        "entity_id": goal.GoalID,
    }