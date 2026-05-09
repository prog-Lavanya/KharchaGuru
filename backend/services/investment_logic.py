from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database_models import Expense, Goal, Budget, InvestmentRecommendation
# 1. FETCH USER DATA
def get_user_data(db: Session, user_id: int):
    """Fetch last 3 months expenses, active goals, and budgets"""
    last_3_months = datetime.now() - timedelta(days=90)

    expenses = db.query(Expense).filter(
        Expense.UserID == user_id,
        Expense.Date >= last_3_months
    ).all()

    goals = db.query(Goal).filter(
        Goal.UserID == user_id,
        Goal.IsCompleted == False
    ).all()

    budgets = db.query(Budget).filter(
        Budget.UserID == user_id,
        Budget.IsActive == True
    ).all()

    return expenses, goals, budgets


# ============================================
# 2. EXPENSE ANALYSIS
# ============================================
def analyze_expenses(expenses):
    """Calculate average monthly expense and category breakdown"""
    if not expenses:
        return 0, {}
    
    total = sum(float(e.Amount) for e in expenses)
    avg_monthly = total / 3

    category_data = {}
    for e in expenses:
        cat = e.categories.CategoryName if e.categories else "Others"
        if cat not in category_data:
            category_data[cat] = {"total": 0, "count": 0}
        
        category_data[cat]["total"] += float(e.Amount)
        category_data[cat]["count"] += 1

    return avg_monthly, category_data

def classify_category(category_name: str) -> str:
    cat_lower = category_name.lower().strip()
    
    FIXED_KEYWORDS = {"rent & housing", "emi", "loan", "insurance", "tax","healthcare"}
    FLEXIBLE_KEYWORDS = {"groceries","repair & maintenance", "fuel","transport", "bill" }
    
    for keyword in FIXED_KEYWORDS:
        if keyword in cat_lower:
            return "fixed"
    
    for keyword in FLEXIBLE_KEYWORDS:
        if keyword in cat_lower:
            return "flexible"
    
    return "discretionary"

def calculate_sip_future_value(monthly_investment: int, annual_rate: float, years: int) -> int:
    monthly_rate = annual_rate / 12
    total_months = years * 12

    if monthly_rate == 0:
        return monthly_investment * total_months

    fv = monthly_investment * (((1 + monthly_rate) ** total_months - 1) / monthly_rate) * (1 + monthly_rate)
    return int(fv)

def generate_message(category, bucket, current_monthly, saving, action, five_year_nominal=None, percent_of_income=0):
    
    if action == "optimize":
        return f"{category} optimize karo → ₹{saving}/month save hoga"
    
    elif action == "invest":
        lakhs = round((five_year_nominal or 0) / 100000, 2)
        return f"{category} se ₹{saving}/month invest karo → ₹{lakhs}L in 5 years"
    
    return ""
# ============================================
# 3. SMART SPENDING INSIGHTS
# ============================================
def generate_spending_insights(category_data, avg_monthly):
    insights = []
    if avg_monthly == 0 or not category_data:
        return insights
    for cat, data in category_data.items():
        monthly_avg = data["total"] / 3
        frequency = data.get("count", 1)
        if monthly_avg < 500:
            continue
        bucket = classify_category(cat) 
        if bucket == "fixed":
            continue
        # REDUCTION 
        reduction_rate = 0.10 if bucket == "flexible" else 0.25
        potential_saving = int(monthly_avg * reduction_rate)
        if potential_saving < 100:
            continue
        # ACTION
        if bucket == "flexible":
            action = "optimize"
        else:
            action = "invest"
        #  MESSAGE 
        message = generate_message(category=cat,bucket=bucket,
            current_monthly=int(monthly_avg),saving=potential_saving,action=action,
            five_year_nominal=calculate_sip_future_value(potential_saving, 0.12, 5) if action == "invest" else None,
            percent_of_income=0
        )
        insights.append({
            "type": action,
            "category": cat,
            "current_monthly": int(monthly_avg),
            "frequency": frequency,
            "potential_monthly_saving": potential_saving,
            "yearly_impact": potential_saving * 12,
            "message": message
        })
    return sorted(insights, key=lambda x: x["potential_monthly_saving"], reverse=True)[:4]

# ============================================
# 4. GOAL-ALIGNED INSIGHTS
# ============================================
def analyze_goals(goals):
    """Calculate monthly savings needed for each goal"""
    goal_insights = []

    for g in goals:
        remaining = float(g.TargetAmount - (g.CurrentAmount or 0))
        
        # Calculate days remaining
        if isinstance(g.TargetDate, datetime):
            days_left = (g.TargetDate.date() - datetime.now().date()).days
        else:
            days_left = (g.TargetDate - datetime.now().date()).days

        if days_left <= 0:
            continue

        months_left = max(days_left / 30, 1)
        monthly_required = remaining / months_left
        
        # Calculate if investing helps
        savings_account_growth = remaining * (1.04 ** (months_left / 12))  # 4% savings account
        investment_growth = remaining * (1.12 ** (months_left / 12))  # 12% balanced investing
        extra_gain = int(investment_growth - savings_account_growth)

        goal_insights.append({
            "goal_name": g.GoalName,
            "target_amount": int(g.TargetAmount),
            "current_amount": int(g.CurrentAmount or 0),
            "remaining": int(remaining),
            "months_left": int(months_left),
            "monthly_required": int(monthly_required),
            "extra_gain_if_invested": extra_gain,
            "priority": g.Priority
        })

    return sorted(goal_insights, key=lambda x: x["priority"], reverse=True)

# ============================================
# 6. DYNAMIC INVESTMENT MODE
# ============================================
def decide_mode(surplus, risk, duration, age=None):
    """
    Smart investment mode based on multiple factors
    Returns: safe, balanced, aggressive, lumpsum
    """

    
    #  Very short term (<1 year) - Always safe
    if duration < 1:
        return "safe"
    
    #  Short-medium term (1-3 years)
    if duration <= 3:
        if risk == "high":
            return "balanced"  # Don't allow full aggressive for short term
        return "safe"
    
    # Medium-long term (3-7 years)
    if duration <= 7:
        if risk == "high":
            return "aggressive"
        elif risk == "medium":
            return "balanced"
        else:
            return "safe"
    
    #  Long term (7+ years) - Age matters
    if age and age < 30:
        # Young age = can take more risk
        if risk == "low":
            return "balanced"  # Push them to balanced at least
        elif risk == "medium":
            return "aggressive"
        else:
            return "aggressive"
    else:
        # Standard mapping
        risk_map = {
            "low": "safe",
            "medium": "balanced",
            "high": "aggressive"
        }
        return risk_map.get(risk, "balanced")


# ============================================
# 7. DYNAMIC ALLOCATION
def get_allocation(mode, age=None, goal_priority=None):
    """
    Smart allocation based on mode, age, and goal priority
    Returns: Dict with investment categories and percentages
    """
    if mode == "safe":
        return {
            "Debt Funds": 45,
            "FD": 35,
            "Gold": 15,
            "Liquid Funds": 5
        }
    if mode == "aggressive":
        base = {
            "Equity MF": 70,
            "Debt Funds": 20,
            "Gold": 10
        }
        # Adjust for young age
        if age and age < 25:
            base["Equity MF"] = 75
            base["Debt Funds"] = 15
            base["Gold"] = 10
        return base
    if mode == "lumpsum":
        return {
            "Debt Funds": 50,
            "FD": 30,
            "Gold": 15,
            "Liquid Funds": 5
        }
    # Default: Balanced
    return {
        "Equity MF": 50,
        "Debt Funds": 30,
        "FD": 10,
        "Gold": 10
    }


# ============================================
# 8. GENERATE INVESTMENT PLAN
# ============================================

def generate_plan(allocation, investable):
    """Convert allocation percentages to actual amounts"""
    if isinstance(allocation, dict) and "message" in allocation:
        return {"message": allocation["message"]}
    plan = {}
    for category, percentage in allocation.items():
        amount = int((investable * percentage) / 100)
        if amount > 0:  # Only add if amount > 0
            plan[category] = amount
    return plan
# 9. CALCULATE FUTURE GROWTH
def calculate_growth(investable, years, mode="balanced"):
    """Calculate projected growth based on investment mode"""
    rate_map = {
        "safe": 0.07,       # 7% CAGR
        "balanced": 0.12,   # 12% CAGR
        "aggressive": 0.15, # 15% CAGR
        "lumpsum": 0.08     # 8% CAGR
    }
    rate = rate_map.get(mode, 0.12)
    months = years * 12
    future_value = 0    
    for month in range(months):
        months_remaining = months - month
        future_value += investable * ((1 + rate/12) ** months_remaining)
    return {
        "invested_amount": int(investable * months),
        "projected_value": int(future_value),
        "gains": int(future_value - (investable * months)),
        "rate": f"{int(rate * 100)}%"
    }

def calculate_surplus(income, avg_expense):
    """
    Calculate realistic investable surplus
    """

    # Safety check
    if income is None:
        return 0

    income = float(income)

    # If no expense data → assume 50% spending
    if avg_expense == 0:
        avg_expense = income * 0.5

    # Add buffer (10% extra expenses for safety)
    adjusted_expense = avg_expense * 1.1

    # Surplus calculation
    surplus = income - adjusted_expense

    # Never return negative
    return max(int(surplus), 0)
# ============================================
# 10. SAVE TO DATABASE
# ============================================
def save_to_db(db: Session, user_id: int, plan: dict, risk: str):
    """Save investment recommendations to database"""
    
    if "message" in plan:  # Edge case: emergency fund message
        return
    
    # Delete old recommendations (older than 30 days)
    db.query(InvestmentRecommendation).filter(
        InvestmentRecommendation.UserID == user_id,
        InvestmentRecommendation.GeneratedDate < datetime.now() - timedelta(days=30)
    ).delete()
    
    # Add new recommendations
    for category, amount in plan.items():
        if amount <= 0:
            continue
        
        recommendation = InvestmentRecommendation(
            UserID=user_id,
            InvestmentType=category,
            InvestmentName=category,
            RecommendedAmount=amount,
            RiskLevel=risk.capitalize() if risk in ["low", "medium", "high"] else "Medium",
            ExpectedReturn=12.0,  # Default expected return
            GeneratedDate=datetime.now(),
            ExpiryDate=datetime.now() + timedelta(days=30)
        )
        db.add(recommendation)
    
    db.commit()


# ============================================
# 11. VALIDATE USER INPUT
# ============================================
def validate_investment_input(income, investment_amount, surplus):
    """Validate user investment inputs"""
    errors = []
    
    if investment_amount <= 0:
        errors.append("Investment amount must be greater than 0")
    
    if investment_amount > income:
        errors.append(f"Investment amount (₹{investment_amount}) cannot exceed monthly income (₹{income})")
    
    if surplus > 0 and investment_amount > surplus * 1.5:
        errors.append(f"Investment amount too high. Your surplus is only ₹{int(surplus)}. Consider reducing.")
    
    return errors


# ============================================
# 12. DETERMINE USER STATE
# ============================================
def get_user_state(expenses, goals, budgets):
    """Determine what to show user based on their data"""
    
    has_expenses = len(expenses) > 0
    has_goals = len(goals) > 0
    has_budgets = len(budgets) > 0
    
    if not has_expenses:
        return {
            "state": "new_user",
            "message": "Start tracking expenses to get personalized investment advice",
            "action": "track_expenses"
        }
    
    if has_expenses and not has_goals:
        return {
            "state": "has_expenses",
            "message": "Add financial goals to get goal-aligned investment plans",
            "action": "add_goals"
        }
    
    if has_expenses and has_goals:
        return {
            "state": "ready",
            "message": "Get personalized investment recommendations",
            "action": "get_advice"
        }
    
    return {"state": "unknown", "message": "Continue building your financial profile"}