# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.orm import Session
# from typing import List
# from datetime import date
# from database import get_db
# from database_models import TaxCalculation as DBTax, User as DBUser, UserProfile as DBProfile
# from schemas import TaxCalculationResponse
# from security import get_current_user

# router = APIRouter(
#     prefix="/taxes",
#     tags=["Tax Management"]
# )

# # calc and save tax
# @router.post("/calculate", response_model=TaxCalculationResponse)
# def calculate_tax(
#     financial_year: str, 
#     regime: str, 
#     db: Session = Depends(get_db), 
#     current_user: DBUser = Depends(get_current_user)
# ):
#     profile = db.query(DBProfile).filter(DBProfile.UserID == current_user.UserId).first()
#     if not profile or not profile.MonthlyIncome:
#         raise HTTPException(
#             status_code=400, 
#             detail="Please update your Monthly Income in your Profile before calculating tax."
#         )
#     annual_income = profile.MonthlyIncome * 12
#     tax_liability = 0
#     if annual_income > 700000:
#         tax_liability = annual_income * 0.10 
#     new_tax_record = DBTax(
#         UserID=current_user.UserId,
#         FinancialYear=financial_year,
#         TotalIncome=annual_income,
#         TaxableIncome=annual_income, 
#         TaxLiability=tax_liability,
#         TaxRegime=regime,
#         SuggestedSavings=annual_income * 0.20
#     )
#     db.add(new_tax_record)
#     db.commit()
#     db.refresh(new_tax_record)
#     return new_tax_record

# # tax history
# @router.get("/history", response_model=List[TaxCalculationResponse])
# def get_tax_history(
#     db: Session = Depends(get_db), 
#     current_user: DBUser = Depends(get_current_user)
# ):
#     return db.query(DBTax).filter(DBTax.UserID == current_user.UserId).all()

# # 3. delete record
# @router.delete("/{tax_id}", status_code=status.HTTP_204_NO_CONTENT)
# def delete_tax_record(
#     tax_id: int,
#     db: Session = Depends(get_db),
#     current_user: DBUser = Depends(get_current_user)
# ):
#     record = db.query(DBTax).filter(
#         DBTax.TaxCalculationID == tax_id, 
#         DBTax.UserID == current_user.UserId
#     ).first()
#     if not record:
#         raise HTTPException(status_code=404, detail="Tax record not found")
#     db.delete(record)
#     db.commit()
#     return None


from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from database_models import TaxCalculation,User as DBUser
from schemas import TaxCalculationRequest
from schemas import TaxCalculationResponse
from utils.tax_formulas import compute_tax
from security import get_current_user

router = APIRouter(prefix="/tax", tags=["Tax Estimation"])


@router.post("/calculate", response_model=TaxCalculationResponse)
def calculate_tax(payload: TaxCalculationRequest, 
                  db: Session = Depends(get_db),
                  current_user: DBUser = Depends(get_current_user)
                ):
     # VALIDATION
    if payload.TotalIncome is None or float(payload.TotalIncome) <= 0:
        raise HTTPException(
            status_code=400,
            detail="Enter a valid amount"
        )
    total_deductions = 50000 + float(payload.Section80C or 0) + float(payload.Section80D or 0) + float(payload.HRA or 0)
    # Adjusting taxable income calculation based on your provided structure
    taxable_income, tax_liability, suggested_savings = compute_tax(
        float(payload.TotalIncome) - total_deductions
    )
    tax_record = TaxCalculation(
        UserID=current_user.UserId ,
        FinancialYear=payload.FinancialYear,
        TotalIncome=payload.TotalIncome,
        TaxableIncome=taxable_income,
        TotalDeductions=50000,     
        TaxLiability=tax_liability,
        SuggestedSavings=suggested_savings,
        CalculationDate=datetime.now()
    )

    db.add(tax_record)
    db.commit()
    db.refresh(tax_record)
    return tax_record