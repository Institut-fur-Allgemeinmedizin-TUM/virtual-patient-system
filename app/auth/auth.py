import time
from typing import Optional

import httpx
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse, FileResponse
from starlette.websockets import WebSocket, WebSocketDisconnect

from app.auth import oidc
from app.config.config import settings


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
        "email": claims.get("email"),
        "name": claims.get("name"),
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
        "email": claims.get("email"),
        "name": claims.get("name"),
        "iat": int(time.time()),
        "exp": int(time.time()) + 60 * 60 * 24,  # 24h
    }

    # Only add tum_id if we found one (don't add None)
    if tum_id:
        session_claims["tum_id"] = tum_id

    return oidc.sign(session_claims)


def get_current_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("session")
    if not token:
        return None
    try:
        return oidc.verify(token)
    except HTTPException:
        return None


def get_current_user_websocket(websocket: WebSocket):
    token = websocket.cookies.get("session")
    if not token:
        return None
    try:
        return oidc.verify(token)
    except HTTPException:
        return None


def require_user(request: Request) -> dict:
    if not settings.require_auth:
        # auth disabled; provide anonymous user
        return {"sub": "anon", "name": "Anonymous"}
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_user_websocket(websocket: WebSocket):
    if not settings.require_auth:
        return {"sub": "anon", "name": "Anonymous"}
    user = get_current_user_websocket(websocket)
    if not user:
        raise WebSocketDisconnect(reason="Not authenticated")
    return user
