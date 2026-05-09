from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from database_models import Expense, Category
from services.goal_services import GoalService


class GoalTipsService:
    """
    Generates intelligent, behavior-driven savings suggestions
    based on user's spending patterns and goal urgency.
    """

    @staticmethod
    def generate_savings_tips(
        db: Session,
        user_id: int,
        monthly_required: Decimal,
        days_remaining: int
    ) -> list[str]:

        tips = []

        # -----------------------------
        # 1. Analyze last 30 days spend
        # -----------------------------
        last_30_days = datetime.now() - timedelta(days=30)

        total_spent = db.query(
            func.coalesce(func.sum(Expense.Amount), 0)
        ).filter(
            Expense.UserID == user_id,
            Expense.Date >= last_30_days
        ).scalar()

        # -----------------------------
        # 2. Savings Feasibility Check
        # -----------------------------
        if total_spent > 0:
            savings_ratio = (monthly_required / total_spent) * 100

            if savings_ratio > 60:
                tips.append(
                    "⚠️ Your required savings exceed 60% of your recent spending. "
                    "This goal may be aggressive — consider extending the deadline or cutting major expenses."
                )
            elif savings_ratio > 40:
                tips.append(
                    "💡 To meet this goal, you should significantly reduce discretionary expenses."
                )
            elif savings_ratio > 25:
                tips.append(
                    "👍 Your savings target is realistic. Minor spending adjustments will help."
                )
            else:
                tips.append(
                    "✅ Great! You can meet this goal with minimal lifestyle changes."
                )

        # -----------------------------
        # 3. Category Leakage Detection
        # -----------------------------
        category_spending = db.query(
            Category.CategoryName,
            func.sum(Expense.Amount).label("total")
        ).join(
            Expense, Expense.CategoryID == Category.CategoryID
        ).filter(
            Expense.UserID == user_id,
            Expense.Date >= last_30_days
        ).group_by(Category.CategoryName).all()

        if category_spending:
            top_category = max(category_spending, key=lambda x: x.total)
            tips.append(
                f"📉 High spending detected in '{top_category.CategoryName}'. "
                f"Reducing this category could significantly improve your savings."
            )

        # -----------------------------
        # 4. Time Urgency Analysis
        # -----------------------------
        if days_remaining <= 15:
            tips.append(
                "🚨 Goal deadline is very close. Consider making lump-sum contributions."
            )
        elif days_remaining <= 60:
            tips.append(
                "⏳ Goal deadline approaching. Increase your monthly contribution."
            )
        else:
            tips.append(
                "📆 You have sufficient time. Focus on consistency."
            )

        # -----------------------------
        # 5. Actionable Recommendation
        # -----------------------------
        tips.append(
            f"💰 Recommended monthly saving: ₹{monthly_required:.2f}"
        )

        tips.append(
            "🔄 Automate savings transfers right after salary credit to avoid overspending."
        )

        return tips