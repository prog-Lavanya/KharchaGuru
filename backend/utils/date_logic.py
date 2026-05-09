from datetime import datetime, timedelta
import calendar

def get_budget_date_range(
    period: str,
    reference_date: datetime,
    custom_start: datetime = None,
    custom_end: datetime = None
):
    """
    Monthly  -> 1st to last day of that month
    Weekly   -> Monday to Sunday
    Custom   -> user provided start & end
    """

    if period == "Monthly":
        start_date = reference_date.replace(day=1, hour=0, minute=0, second=0)
        last_day = calendar.monthrange(reference_date.year, reference_date.month)[1]
        end_date = reference_date.replace(
            day=last_day, hour=23, minute=59, second=59
        )

    elif period == "Weekly":
        start_date = reference_date - timedelta(days=reference_date.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0)
        end_date = start_date + timedelta(days=6, hours=23, minutes=59, seconds=59)

    elif period == "Custom":
        if not custom_start or not custom_end:
            raise ValueError("Custom period requires start & end date")
        if custom_end < custom_start:
            raise ValueError("EndDate cannot be before StartDate")
        start_date = custom_start
        end_date = custom_end

    else:
        raise ValueError("Invalid budget period")

    return start_date, end_date
