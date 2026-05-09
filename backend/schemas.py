from pydantic import BaseModel, Field, ConfigDict,EmailStr,model_validator,field_validator
from datetime import datetime, date
from typing import Optional,Literal,List,Dict
from decimal import Decimal
import re

# 1. USER SCHEMAS
class UserBase(BaseModel):
    mailId: EmailStr 
    Username: str = Field(..., max_length=50)
    FirstName: str = Field(..., max_length=50)
    LastName: str = Field(..., max_length=50)
    DateOfBirth: datetime
    UserType: str
    SecurityQuestion: str = Field(..., max_length=200)
    @field_validator("Username")
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9._]+$', v):
            raise ValueError("Username can only contain letters, numbers, . and _")
        return v

    @field_validator("DateOfBirth")
    def validate_age(cls, v):
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))

        if age < 15 or age > 100:
            raise ValueError("Age must be between 15 and 100")

        return v 

class UserCreate(UserBase):
    Password: str = Field(..., min_length=8, max_length=60)
    SecurityAnswer: str = Field(..., max_length=255)

    @field_validator("Password")
    def validate_password(cls, v):
        if not re.match(r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^()_\-+=]).+$', v):
            raise ValueError("Password must include letter, number and special character")
        return v

class UserLogin(BaseModel):
    Identifier: str 
    Password: str 

class LoginResponse(BaseModel):
    UserId: int
    Username: str
    mailId: EmailStr
    access_token: str
    UserType:str
    token_type: str = "bearer"
    model_config = ConfigDict(from_attributes=True)

class UserResponse(UserBase):
    mailId:EmailStr
    UserId: int
    CreatedDate: datetime
    LastLoginDate: Optional[datetime] = None
    UserType:str
    IsActive: bool
    
    model_config = ConfigDict(from_attributes=True)

# 2. USER PROFILE SCHEMAS
class StandardProfileDisplay(BaseModel):
    # User Details
    FullName: str
    Username: str
    DateOfBirth: Optional[datetime]
    Email: str
    UserType: str 
    MonthlyIncome: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)
    
 
# 3. CATEGORY SCHEMAS 
class CategoryBase(BaseModel):
    CategoryName: str = Field(..., max_length=100)
    CategoryType: Literal["Expense", "Income"]
    ParentCategoryID: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    CategoryID: int
    UserID: int

    model_config = ConfigDict(from_attributes=True)
 
#4. EXPENSE SCHEMAS 
class QuickExpenseRequest(BaseModel):
    raw_input: str


class ExpensePreviewResponse(BaseModel):
    Amount: float
    Description: str
    CategoryName: str
    Date: datetime

class ExpenseConfirmRequest(BaseModel):
    Amount: float
    Description: str
    CategoryName: str
    Date: Optional[datetime] = None

class ExpenseResponse(BaseModel):
    ExpenseID: int
    Amount: float
    Description: str
    Date: datetime
    CategoryName: str
    UserID: int

    model_config = {"from_attributes": True}

class ExpenseEditRequest(BaseModel):
    Description: Optional[str] = None
    Amount: Optional[float] = None
    Date: Optional[datetime] = None
    CategoryName: Optional[str] = None


# 5. BUDGET SCHEMAS 

class BudgetBase(BaseModel):
    CategoryID: int
    BudgetAmount: Decimal = Field(..., gt=0)
    BudgetPeriod: Literal["Monthly", "Weekly", "Custom"]
    StartDate: Optional[datetime] = None
    EndDate: Optional[datetime] = None
    IsActive: bool = True

    @model_validator(mode="after")
    def validate_dates(self):
        # Only validate dates if Custom
        if self.BudgetPeriod == "Custom":
            if self.StartDate is None or self.EndDate is None:
                raise ValueError("StartDate and EndDate required for Custom budget")
        return self

class BudgetCreate(BudgetBase):
    CategoryID: Optional[int] = None
    CategoryName: Optional[str] = None  # 
    BudgetAmount: Decimal = Field(..., gt=0)
    BudgetPeriod: Literal["Monthly", "Weekly", "Custom"]
    StartDate: Optional[datetime] = None
    EndDate: Optional[datetime] = None
    IsActive: bool = True

class BudgetUpdate(BaseModel):
    BudgetAmount: Optional[Decimal] = None
    IsActive: Optional[bool] = None


# 6. GOAL SCHEMAS

class GoalBase(BaseModel):
    GoalName: str = Field(..., min_length=1, max_length=100)
    TargetAmount: Decimal = Field(..., gt=0)
    CurrentAmount: Decimal = Field(0, ge=0)
    TargetDate: datetime
    Priority: str = Field("Medium", pattern="^(High|Medium|Low)$")
    Description: Optional[str] = Field(None, max_length=500)

class GoalCreate(GoalBase):

    @field_validator("TargetDate")
    def target_date_must_be_future(cls, v):
        if v.date() <= datetime.now().date():
            raise ValueError("TargetDate must be in the future")
        return v

    @field_validator("CurrentAmount")
    def current_amount_cannot_exceed_target(cls, v, info):
        target = info.data.get("TargetAmount")
        if target is not None and v > target:
            raise ValueError("CurrentAmount cannot exceed TargetAmount")
        return v


class GoalUpdate(BaseModel):
    GoalName: Optional[str] = Field(None, min_length=1, max_length=100)
    TargetAmount: Optional[Decimal] = Field(None, gt=0)
    CurrentAmount: Optional[Decimal] = Field(None, ge=0)
    TargetDate: Optional[datetime] = None
    Priority: Optional[str] = Field(None, pattern="^(High|Medium|Low)$")
    Description: Optional[str] = Field(None, max_length=500)
    IsCompleted: Optional[bool] = None

class GoalResponse(GoalBase):
    GoalID: int
    UserID: int
    IsCompleted: bool
    CreatedDate: datetime
    CompletedDate: Optional[datetime] = None

    class Config:
        from_attributes = True

class GoalStats(BaseModel):
    total_goals: int
    completed: int
    in_progress: int
    high_priority: int
    medium_priority: int
    low_priority: int

class AlertResponse(BaseModel):
    type: str
    message: str

class GoalDetailsResponse(BaseModel):
    goal: GoalResponse
    progress_percentage: float
    days_remaining: int
    amount_remaining: float
    monthly_savings_needed: float
    is_on_track: bool
    milestones: List[str]
    savings_tips: List[str]
    alert: Optional[AlertResponse]= None

class ContributionResponse(BaseModel):
    message: str
    new_balance: float
    progress: float
    completed: bool
    milestone: Optional[str] = None
    excess_alert: Optional[AlertResponse] = None 

#Dashboard
class BudgetReport(BaseModel):
    category: str
    limit: float
    spent: float
    status: str

class GoalReport(BaseModel):
    name: str
    target: float
    current: float
    progress: float

class DashboardResponse(BaseModel):
    total_budget: float
    total_expense: float
    total_savings: float
    budgets: List[BudgetReport]
    goals: List[GoalReport]

#TAX & NOTIFICATION SCHEMAS
class TaxCalculationRequest(BaseModel):
    FinancialYear: str
    TotalIncome: Decimal
    Regime: str = "old"
    Section80C: Optional[Decimal] = 0
    Section80D: Optional[Decimal] = 0
    HRA: Optional[Decimal] = 0

class TaxCalculationResponse(BaseModel):
    TaxCalculationID: int
    FinancialYear: str
    TotalIncome: Decimal
    TaxableIncome: Decimal
    TaxLiability: Optional[Decimal] = None
    CalculationDate: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationResponse(BaseModel):
    NotificationID: int
    Title: str
    Message: str
    NotificationType: str
    IsRead: bool
    CreatedDate: datetime

    model_config = ConfigDict(from_attributes=True)

class SmartEntryParseRequest(BaseModel):
    text: str

class SmartEntryPayload(BaseModel):
    amount: float
    category: str
    note: str | None = None

class SmartEntryResponse(BaseModel):
    status: str
    data: dict

class RecommendationItem(BaseModel):
    name: str
    allocation: int
    returns: str
    risk: str


class RecommendationItem(BaseModel):
    name: str
    allocation: int
    returns: str
    risk: str

class InvestmentRecommendationRequest(BaseModel):
    investmentAmount:   float
    frequency:          str = "monthly"        # "monthly" | "onetime"
    investmentDuration: str                    # "<1" | "1-3" | "3-7" | "7+"  ← str, not int
    riskTolerance:      str                    # "low" | "medium" | "high"
    investmentGoal:     Optional[str] = "wealth"


class InvestmentPortfolioResponse(BaseModel):
    monthlyPlan: Dict[str, int]
    whereToInvest: Dict[str, str]
    surplus: int
    expectedReturns: str
    riskLevel: str
    aiInsights: List[str]

class RecommendationItem(BaseModel):
    name: str
    allocation: int
    returns: str
    risk: str
    amount: int   # ➕ added
    where: str    # ➕ added
