from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional
from jose import jwt, JWTError

from app.config.config import settings

# ---------------------
# OIDC Authentication
# ---------------------


class OIDCState(BaseModel):
    state: str
    nonce: str
    issued_at: int
    redirect_to: Optional[str] = None


def sign(data: dict) -> str:
    return jwt.encode(
        claims=data,
        key=settings.app_secret_key,
        algorithm="HS256",
        headers={"typ": "JWT"},
    )


def verify(token: str) -> dict:
    try:
        return jwt.decode(token, settings.app_secret_key, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid session")


def set_cookie(response, name: str, value: str, max_age: int = 3600) -> None:
    # In production (HTTPS), cookies must have secure=True
    # In development (HTTP), secure=False is needed
    is_production = settings.environment == "production" or settings.environment == "beta"

    response.set_cookie(
        key=name,
        value=value,
        max_age=max_age,
        httponly=True,
        secure=is_production,  # True in production (HTTPS), False in dev (HTTP)
        samesite="lax",
        path="/",
    )


def extract_tum_id_from_claims(claims: dict) -> Optional[str]:
    """Extract TUM ID from OIDC claims. Tries multiple methods."""
    # Method 1: Extract from email (e.g., ge38qap@mytum.de -> ge38qap)
    email = claims.get("email")
    if email and "@mytum.de" in email:
        tum_id_from_email = email.split("@")[0]
        if tum_id_from_email and len(tum_id_from_email) > 0:
            return tum_id_from_email

    # Method 2: Try common OIDC claim fields
    tum_id = (
        claims.get("preferred_username")
        or claims.get("login")
        or claims.get("tumid")
        or claims.get("username")
        or claims.get("user_id")
        or claims.get("tum_user_id")
    )
    if tum_id:
        return tum_id

    # Method 3: If email exists but not @mytum.de, extract username part
    if email and "@" in email:
        username_part = email.split("@")[0]
        # Only use if it looks like a TUM ID (starts with letter, 6-8 chars)
        if (
            len(username_part) >= 6
            and len(username_part) <= 8
            and username_part[0].isalpha()
        ):
            return username_part

    # Fallback: return None (will use sub as fallback later)
    return None
