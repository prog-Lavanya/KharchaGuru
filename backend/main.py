from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, expenses, auth,user_profiles,budgets, goals ,dashboard, tax, investment ,smart_entry,reports
from routers import ocr, voice, reports
from database import engine, Base
from database_models import *
app = FastAPI(title="Personal Finance API")
Base.metadata.create_all(bind=engine)
# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://kharcha-guru-seven.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(expenses.router)
app.include_router(budgets.router)
app.include_router(goals.router)
app.include_router(tax.router)
app.include_router(investment.router)
app.include_router(user_profiles.router)
app.include_router(auth.router)
app.include_router(dashboard.router)

app.include_router(ocr.router)
app.include_router(voice.router)
app.include_router(reports.router)
app.include_router(smart_entry.router)
app.include_router(reports.router)


@app.get("/")
def health_check():
    return {"status": "online", "message": "Finance API is running"} 













