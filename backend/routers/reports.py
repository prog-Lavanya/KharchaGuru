#reports.py
from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
from database import get_db
from security import get_current_user
from services.report_service import fetch_data, build_report, generate_pdf
router = APIRouter(prefix="/reports", tags=["Reports"])
@router.get("/preview")
def preview_report(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    user_id = current_user.UserId

    expenses, budgets, goals = fetch_data(db, user_id)
    report = build_report(expenses, budgets, goals)
    path = generate_pdf(report)

    background_tasks.add_task(os.remove, path)

    return FileResponse(
        path,
        filename="kharchaguru_report_preview.pdf",
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=kharchaguru_report_preview.pdf"}
    )
@router.get("/download")
def download_report(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    user_id = current_user.UserId

    # 🔥 FETCH REAL DATA
    expenses, budgets, goals = fetch_data(db, user_id)

    # 🔥 BUILD REPORT
    report = build_report(expenses, budgets, goals)

    # 🔥 GENERATE PDF
    path = generate_pdf(report)

    # 🔥 AUTO DELETE FILE
    background_tasks.add_task(os.remove, path)

    return FileResponse(
        path,
        filename="kharchaguru_report.pdf",
        media_type="application/pdf"
    )