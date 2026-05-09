from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL=os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the .env file")
engine=create_engine(
    DATABASE_URL,
    connect_args={
        "attrs_before":{
            1222:1
        }
    },
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)
SessionLocal =sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base=declarative_base()
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
