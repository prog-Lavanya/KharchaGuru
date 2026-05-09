from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from database_models import User as DBUser,Goal as goals
from schemas import InvestmentPortfolioResponse, InvestmentRecommendationRequest
from security import get_current_user
from services.investment_logic import (
    get_user_data,
    analyze_expenses,
    generate_spending_insights,
    analyze_goals,
    calculate_surplus,
    decide_mode,
    save_to_db,
    validate_investment_input,
    get_user_state,
)
from services.gemini_services import build_recommendation_response
from typing import Dict, Any

router = APIRouter(prefix="/investments", tags=["Investment"])


# ============================================
# 1. GET USER STATE & INSIGHTS
# ============================================
@router.get("/state")
def get_investment_state(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user),
):
    """
    Check user's current state and return appropriate insights.
    Used by frontend to decide what to show.

    Response shape (frontend reads):
    {
      state: { state, message, action },
      insights: {
        spending: [ { category, classification, current_monthly,
                      percent_of_income, frequency,
                      potential_monthly_saving, yearly_impact,
                      action, message,
                      five_year_nominal?, five_year_real_value?,
                      expected_cagr? } ],
        goals:    [ { goal_name, target_amount, current_amount,
                      remaining, months_left, monthly_required,
                      extra_gain_if_invested, priority } ],
        avg_monthly_expense
      },
      user_profile: { total_expenses, active_goals, active_budgets }
    }
    """
    try:
        expenses, goals, budgets = get_user_data(db, current_user.UserId)
        avg_expense, category_data = analyze_expenses(expenses)
        user_state = get_user_state(expenses, goals, budgets)

        insights = {}
        if user_state["state"] != "new_user":
            spending_insights = generate_spending_insights(category_data, avg_expense)
            goal_insights = analyze_goals(goals)
            insights = {
                "spending": spending_insights,
                "goals": goal_insights,
                "avg_monthly_expense": int(avg_expense),
            }

        return {
            "state": user_state,
            "insights": insights,
            "user_profile": {
                "total_expenses": len(expenses),
                "active_goals": len(goals),
                "active_budgets": len(budgets),
            },
        }

    except Exception as e:
        print(f"❌ Error in get_investment_state: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user state",
        )


# ============================================
# 2. GET SPENDING INSIGHTS ONLY
# ============================================
@router.get("/insights")
def get_spending_insights(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user),
):
    try:
        expenses, goals, _ = get_user_data(db, current_user.UserId)
        avg_expense, category_data = analyze_expenses(expenses)

        if not expenses:
            return {
                "message": "No expense data found. Start tracking expenses to get insights.",
                "insights": [],
            }

        spending_insights = generate_spending_insights(category_data, avg_expense)
        goal_insights = analyze_goals(goals)

        return {
            "spending_insights": spending_insights,
            "goal_insights": goal_insights,
            "summary": {
                "avg_monthly_expense": int(avg_expense),
                "top_category": (
                    max(category_data.items(), key=lambda x: x[1]["total"])[0]
                    if category_data
                    else None
                ),
                "total_categories": len(category_data),
            },
        }

    except Exception as e:
        print(f"❌ Error in get_spending_insights: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate insights",
        )


# ============================================
# 3. GENERATE INVESTMENT RECOMMENDATIONS
# ============================================
@router.post("/recommendations")
def get_recommendations(
    payload: InvestmentRecommendationRequest,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user),
):
    """
    Generate personalized investment recommendations.

    Frontend sends:
      { investmentAmount, investmentDuration, riskTolerance, investmentGoal, frequency }

    investmentAmount  = exactly what user typed in "How much to invest per month?"
                        — this is used as-is as investable_amount.
                        Surplus is calculated separately for context/validation only.

    Response shape matches what ResultsModal expects:
      mode, riskLevel, investableAmount, surplus, expectedReturns,
      allocation       { "Equity MF": 70, ... }           ← percentages
      monthlyPlan      { "Equity MF": 7000, ... }         ← ₹ amounts (= allocation% × investmentAmount)
      whereToInvest    { "Equity MF": "Nifty 50 Index...", ... }
      recommendation   { best, bestDisplay, alternative, altDisplay }
      projectedGrowth  { invested_amount, projected_value, gains, rate, horizon_years }
      aiExplanation    (Gemini Hinglish string, 3 paragraphs)
      nextSteps        [...]
    """
    try:
        user_id = current_user.UserId

        # ── 1. User profile ──────────────────────────────────────────────
        user_profile = current_user.user_profile
        if not user_profile or not user_profile.MonthlyIncome:
            raise HTTPException(
                status_code=400,
                detail="Please set your monthly income in profile first",
            )
        income = float(user_profile.MonthlyIncome)

        # ── 2. Expense data (for context + surplus calc) ─────────────────
        expenses, goals, _ = get_user_data(db, user_id)
        avg_expense, category_data = analyze_expenses(expenses)
        surplus = calculate_surplus(income, avg_expense)

        # ── 3. The investable amount IS the user's input ─────────────────
        #       (not capped to surplus — user knows their finances)
        investable_amount = float(payload.investmentAmount)
        if investable_amount < 500:
            investable_amount = 500.0

        # ── 4. Validate ──────────────────────────────────────────────────
        validation_errors = validate_investment_input(
            income, investable_amount, surplus
        )
        if validation_errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "errors": validation_errors,
                    "suggestion": f"Try investing ₹{int(surplus * 0.7) if surplus > 0 else 5000}",
                },
            )

        # ── 5. Parse duration string → int years ────────────────────────
        raw_duration = payload.investmentDuration  # e.g. "<1", "1-3", "3-7", "7+"
        if isinstance(raw_duration, str):
            if raw_duration == "<1":
                horizon_years = 0
            elif raw_duration == "7+":
                horizon_years = 7
            elif "-" in raw_duration:
                horizon_years = int(raw_duration.split("-")[0])
            else:
                horizon_years = int(raw_duration)
        else:
            horizon_years = int(raw_duration)

        # ── 6. Frequency (monthly / onetime) ────────────────────────────
        frequency = getattr(payload, "frequency", "monthly") or "monthly"

        # ── 7. Decide mode ───────────────────────────────────────────────
        mode = decide_mode(
            surplus=surplus,
            risk=payload.riskTolerance,
            duration=horizon_years,
            age=25,  # TODO: pull from user_profile when available
        )

        # ── 8. Build full recommendation via gemini_services ────────────
        #       This function owns: allocation, plan, growth, scoring, Gemini
        result = build_recommendation_response(
            mode=mode,
            investable_amount=investable_amount,
            surplus=surplus,
            risk=payload.riskTolerance,
            horizon_years=horizon_years,
            frequency=frequency,
        )

        # ── 9. Save to DB ────────────────────────────────────────────────
        save_to_db(db, user_id, result["monthlyPlan"], payload.riskTolerance)

        # ── 10. Return — keys match ResultsModal destructuring exactly ───
        return result

    except HTTPException:
        raise

    except Exception as e:
        print(f"❌ Error in get_recommendations: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}",
        )


# ============================================
# 4. GET SAVED RECOMMENDATIONS
# ============================================
@router.get("/saved")
def get_saved_recommendations(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user),
):
    try:
        from database_models import InvestmentRecommendation
        from datetime import datetime, timedelta

        recommendations = (
            db.query(InvestmentRecommendation)
            .filter(
                InvestmentRecommendation.UserID == current_user.UserId,
                InvestmentRecommendation.GeneratedDate
                >= datetime.now() - timedelta(days=30),
            )
            .all()
        )

        if not recommendations:
            return {"message": "No saved recommendations found", "recommendations": []}

        grouped: Dict[str, Any] = {}
        for rec in recommendations:
            date_key = rec.GeneratedDate.date().isoformat()
            if date_key not in grouped:
                grouped[date_key] = []
            grouped[date_key].append(
                {
                    "type": rec.InvestmentType,
                    "amount": int(rec.RecommendedAmount),
                    "risk": rec.RiskLevel,
                    "expected_return": (
                        float(rec.ExpectedReturn) if rec.ExpectedReturn else 10.0
                    ),
                }
            )

        return {"total": len(recommendations), "recommendations": grouped}

    except Exception as e:
        print(f"❌ Error in get_saved_recommendations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch saved recommendations",
        )