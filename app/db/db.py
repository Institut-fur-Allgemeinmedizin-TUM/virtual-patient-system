from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config.config import settings

# Handle SQLite-specific configuration for testing
connect_args = {}
if settings.database_url.startswith("sqlite://"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
