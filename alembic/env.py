import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool, engine_from_config
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
from app.model.models import Base  # type: ignore

target_metadata = Base.metadata

# Override sqlalchemy.url from env if present
db_url = os.getenv("DATABASE_URL")

# If not set, check if we're in production with Cloud SQL (Cloud Run)
if not db_url:
    environment = os.getenv("ENVIRONMENT", "development")
    if environment == "production" or environment == "beta":
        instance_connection_name = os.getenv("CLOUD_SQL_CONNECTION_NAME")
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASSWORD", "")
        db_name = os.getenv("DB_NAME", "virtual-patient-db")
        
        if instance_connection_name:
            # Cloud SQL Unix socket path (same as app/config.py)
            db_socket_dir = "/cloudsql"
            db_url = f"postgresql+psycopg://{db_user}:{db_password}@/{db_name}?host={db_socket_dir}/{instance_connection_name}"

# Fallback to config
if not db_url:
    db_url = config.get_main_option("sqlalchemy.url")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = db_url or config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    from sqlalchemy.ext.asyncio import create_async_engine
    
    # Use DATABASE_URL env var if present, otherwise use config
    connection_url = db_url or config.get_main_option("sqlalchemy.url")
    
    connectable = create_async_engine(
        connection_url,
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_sync_migrations() -> None:
    """Run migrations in synchronous mode (useful for Cloud SQL Proxy)."""
    from sqlalchemy import create_engine
    
    # Use DATABASE_URL env var if present, otherwise use config
    connection_url = db_url or config.get_main_option("sqlalchemy.url")
    
    # For synchronous connections, use psycopg2 format if possible
    # psycopg3 can work sync too but psycopg2 is more reliable with proxies
    if connection_url and "postgresql+psycopg://" in connection_url:
        # Keep psycopg3 but use sync mode
        pass
    
    connectable = create_engine(
        connection_url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


def run_migrations_online() -> None:
    # Check if we're using a sync connection (DATABASE_URL set via proxy for local migration)
    # or if explicitly requested
    use_sync = os.getenv("ALEMBIC_SYNC_MODE", "false").lower() == "true"
    
    # Only use sync mode if explicitly via localhost proxy (not in production)
    # In production (Cloud Run), DATABASE_URL won't be set and we'll use async mode
    if use_sync or (db_url and "localhost:" in db_url):
        # Use sync mode for Cloud SQL Proxy connections (local only)
        run_sync_migrations()
    else:
        # Use async mode for Cloud Run/production (Unix socket) and default connections
        asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
