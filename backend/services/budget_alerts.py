from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from database_models import Expense
class BudgetAlertsService:
    # BASIC THRESHOLD ALERTS
    @staticmethod
    def usage_alert(utilization: float) -> dict | None:
        if utilization >= 100:
            return {
                "type": "over_budget",
                "severity": "critical",
                "message": "🚨 Budget exceeded!",
            }
        elif utilization >= 85:
            return {
                "type": "near_limit",
                "severity": "high",
                "message": "⚠️ You’ve used 85% of your budget",
            }
        elif utilization >45 and utilization < 59:
            return {
                "type": "halfed",
                "severity": "medium",
                "message": "⚠️ You have spent about 50% of your budget ",
            }
        return None

    # DAILY SPEND SPIKE ALERT
    @staticmethod
    def detect_spending_spike(
        db: Session,
        user_id: int,
        category_id: int
    ) -> dict | None:

        today = datetime.now().date()
        last_7_days = today - timedelta(days=7)

        daily_avg = (
            db.query(func.avg(Expense.Amount))
            .filter(
                Expense.UserID == user_id,
                Expense.CategoryID == category_id,
                Expense.Date >= last_7_days
            )
            .scalar()
        ) or 0

        today_spend = (
            db.query(func.coalesce(func.sum(Expense.Amount), 0))
            .filter(
                Expense.UserID == user_id,
                Expense.CategoryID == category_id,
                Expense.Date == today
            )
            .scalar()
        )

        if daily_avg > 0 and today_spend > daily_avg * 2:
            return {
                "type": "spending_spike",
                "severity": "medium",
                "message": "📈 Unusual spending detected today"
            }

        return None

    # PREDICTIVE OVERSHOOT ALERT 
    @staticmethod
    def predictive_overspend_alert(
        budget_amount: Decimal,
        spent_so_far,
        days_elapsed: int,
        total_days: int
    ) -> dict | None:

        if days_elapsed <= 0:
            return None

        projected_spend = (
            Decimal(spent_so_far) / Decimal(days_elapsed)
        ) * Decimal(total_days)

        if projected_spend > budget_amount:
            return {
                "type": "predicted_overspend",
                "severity": "high",
                "message": "📊 At this pace, you may exceed your budget"
            }

        return None

    # MASTER ALERT GENERATOR
    @staticmethod
    def generate_budget_alerts(
        utilization: float,
        db: Session,
        user_id: int,
        category_id: int,
        budget_amount: Decimal,
        spent_so_far,
        days_elapsed: int,
        total_days: int
    ) -> list[dict]:

        alerts = []

        basic = BudgetAlertsService.usage_alert(utilization)
        if basic:
            alerts.append(basic)

        # IF BUDGET ALREADY EXCEEDED STOP HERE
        if utilization >= 100:
            return alerts

        spike = BudgetAlertsService.detect_spending_spike(
            db, user_id, category_id
        )
        if spike:
            alerts.append(spike)

        predictive = BudgetAlertsService.predictive_overspend_alert(
            budget_amount,
            spent_so_far,
            days_elapsed,
            total_days
        )
        if predictive:
            alerts.append(predictive)

        return alerts
