"""
investment_logic.py
KharchaGuru — Investment Recommendation Engine
Scoring-based model (no if-else jungle). Gemini used ONLY for explanation.
"""

import os
import requests
from dotenv import load_dotenv
import json
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


# ─────────────────────────────────────────────────────────────────────────────
# ALLOCATION MATRICES
# ─────────────────────────────────────────────────────────────────────────────

ALLOCATIONS = {
    "safe": {
        "Debt Funds": 45,
        "FD":         35,
        "Gold":       15,
        "Liquid Funds": 5,
    },
    "balanced": {
        "Equity MF":  50,
        "Debt Funds": 30,
        "FD":         10,
        "Gold":       10,
    },
    "aggressive": {
        "Equity MF":  70,
        "Debt Funds": 20,
        "Gold":       10,
    },
}

# Brief "where to invest" hints per category
WHERE_TO_INVEST = {
    "Equity MF":  "Nifty 50 Index Fund / Parag Parikh Flexi Cap",
    "Debt Funds": "HDFC Short Term Debt / ICICI Corporate Bond",
    "FD":         "SBI / HDFC Bank FD (7–7.5%) or Bajaj Finance FD (8%+)",
    "Gold":       "Sovereign Gold Bonds (SGB) or Gold ETF",
    "Liquid Funds":     "HDFC Liquid Fund / Axis Liquid Fund",
}

# Human-readable names
DISPLAY_NAMES = {
    "Equity MF":  "Equity Mutual Fund (SIP)",
    "Debt Funds": "Debt Mutual Fund",
    "FD":         "Fixed Deposit",
    "Gold":       "Gold (SGB / ETF)",
    "Liquid Funds":     "Liquid Fund",
}


# ─────────────────────────────────────────────────────────────────────────────
# SCORING MODEL
# ─────────────────────────────────────────────────────────────────────────────

def pick_recommendations(risk: str, horizon_years: int, surplus: float) -> tuple[str, str]:
    """
    Score each asset class and return (best, alternative).
    Pure scoring — no Gemini, no if-else jungle.
    """
    scores: dict[str, float] = {
        "Equity MF":  0.0,
        "Debt Funds": 0.0,
        "FD":         0.0,
        "Gold":       0.0,
    }

    # ── HORIZON score ──────────────────────────────────────────────────────
    if horizon_years >= 7:
        scores["Equity MF"]  += 4.0
        scores["Gold"]       += 1.5
        scores["Debt Funds"] += 0.5
    elif horizon_years >= 5:
        scores["Equity MF"]  += 3.0
        scores["Gold"]       += 1.5
        scores["Debt Funds"] += 1.0
    elif horizon_years >= 3:
        scores["Debt Funds"] += 3.0
        scores["Equity MF"]  += 1.5
        scores["Gold"]       += 1.0
    elif horizon_years >= 1:
        scores["Debt Funds"] += 2.5
        scores["FD"]         += 2.0
        scores["Gold"]       += 0.5
    else:
        scores["FD"]         += 4.0
        scores["Liquid Funds"]     = 3.0   # add Liquid for very short term

    # ── RISK score ────────────────────────────────────────────────────────
    risk = risk.lower()
    if risk == "high":
        scores["Equity MF"]  += 3.0
        scores["Gold"]       += 0.5
    elif risk == "medium":
        scores["Debt Funds"] += 2.0
        scores["Equity MF"]  += 1.0
        scores["Gold"]       += 1.0
    else:  # low / safe
        scores["FD"]         += 3.0
        scores["Debt Funds"] += 1.5

    # ── SURPLUS score ─────────────────────────────────────────────────────
    if surplus > 15000:
        scores["Equity MF"]  += 2.0
    elif surplus > 5000:
        scores["Equity MF"]  += 1.0
        scores["Debt Funds"] += 0.5
    elif surplus > 0:
        scores["Debt Funds"] += 1.5
        scores["FD"]         += 1.0
    else:
        scores["FD"]         += 2.0  # no surplus → safest park

    # Sort descending
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    best        = ranked[0][0]
    alternative = ranked[1][0]

    return best, alternative


# ─────────────────────────────────────────────────────────────────────────────
# ALLOCATION + PLAN
# ─────────────────────────────────────────────────────────────────────────────

def get_allocation(mode: str) -> dict[str, int]:
    return ALLOCATIONS.get(mode, ALLOCATIONS["balanced"])


def generate_plan(allocation: dict[str, int], investable_amount: float) -> dict[str, float]:
    return {
        category: round(investable_amount * pct / 100, 2)
        for category, pct in allocation.items()
    }


# ─────────────────────────────────────────────────────────────────────────────
# PROJECTED GROWTH  (SIP compound formula)
# ─────────────────────────────────────────────────────────────────────────────

RATE_BY_MODE = {"safe": 0.07, "balanced": 0.10, "aggressive": 0.12}

def projected_growth(investable: float, mode: str, horizon_years: int, frequency: str) -> dict:
    rate = RATE_BY_MODE.get(mode, 0.10)

    if frequency == "onetime":
        invested = investable
        fv = round(invested * ((1 + rate) ** horizon_years), 2)
    else:
        r = rate / 12
        n = horizon_years * 12
        invested = round(investable * n, 2)
        fv = round(investable * (((1 + r) ** n - 1) / r) * (1 + r), 2)

    gains = round(fv - invested, 2)
    annual_pct = f"{int(rate * 100)}%"

    return {
        "invested_amount":  invested,
        "projected_value":  fv,
        "gains":            gains,
        "rate":             annual_pct,
        "horizon_years":    horizon_years,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GEMINI — EXPLANATION ONLY
# ─────────────────────────────────────────────────────────────────────────────

def get_gemini_explanation(
    risk: str,
    horizon_years: int,
    surplus: float,
    best: str,
    alternative: str,
    mode: str,
    investable_amount: float,
    allocation: dict[str, int],
    monthly_plan: dict[str, float],
    where_to_invest: dict[str, str],
    growth: dict,
    expected_returns: str,
) -> str:
    """
    Gemini is used only to explain the already-decided recommendation.
    It must not change or override the scoring result.
    """
    all_options = ["Equity MF", "Debt Funds", "FD", "Gold", "Liquid Funds"]
    others = [o for o in all_options if o not in (best, alternative)]

    prompt = f"""
You are a financial explanation assistant for an Indian personal finance app called KharchaGuru.

Your role is strictly limited:
- Do not make investment decisions.
- Do not change the recommendation.
- Do not suggest options outside the provided result.
- Do not ask follow-up questions.
- Explain only using the input data below.

Writing style:
- Use clear, professional, user-friendly English.
- Be supportive, practical, and concise.
- Do not use Hinglish, slang, hype, or casual phrases.
- Do not use emojis.
- Avoid sounding sales-driven or overly technical.
- Mention clearly that projected returns are estimates and not guaranteed.

User data:
- Risk level: {risk}
- Investment horizon: {horizon_years} years
- Monthly surplus: Rs. {int(surplus):,}
- Monthly investable amount: Rs. {int(investable_amount):,}
- Investment mode: {mode}
- Expected returns: {expected_returns}

Allocation:
{json.dumps(allocation, indent=2)}

Monthly plan:
{json.dumps(monthly_plan, indent=2)}

Where to invest:
{json.dumps(where_to_invest, indent=2)}

Recommendation:
- Best option: {best} ({DISPLAY_NAMES.get(best, best)})
- Alternative option: {alternative} ({DISPLAY_NAMES.get(alternative, alternative)})
- Less suitable options: {", ".join(others)}

Projected growth:
{json.dumps(growth, indent=2)}

Write the response in exactly 3 short paragraphs:

Paragraph 1:
Explain why the best option is the strongest fit based on risk level, time horizon, and available surplus.

Paragraph 2:
Explain why the alternative is still reasonable, but secondary to the best option.

Paragraph 3:
Explain the allocation logic and projected growth in simple language, and clearly state that returns are approximate and not guaranteed.

Output rules:
- Plain text only
- No bullet points
- No markdown
- No labels like "Paragraph 1"
- Keep the full response under 220 words
""".strip()

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.35,
            "maxOutputTokens": 350,
        },
    }

    try:
        resp = requests.post(url, json=payload, timeout=12)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"Gemini error: {e}")
        return _fallback_explanation(
            risk=risk,
            horizon_years=horizon_years,
            surplus=surplus,
            best=best,
            alternative=alternative,
            growth=growth,
        )


def _fallback_explanation(risk, horizon_years, surplus, best, alternative, growth):
    return (
        f"{DISPLAY_NAMES[best]} appears to be the strongest fit for this profile because it aligns with a {risk} risk level, "
        f"a {horizon_years}-year investment horizon, and a monthly surplus of Rs. {int(surplus):,}. "
        f"This makes it more suitable for the user’s capacity and long-term financial direction.\n\n"
        f"{DISPLAY_NAMES[alternative]} is also a reasonable option, especially for someone who prefers relatively more stability, "
        f"but it ranks behind {DISPLAY_NAMES[best]} for the current profile and scoring outcome.\n\n"
        f"The suggested allocation is designed to balance growth and stability across asset types. Based on the current projection, "
        f"an invested amount of Rs. {int(growth['invested_amount']):,} may grow to about Rs. {int(growth['projected_value']):,} "
        f"over {growth['horizon_years']} years at an approximate rate of {growth['rate']}. These figures are estimates and not guaranteed."
    )

def build_recommendation_response(
    mode: str,
    investable_amount: float,
    surplus: float,
    risk: str,
    horizon_years: int,
    frequency: str,
) -> dict:
    allocation = get_allocation(mode)
    plan = generate_plan(allocation, investable_amount)
    growth = projected_growth(investable_amount, mode, horizon_years, frequency)
    best, alt = pick_recommendations(risk, horizon_years, surplus)

    expected_returns = f"{int(RATE_BY_MODE.get(mode, 0.10) * 100)}% p.a. (approx)"
    where_to_invest = {k: WHERE_TO_INVEST.get(k, "") for k in allocation}

    explanation = get_gemini_explanation(
        risk=risk,
        horizon_years=horizon_years,
        surplus=surplus,
        best=best,
        alternative=alt,
        mode=mode,
        investable_amount=investable_amount,
        allocation=allocation,
        monthly_plan=plan,
        where_to_invest=where_to_invest,
        growth=growth,
        expected_returns=expected_returns,
    )

    return {
        "mode": mode,
        "riskLevel": risk,
        "investableAmount": investable_amount,
        "surplus": surplus,
        "expectedReturns": expected_returns,
        "allocation": allocation,
        "monthlyPlan": plan,
        "whereToInvest": where_to_invest,
        "recommendation": {
            "best": best,
            "bestDisplay": DISPLAY_NAMES.get(best, best),
            "alternative": alt,
            "altDisplay": DISPLAY_NAMES.get(alt, alt),
        },
        "projectedGrowth": growth,
        "aiExplanation": explanation,
    }
