from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, CheckConstraint, UniqueConstraint, Numeric, DateTime,func,FetchedValue
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "Users"
    UserId = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Username = Column(String(50), nullable=False, unique=True, index=True)
    PasswordHash = Column(String(255), nullable=False)
    FirstName = Column(String(50), nullable=False)
    LastName = Column(String(50), nullable=False)
    DateOfBirth = Column(DateTime, server_default=func.now())
    CreatedDate = Column(DateTime, server_default=FetchedValue())
    LastLoginDate = Column(DateTime, nullable=True)
    IsActive = Column(Boolean, default=True, nullable=False)
    UserType = Column(String(30), nullable=False)
    SecurityQuestion = Column(String(200), nullable=False)
    SecurityAnswerHash = Column(String(255), nullable=False)
    MailId = Column(String(255), unique=True, nullable=False)

    user_profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    tax_calculations = relationship("TaxCalculation", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    investment_recommendations = relationship("InvestmentRecommendation", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    

    __table_args__ = (
        CheckConstraint("DateOfBirth < GETDATE()", name="CHK_Users_DateOfBirth"),
    )


class UserProfile(Base):
    __tablename__ = "UserProfiles"

    ProfileID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    UserID = Column(Integer, ForeignKey("Users.UserId", ondelete="CASCADE"), nullable=False, unique=True)
    MonthlyIncome = Column(Numeric(15, 2), nullable=True)
    Currency = Column(String(3), default="INR", nullable=False)
    UpdatedDate = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="user_profile", cascade="all, delete", passive_deletes=True)

    __table_args__ = (
        CheckConstraint("MonthlyIncome >= 0", name="CHK_UserProfile_Income"),
    )

class Category(Base):
    __tablename__ = "Categories"
    CategoryID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    CategoryName = Column(String(100))
    CategoryType = Column(String(20))
    ParentCategoryID = Column(Integer, ForeignKey("Categories.CategoryID"), nullable=True)
    UserID = Column(Integer, ForeignKey("Users.UserId", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="categories", cascade="all, delete", passive_deletes=True)
    budgets = relationship("Budget", back_populates="categories")
    expenses = relationship("Expense", back_populates="categories")

    __table_args__ = (
        CheckConstraint("CategoryType IN ('Expense', 'Income')", name="CHK_Categories_Type"),
        UniqueConstraint("UserID", "CategoryName", name="UQ_Categories_UserName"),
    )

class Expense(Base):
    __tablename__ = "Expenses"
    ExpenseID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    UserID = Column(Integer, ForeignKey("Users.UserId", ondelete="CASCADE"), nullable=False)
    CategoryID = Column(Integer, ForeignKey("Categories.CategoryID"), nullable=False)
    Amount = Column(Numeric(15, 2), nullable=False)
    Date = Column(DateTime, index=True, nullable=False)
    Description = Column(String(255), nullable=False)
    ReceiptImagePath = Column(String(500), nullable=True)
    CreatedDate = Column(DateTime, server_default=func.current_date(), nullable=False)

    user = relationship("User", back_populates="expenses", cascade="all, delete", passive_deletes=True)
    categories = relationship("Category", back_populates="expenses")

    __table_args__ = (
        CheckConstraint("Amount > 0", name="CHK_Expenses_Amount"),
    )


class Budget(Base):
    __tablename__ = "Budgets"
    BudgetID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    UserID = Column(Integer, ForeignKey("Users.UserId", ondelete="CASCADE"), nullable=False)
    CategoryID = Column(Integer, ForeignKey("Categories.CategoryID"), nullable=False)
    BudgetAmount = Column(Numeric(15, 2), nullable=False)
    BudgetPeriod = Column(String(20), nullable=False)
    StartDate = Column(DateTime, nullable=False)
    EndDate = Column(DateTime, nullable=False)
    IsActive = Column(Boolean, default=True, nullable=False)
    CreatedDate = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="budgets")
    categories = relationship("Category", back_populates="budgets")

    __table_args__ = (
        CheckConstraint("BudgetAmount > 0", name="CHK_Budget_Amount"),
        CheckConstraint("BudgetPeriod IN ('Monthly', 'Weekly', 'Custom')", name="CHK_Budget_Period"),
    )


class Goal(Base):
    __tablename__ = "Goals"
    GoalID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    UserID = Column(Integer, ForeignKey("Users.UserId", ondelete="CASCADE"), nullable=False)
    GoalName = Column(String(100), nullable=False)
    TargetAmount = Column(Numeric(15, 2), nullable=False)
    CurrentAmount = Column(Numeric(15, 2), nullable=True)
    TargetDate = Column(DateTime, nullable=False)
    Priority = Column(String(10), default="Medium")
    Description = Column(String(500), nullable=True)
    IsCompleted = Column(Boolean, default=False)
    CreatedDate = Column(DateTime, nullable=False,default=datetime.now())
    CompletedDate = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="goals", cascade="all, delete", passive_deletes=True)

    __table_args__ = (
        CheckConstraint("TargetAmount > 0", name="CHK_Goals_Amount"),
        CheckConstraint("Priority IN ('High', 'Medium', 'Low')", name="CHK_Goals_Priority"),
    )


class TaxCalculation(Base):
    __tablename__ = "TaxCalculations"
    TaxCalculationID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    UserID = Column(Integer, ForeignKey("Users.UserId", ondelete="CASCADE"), nullable=False)
    FinancialYear = Column(String(10), nullable=False)
    TotalIncome = Column(Numeric(15, 2), nullable=False)
    TaxableIncome = Column(Numeric(15, 2), nullable=False)
    TotalDeductions = Column(Numeric(15, 2), nullable=True)
    TaxLiability = Column(Numeric(15, 2), nullable=True)
    SuggestedSavings = Column(Numeric(15, 2), nullable=True)
    CalculationDate = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="tax_calculations", cascade="all, delete", passive_deletes=True)



class InvestmentRecommendation(Base):
    __tablename__ = "InvestmentRecommendations"
    RecommendationID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    UserID = Column(Integer, ForeignKey("Users.UserId", ondelete="CASCADE"), nullable=False)
    InvestmentType = Column(String(50), nullable=False)
    InvestmentName = Column(String(200), nullable=False)
    RecommendedAmount = Column(Numeric(15, 2), nullable=False)
    RiskLevel = Column(String(20), nullable=False)
    ExpectedReturn = Column(Numeric(15, 2), nullable=True)
    GeneratedDate = Column(DateTime, nullable=True)
    ExpiryDate = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="investment_recommendations", cascade="all, delete", passive_deletes=True)

    __table_args__ = (
        CheckConstraint("RiskLevel IN ('Low','Medium','High')", name='CHK_Investment_Risk'),
        CheckConstraint('RecommendedAmount > 0', name='CHK_Investment_Amount'),
        CheckConstraint('ExpectedReturn >= 0', name='CHK_Investment_Return'),
    )
