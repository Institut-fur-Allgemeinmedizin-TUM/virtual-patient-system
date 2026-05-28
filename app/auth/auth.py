import time
from typing import Optional

import httpx
from fastapi import HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from starlette.websockets import WebSocket, WebSocketDisconnect

from app.auth import oidc
from app.config.config import settings
from app.db.db import SessionLocal
from app.model.models import User, Role, DefaultRoles


def sync_user_to_db(claims: dict) -> None:
    """Ensure user exists in the database and has default roles."""
    tum_id = oidc.extract_tum_id_from_claims(claims)
    oidc_id = tum_id or claims.get("sub")
    if not oidc_id:
        return

    with SessionLocal() as db:
        user = db.query(User).filter(User.oidc_id == oidc_id).first()
        if not user:
            # Create new user
            user = User(oidc_id=oidc_id)
            db.add(user)

            # Assign default role if it exists
            default_role = db.query(Role).filter(Role.name == DefaultRoles.default).first()
            if default_role:
                user.roles.append(default_role)

            # Assign TUMUser role if it's a TUM user
            if tum_id:
                tum_role = db.query(Role).filter(Role.name == DefaultRoles.tum_user).first()
                if tum_role:
                    user.roles.append(tum_role)

            db.commit()


async def fetch_jwks() -> dict:
    if not settings.oidc_jwks_url:
        raise HTTPException(status_code=500, detail="OIDC_JWKS_URL not configured")
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(settings.oidc_jwks_url)
        res.raise_for_status()
        return res.json()


# TODO combine with create_mobile_session_token
def set_session(response: RedirectResponse, claims: dict) -> None:
    """Store user claims in session cookie. Extracts TUM ID at auth time."""
    # Extract TUM ID when we have all the claims
    tum_id = oidc.extract_tum_id_from_claims(claims)

    session_claims = {
        "sub": claims.get("sub"),
        "iat": int(time.time()),
        "exp": int(time.time()) + 60 * 60 * 24,  # 24h
    }

    # Only add tum_id if we found one (don't add None)
    if tum_id:
        session_claims["tum_id"] = tum_id

    token = oidc.sign(session_claims)
    oidc.set_cookie(response, "session", token, max_age=60 * 60 * 24)


def create_mobile_session_token(claims: dict) -> str:
    """Create a session token for mobile clients. Extracts TUM ID at auth time."""
    # Extract TUM ID when we have all the claims
    tum_id = oidc.extract_tum_id_from_claims(claims)

    session_claims = {
        "sub": claims.get("sub"),
        "iat": int(time.time()),
        "exp": int(time.time()) + 60 * 60 * 24,  # 24h
    }

    # Only add tum_id if we found one (don't add None)
    if tum_id:
        session_claims["tum_id"] = tum_id

    return oidc.sign(session_claims)


class AuthenticatedUser(dict):
    """A dictionary-like object representing the current user session with convenience methods for role checking."""

    def is_admin(self) -> bool:
        return DefaultRoles.admin.value in self.get("roles", [])

    def is_tumuser(self) -> bool:
        return DefaultRoles.tum_user.value in self.get("roles", [])


def find_user_roles(oidc_id: Optional[str]) -> list[str]:
    """Find all roles assigned to a user by their OIDC ID."""
    if not oidc_id:
        return []

    with SessionLocal() as db:
        user = db.query(User).filter(User.oidc_id == oidc_id).first()
        if not user:
            return []
        return [role.name for role in user.roles]

def get_current_user_by_token(token: Optional[str]) -> Optional[dict]:
    if not token:
        return None
    try:
        user_dict = oidc.verify(token)
        # Determine user roles from the database
        oidc_id = user_dict.get("tum_id") or user_dict.get("sub")
        user_dict["roles"] = find_user_roles(oidc_id)
        return AuthenticatedUser(user_dict)
    except HTTPException:
        return None

def get_current_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("session")
    return get_current_user_by_token(token)


def get_current_user_websocket(websocket: WebSocket) -> Optional[AuthenticatedUser]:
    token = websocket.cookies.get("session")
    return get_current_user_by_token(token)


def require_user(request: Request) -> AuthenticatedUser:
    if not settings.require_auth:
        # auth disabled; provide anonymous user
        return AuthenticatedUser(
            {"sub": "anon", "name": "Anonymous", "roles": [DefaultRoles.default]}
        )
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_user_websocket(websocket: WebSocket) -> AuthenticatedUser:
    if not settings.require_auth:
        return AuthenticatedUser(
            {"sub": "anon", "name": "Anonymous", "roles": [DefaultRoles.default]}
        )
    user = get_current_user_websocket(websocket)
    if not user:
        raise WebSocketDisconnect(reason="Not authenticated")
    return user
