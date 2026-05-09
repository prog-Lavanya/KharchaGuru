# services/budget_tips.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from database_models import Expense, Category


class BudgetTipsService:

 
    # CATEGORY BASED TIPS
 
    CATEGORY_TIPS = {
        "Food": [
            "🍳 Cooking at home twice a week can save ₹1,500/month",
            "🛒 Avoid food delivery on weekdays"
        ],
        "Transport": [
            "🚶 Combine trips to reduce fuel costs",
            "🚌 Public transport could cut expenses by 30%"
        ],
        "Shopping": [
            "🛍️ Avoid impulse buys — wait 24 hours",
            "📦 Track return windows carefully"
        ],
    }

 
    # UTILIZATION BASED TIP
 
    @staticmethod
    def utilization_tip(utilization: float) -> str | None:
        if utilization >= 80:
            return "⚠️ Reduce discretionary spending for rest of period"
        elif utilization <= 40:
            return "✅ Good control! Maintain current habits"
        return None

 
    # SPENDING PATTERN TIP
 
    @staticmethod
    def spending_pattern_tip(
        db: Session,
        user_id: int
    ) -> str | None:

        top_category = (
            db.query(
                Category.CategoryName,
                func.sum(Expense.Amount).label("total")
            )
            .join(
                Expense, Expense.CategoryID == Category.CategoryID
            )
            .filter(
                Expense.UserID == user_id
            )
            .group_by(
                Category.CategoryName
            )
            .order_by(
                func.sum(Expense.Amount).desc()
            )
            .first()
        )

        if top_category:
            return (
                f"📌 Most spending happens in {top_category.CategoryName}. "
                "Consider optimizing it."
            )

        return None

 
    # MASTER GENERATOR
 
    @staticmethod
    def generate_budget_tips(
        db: Session,
        user_id: int,
        category_name: str,
        utilization: float
    ) -> list[str]:

        tips = []

        if category_name in BudgetTipsService.CATEGORY_TIPS:
            tips.extend(
                BudgetTipsService.CATEGORY_TIPS[category_name]
            )

        util_tip = BudgetTipsService.utilization_tip(utilization)
        if util_tip:
            tips.append(util_tip)

        pattern_tip = BudgetTipsService.spending_pattern_tip(db, user_id)
        if pattern_tip:
            tips.append(pattern_tip)

        return tips
