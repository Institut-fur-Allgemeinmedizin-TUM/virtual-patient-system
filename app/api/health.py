from fastapi import Depends, APIRouter
from sqlalchemy import func

from app.config.config import settings

from sqlalchemy.orm import Session as OrmSession

from app.db.db import get_db

healthRouter = APIRouter()

@healthRouter.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@healthRouter.get("/health/oidc")
async def health_oidc() -> dict:
    """Debug endpoint to check OIDC configuration (sanitized)."""
    return {
        "oidc_configured": all(
            [
                settings.oidc_auth_url,
                settings.oidc_client_id,
                settings.oidc_redirect_uri,
            ]
        ),
        "oidc_issuer": (
            settings.oidc_issuer[:20] + "..." if settings.oidc_issuer else None
        ),
        "oidc_client_id": (
            settings.oidc_client_id[:10] + "..." if settings.oidc_client_id else None
        ),
        "oidc_auth_url": (
            settings.oidc_auth_url[:30] + "..." if settings.oidc_auth_url else None
        ),
        "oidc_token_url": (
            settings.oidc_token_url[:30] + "..." if settings.oidc_token_url else None
        ),
        "oidc_jwks_url": (
            settings.oidc_jwks_url[:30] + "..." if settings.oidc_jwks_url else None
        ),
        "oidc_redirect_uri": (
            settings.oidc_redirect_uri if settings.oidc_redirect_uri else None
        ),
        "frontend_url": settings.frontend_url if settings.frontend_url else None,
        "environment": settings.environment,
    }


@healthRouter.get("/health/db")
async def health_db(db: OrmSession = Depends(get_db)) -> dict:
    """Check database connectivity."""
    try:
        # Simple query to test DB connection
        result = db.execute(func.now())
        timestamp = result.scalar()
        return {"status": "ok", "database": "connected", "timestamp": str(timestamp)}
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}