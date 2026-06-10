from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database_models import Category

# Default categories jo har naye user ko milni chahiye
DEFAULT_EXPENSE_CATEGORIES = [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Health",
]

def seed_default_categories(db: Session, user_id: int):
    for name in DEFAULT_EXPENSE_CATEGORIES:
        category = Category(
            CategoryName=name,
            CategoryType="Expense",
            UserID=user_id
        )
        db.add(category)

    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise
def get_or_create_category(
    db: Session,
    *,
    category_name: str,
    category_type: str = "Expense",
    user_id: int
) -> int:
    """
    Ye function check karta hai ki user ke paas wo category hai ya nahi.
    Agar nahi hai (jaise user ne 'Other' select karke naya naam likha), toh ye use create kar deta hai.
    """
    # Clean input: ' food ' -> 'Food'
    category_name = category_name.strip().title()

    # 1. Check existing category for this user
    category = (
        db.query(Category)
        .filter(
            Category.UserID == user_id,
            Category.CategoryName == category_name,
            Category.CategoryType == category_type
        )
        .first()
    )

    if category:
        return category.CategoryID

    # 2. Create new category if not found (Dynamic Creation)
    new_category = Category(
        CategoryName=category_name,
        CategoryType=category_type,
        UserID=user_id
    )
    
    db.add(new_category)
    
    try:
        db.commit()
        db.refresh(new_category)
        return new_category.CategoryID
    except IntegrityError:
        # Race condition handling: agar parallel requests mein category ban gayi ho
        db.rollback()
        category = (
            db.query(Category)
            .filter(
                Category.UserID == user_id,
                Category.CategoryName == category_name,
                Category.CategoryType == category_type
            )
            .first()
        )
        return category.CategoryID if category else 0