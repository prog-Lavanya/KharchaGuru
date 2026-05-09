#goal_alerts.py

from decimal import Decimal
from datetime import datetime
from services.goal_services import GoalService


class GoalAlertsService:
    """
    Handles all goal-related alerts, milestones and risk warnings.
    """

    @staticmethod
    def milestone_alerts(current: Decimal, target: Decimal) -> list[str]:
        progress = GoalService.calculate_progress_percentage(current, target)
        alerts = []

        if progress >= 100:
            alerts.append("🎉 Goal achieved! Excellent financial discipline.")
        elif progress >= 75:
            alerts.append("🚀 75% completed — almost there!")
        elif progress >= 50:
            alerts.append("🔥 Halfway reached. Keep the momentum going!")
        elif progress >= 25:
            alerts.append("🎯 25% milestone achieved. Strong start!")

        return alerts

    @staticmethod
    def deadline_risk_alert(days_remaining: int, progress: float) -> dict | None:
        if progress >= 100:
            return None

        if days_remaining <= 7:
            return {
                "type": "critical",
                "message": (
                    f"🚨 Only {days_remaining} days left and progress is {progress:.1f}%. "
                    "Prioritize this goal now."
                )
            }

        if days_remaining <= 30 and progress < 50:
            return {
                "type": "risk",
                "message": (
                    f"⚠️ Only {days_remaining} days left but progress is {progress:.1f}%. "
                    "You may miss the goal without corrective action."
                )
            }

        return None
    
    @staticmethod
    def excess_savings_alert(extra_amount: Decimal) -> dict | None:
        if extra_amount > 0:
            return {
                "type": "success",
                "message": f"🎉 ₹{extra_amount:.2f} moved to your savings!"
        }
        return None

    @staticmethod
    def contribution_milestone(
        previous: Decimal,
        current: Decimal,
        target: Decimal
    ) -> str | None:

        old = GoalService.calculate_progress_percentage(previous, target)
        new = GoalService.calculate_progress_percentage(current, target)

        thresholds = [
            (100, "🎉 Goal completed!"),
            (75, "🚀 75% milestone reached"),
            (50, "🔥 Halfway milestone reached"),
            (25, "🎯 25% milestone reached"),
        ]

        for t, msg in thresholds:
            if old < t <= new:
                return msg

        return None