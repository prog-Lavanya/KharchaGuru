import matplotlib.pyplot as plt
import tempfile
import os
from collections import defaultdict
from datetime import datetime

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from sqlalchemy.orm import joinedload

from database_models import Expense, Budget, Goal


# =========================
# FETCH DATA FROM DB
# =========================
def fetch_data(db, user_id):
    expenses = db.query(Expense).options(
        joinedload(Expense.categories)
    ).filter(Expense.UserID == user_id).all()

    budgets = db.query(Budget).options(
        joinedload(Budget.categories)
    ).filter(Budget.UserID == user_id).all()

    goals = db.query(Goal).filter(Goal.UserID == user_id).all()

    return expenses, budgets, goals


# =========================
# CATEGORY SUMMARY
# =========================
def category_summary(expenses):
    data = defaultdict(float)

    for e in expenses:
        cat = getattr(e.categories, "CategoryName", "Other") if e.categories else "Other"
        data[cat] += float(e.Amount or 0)

    return dict(data)


# =========================
# BUILD REPORT DATA
# =========================
def build_report(expenses, budgets, goals):
    categories = category_summary(expenses)

    total_expense = round(sum(categories.values()), 2)
    total_budget = round(sum(float(b.BudgetAmount or 0) for b in budgets), 2)
    remaining_budget = round(total_budget - total_expense, 2)
    usage = round((total_expense / total_budget) * 100, 1) if total_budget > 0 else 0

    budget_by_category = defaultdict(float)
    for b in budgets:
        cat = getattr(b.categories, "CategoryName", "Other") if b.categories else "Other"
        budget_by_category[cat] += float(b.BudgetAmount or 0)

    category_analysis = []
    for cat, spent in sorted(categories.items(), key=lambda item: item[1], reverse=True):
        budget = round(float(budget_by_category.get(cat, 0)), 2)
        variance = round(spent - budget, 2)

        if budget == 0 and spent > 0:
            status = "Unplanned"
        elif spent > budget:
            status = "Over Budget"
        elif budget > 0 and spent >= budget * 0.85:
            status = "Near Limit"
        else:
            status = "Healthy"

        category_analysis.append({
            "category": cat,
            "spent": round(spent, 2),
            "budget": budget,
            "variance": variance,
            "share": round((spent / total_expense) * 100, 1) if total_expense > 0 else 0,
            "status": status
        })

    goals_data = []
    for g in goals:
        current = float(g.CurrentAmount or 0)
        target = float(g.TargetAmount or 0)
        progress = round((current / target) * 100, 1) if target > 0 else 0
        gap = round(max(target - current, 0), 2)

        if progress >= 100:
            status = "Completed"
        elif progress >= 70:
            status = "On Track"
        elif progress >= 40:
            status = "Moderate"
        else:
            status = "At Risk"

        goals_data.append({
            "name": g.GoalName,
            "current": round(current, 2),
            "target": round(target, 2),
            "progress": progress,
            "gap": gap,
            "status": status
        })

    insights = []
    recommendations = []

    if total_budget > 0:
        if usage >= 100:
            insights.append("You have exceeded your total budget this cycle.")
            recommendations.append("Reduce spending first in the highest overspending category.")
        elif usage >= 85:
            insights.append(f"You have already used {usage}% of your budget, which is close to the limit.")
            recommendations.append("Keep the remaining monthly spending limited to essential categories.")
        else:
            insights.append(f"You have used {usage}% of your budget and are currently in a safe spending range.")

    if category_analysis:
        top = category_analysis[0]
        insights.append(
            f"{top['category']} is your top spending category at {top['share']}% of total expenses."
        )

    overspent = [c for c in category_analysis if c["status"] == "Over Budget"]
    if overspent:
        worst = sorted(overspent, key=lambda x: x["variance"], reverse=True)[0]
        insights.append(
            f"{worst['category']} exceeded its budget by ₹ {worst['variance']}."
        )
        recommendations.append(
            f"Review spending in {worst['category']} because it is creating the highest budget variance."
        )

    unplanned = [c for c in category_analysis if c["status"] == "Unplanned"]
    if unplanned:
        names = ", ".join([c["category"] for c in unplanned[:3]])
        insights.append(f"You spent in unplanned categories such as {names}.")
        recommendations.append("Set category-level budgets for unplanned spending to improve forecasting.")

    completed_goals = len([g for g in goals_data if g["status"] == "Completed"])
    at_risk_goals = len([g for g in goals_data if g["status"] == "At Risk"])

    insights.append(f"{completed_goals} goals are completed and {at_risk_goals} goals currently need attention.")

    if at_risk_goals > 0:
        recommendations.append("Increase contribution toward low-progress goals or revise their timeline.")

    if remaining_budget > 0:
        recommendations.append(f"You still have ₹ {remaining_budget} available. Consider moving part of it to savings goals.")

    if not recommendations:
        recommendations.append("Your finances look stable this month. Continue the same discipline.")

    return {
        "generated_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        "summary": {
            "total_expense": total_expense,
            "total_budget": total_budget,
            "remaining_budget": remaining_budget,
            "budget_used_pct": usage,
        },
        "categories": categories,
        "category_analysis": category_analysis,
        "goals": goals_data,
        "insights": insights,
        "recommendations": recommendations,
        "executive_summary": (
            f"You spent ₹ {total_expense} against a total budget of ₹ {total_budget}. "
            f"Budget utilization is {usage}%, with {completed_goals} completed goals."
        )
    }


# =========================
# CHARTS
# =========================
def generate_category_chart(categories):
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
    path = temp.name

    names = list(categories.keys())
    values = list(categories.values())

    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    fig.patch.set_facecolor("#f8fafc")
    ax.set_facecolor("#f8fafc")

    bars = ax.barh(names, values, color="#0f766e")
    ax.set_title("Expense Breakdown by Category", fontsize=13, fontweight="bold", color="#0f172a")
    ax.spines[['top', 'right', 'left', 'bottom']].set_visible(False)
    ax.grid(axis="x", linestyle="--", alpha=0.18)
    ax.tick_params(axis="x", colors="#64748b", labelsize=9)
    ax.tick_params(axis="y", colors="#334155", labelsize=9)

    max_value = max(values) if values else 0
    for bar, value in zip(bars, values):
        ax.text(
            value + (max_value * 0.02 if max_value else 1),
            bar.get_y() + bar.get_height() / 2,
            f"₹ {value:.0f}",
            va="center",
            fontsize=8.5,
            color="#0f172a"
        )

    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight")
    plt.close()

    return path


def generate_goals_chart(goals):
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
    path = temp.name

    names = [g["name"] for g in goals]
    values = [g["progress"] for g in goals]

    bar_colors = []
    for g in goals:
        if g["progress"] >= 100:
            bar_colors.append("#14b8a6")
        elif g["progress"] >= 70:
            bar_colors.append("#22c55e")
        elif g["progress"] >= 40:
            bar_colors.append("#f59e0b")
        else:
            bar_colors.append("#ef4444")

    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    fig.patch.set_facecolor("#f8fafc")
    ax.set_facecolor("#f8fafc")

    bars = ax.barh(names, values, color=bar_colors)
    ax.set_title("Goal Progress Overview", fontsize=13, fontweight="bold", color="#0f172a")
    ax.spines[['top', 'right', 'left', 'bottom']].set_visible(False)
    ax.grid(axis="x", linestyle="--", alpha=0.18)
    ax.tick_params(axis="x", colors="#64748b", labelsize=9)
    ax.tick_params(axis="y", colors="#334155", labelsize=9)
    ax.set_xlim(0, 110)

    for bar, value in zip(bars, values):
        ax.text(
            value + 2,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f}%",
            va="center",
            fontsize=8.5,
            color="#0f172a"
        )

    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight")
    plt.close()

    return path


# =========================
# PDF GENERATION
# =========================
def generate_pdf(report):
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    path = temp.name

    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        rightMargin=32,
        leftMargin=32,
        topMargin=28,
        bottomMargin=28
    )

    styles = getSampleStyleSheet()

    title = ParagraphStyle(
        "title",
        parent=styles["Title"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=4
    )

    subtitle = ParagraphStyle(
        "subtitle",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=8
    )

    section = ParagraphStyle(
        "section",
        parent=styles["Heading2"],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0f766e"),
        spaceAfter=6
    )

    body = ParagraphStyle(
        "body",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=4
    )

    small = ParagraphStyle(
        "small",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#94a3b8"),
        spaceAfter=3
    )

    kpi_label = ParagraphStyle(
        "kpi_label",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=2
    )

    kpi_value = ParagraphStyle(
        "kpi_value",
        parent=styles["Normal"],
        fontSize=14,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=1
    )

    story = []
    summary = report["summary"]

    cat_chart = generate_category_chart(report["categories"])
    goal_chart = generate_goals_chart(report["goals"])

    try:
        story.append(Paragraph("KharchaGuru Smart Financial Report", title))
        story.append(
            Paragraph(
                f"Generated on {report['generated_at']} • AI-powered monthly finance snapshot",
                subtitle,
            )
        )
        story.append(Spacer(1, 8))

        kpi_table = Table(
            [
                [
                    Paragraph("Total Budget", kpi_label),
                    Paragraph("Total Expense", kpi_label),
                    Paragraph("Remaining", kpi_label),
                    Paragraph("Used", kpi_label),
                ],
                [
                    Paragraph(f"₹ {summary['total_budget']}", kpi_value),
                    Paragraph(f"₹ {summary['total_expense']}", kpi_value),
                    Paragraph(f"₹ {summary['remaining_budget']}", kpi_value),
                    Paragraph(f"{summary['budget_used_pct']}%", kpi_value),
                ]
            ],
            colWidths=[125, 125, 125, 95]
        )

        kpi_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ecfeff")),
            ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#99f6e4")),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#ccfbf1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))

        story.append(kpi_table)
        story.append(Spacer(1, 12))

        story.append(Paragraph("Executive Summary", section))
        story.append(Paragraph(report["executive_summary"], body))
        story.append(Spacer(1, 10))

        expense_block = []
        expense_block.append(Paragraph("Expense Analysis", section))
        expense_block.append(Paragraph("Category-wise spending and budget performance.", body))
        expense_block.append(Image(cat_chart, width=5.8 * inch, height=2.8 * inch))
        expense_block.append(Spacer(1, 8))

        category_rows = [["Category", "Spent", "Budget", "Variance", "Share", "Status"]]
        for item in report["category_analysis"][:6]:
            category_rows.append([
                item["category"],
                f"₹ {item['spent']}",
                f"₹ {item['budget']}",
                f"₹ {item['variance']}",
                f"{item['share']}%",
                item["status"]
            ])

        category_table = Table(
            category_rows,
            repeatRows=1,
            colWidths=[100, 65, 65, 65, 50, 95]
        )
        category_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("LEADING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        expense_block.append(category_table)

        story.append(KeepTogether(expense_block))
        story.append(Spacer(1, 12))

        goals_block = []
        goals_block.append(Paragraph("Goals Progress", section))
        goals_block.append(Paragraph("Progress snapshot of your active savings goals.", body))
        goals_block.append(Image(goal_chart, width=5.8 * inch, height=2.8 * inch))
        goals_block.append(Spacer(1, 8))

        goal_rows = [["Goal", "Current", "Target", "Gap", "Progress", "Status"]]
        for item in report["goals"][:5]:
            goal_rows.append([
                item["name"],
                f"₹ {item['current']}",
                f"₹ {item['target']}",
                f"₹ {item['gap']}",
                f"{item['progress']}%",
                item["status"]
            ])

        goal_table = Table(
            goal_rows,
            repeatRows=1,
            colWidths=[120, 60, 60, 60, 55, 90]
        )
        goal_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("LEADING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        goals_block.append(goal_table)

        story.append(KeepTogether(goals_block))
        story.append(Spacer(1, 12))

        insights_block = []
        insights_block.append(Paragraph("Personalised Insights & Recommendations", section))
        insights_block.append(Paragraph("<b>Key Insights</b>", body))
        for item in report["insights"][:4]:
            insights_block.append(Paragraph(f"• {item}", body))

        insights_block.append(Spacer(1, 6))
        insights_block.append(Paragraph("<b>Recommended Actions</b>", body))
        for item in report["recommendations"][:4]:
            insights_block.append(Paragraph(f"• {item}", body))

        story.append(KeepTogether(insights_block))
        story.append(Spacer(1, 12))

        story.append(Paragraph("Generated by KharchaGuru-Personal Finance Assistant", small))

        doc.build(story)
        return path
    finally:
        if os.path.exists(cat_chart):
            os.remove(cat_chart)
        if os.path.exists(goal_chart):
            os.remove(goal_chart)