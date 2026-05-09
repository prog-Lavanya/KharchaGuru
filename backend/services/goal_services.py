from decimal import Decimal
from datetime import datetime, date
from sqlalchemy.orm import Session
from database_models import Goal
class GoalService:
    """
    Core goal-related business logic.
    No DB writes except completion status.
    """
    @staticmethod
    def calculate_progress_percentage(current: Decimal, target: Decimal) -> float:
        if target <= 0:
            return 0.0
        return min(float((current / target) * 100), 100.0)

    @staticmethod
    def calculate_days_remaining(target_date: datetime) -> int:
        return max((target_date - date.today()).days, 0)

    @staticmethod
    def calculate_monthly_required(
        target_amount: Decimal,
        current_amount: Decimal,
        target_date: datetime
    ) -> Decimal:
        remaining = target_amount - current_amount
        if remaining <= 0:
            return Decimal(0)

        days_left = GoalService.calculate_days_remaining(target_date)
        if days_left <= 0:
            return remaining

        months_left = max(days_left / 30, 1)
        return remaining / Decimal(months_left)

    @staticmethod
    def auto_update_completion(goal: Goal, db: Session) -> None:
        if goal.CurrentAmount >= goal.TargetAmount and not goal.IsCompleted:
            goal.IsCompleted = True
            goal.CompletedDate = datetime.now()

        elif goal.CurrentAmount < goal.TargetAmount and goal.IsCompleted:
            goal.IsCompleted = False
            goal.CompletedDate = None

        db.commit()

    @staticmethod
    def is_goal_on_track(
        goal: Goal,
        progress: float,
        days_remaining: int
    ) -> bool:
        if days_remaining <= 0:
            return goal.IsCompleted

        total_days = (datetime.now() - goal.CreatedDate).days
        if total_days <= 0:
            return True

        expected_progress = (total_days / (total_days + days_remaining)) * 100
        return progress >= expected_progress * 0.8  # tolerance