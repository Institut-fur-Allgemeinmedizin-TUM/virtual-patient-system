import time
import uuid
from datetime import time
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import (
    HTTPException,
    Request,
    Response,
)
from fastapi.responses import JSONResponse, RedirectResponse
from jose import jwt, JWTError

from app.api.api import app
from app.auth import oidc, auth
from app.config.config import settings
from app.model.auth import VHBLoginRequest, VHBLoginResponse


@app.get("/auth/login")
async def auth_login(
    request: Request, redirect_to: Optional[str] = None
) -> RedirectResponse:
    if not all(
        [
            settings.oidc_auth_url,
            settings.oidc_client_id,
            settings.oidc_redirect_uri,
        ]
    ):
        raise HTTPException(status_code=500, detail="OIDC not configured")

    state = uuid.uuid4().hex
    nonce = uuid.uuid4().hex
    state_token = oidc.sign(
        {
            "state": state,
            "nonce": nonce,
            "issued_at": int(time.time()),
            "redirect_to": redirect_to or "/",
        }
    )

    params = {
        "response_type": "code",
        "client_id": settings.oidc_client_id,
        "redirect_uri": settings.oidc_redirect_uri,
        "scope": "openid",
        "state": state,
        "nonce": nonce,
    }

    # Build authorize URL
    authorize_url = f"{settings.oidc_auth_url}?{urlencode(params)}"
    response = RedirectResponse(authorize_url, status_code=302)

    # Check if the request is coming from localhost (e.g., your adb reverse setup)
    is_localhost = request.url.hostname in ["localhost", "127.0.0.1"]

    # Explicitly set the cookie with the correct flags for mobile browsers
    response.set_cookie(
        key="oidc_state",
        value=state_token,
        max_age=600,
        httponly=True,
        samesite="lax",  # MUST be 'lax' to survive the redirect back from TUM
        secure=not is_localhost,  # False for local HTTP, True for production HTTPS
    )

    return response


@app.get("/auth/callback")
async def auth_callback(
    request: Request, code: Optional[str] = None, state: Optional[str] = None
) -> RedirectResponse:
    if code is None or state is None:
        raise HTTPException(status_code=400, detail="Missing code/state")
    state_token = request.cookies.get("oidc_state")
    if not state_token:
        raise HTTPException(status_code=400, detail="Missing state cookie")
    st = oidc.verify(state_token)
    if st.get("state") != state:
        raise HTTPException(status_code=400, detail="State mismatch")

    # Exchange code for tokens
    if not all(
        [
            settings.oidc_token_url,
            settings.oidc_client_id,
            settings.oidc_client_secret,
            settings.oidc_redirect_uri,
        ]
    ):
        raise HTTPException(status_code=500, detail="OIDC not configured")

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.oidc_redirect_uri,
        "client_id": settings.oidc_client_id,
        "client_secret": settings.oidc_client_secret,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_res = await client.post(settings.oidc_token_url, data=data)
        token_res.raise_for_status()
        token_payload = token_res.json()

    id_token = token_payload.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="Missing id_token")

    access_token = token_payload.get("access_token")

    # Verify id_token using JWKS
    jwks = await auth.fetch_jwks()
    try:
        claims = jwt.decode(
            id_token,
            jwks,
            algorithms=["RS256"],
            audience=settings.oidc_client_id,
            issuer=settings.oidc_issuer,
            access_token=access_token,
        )
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid id_token: {str(e)}")

    # Basic nonce check
    if claims.get("nonce") != st.get("nonce"):
        raise HTTPException(status_code=401, detail="Invalid nonce")

    # Redirect back to frontend after successful authentication
    frontend_path = st.get("redirect_to") or "/"
    # Check if the redirect URL is a mobile app deep link
    # (Checking for custom scheme, Expo's development scheme, and the actual mobile app scheme)
    is_mobile = (
        frontend_path.startswith("virtualpatient://")
        or frontend_path.startswith("myapp://")
        or frontend_path.startswith("exp://")
    )

    if is_mobile:
        mobile_session_token = auth.create_mobile_session_token(claims)

        # Safely append the token (checking if the URL already has query parameters)
        separator = "&" if "?" in frontend_path else "?"
        redirect_to = f"{frontend_path}{separator}token={mobile_session_token}"

        response = RedirectResponse(redirect_to, status_code=302)
    else:
        # Standard web flow handling
        redirect_to = (
            frontend_path
            if frontend_path.startswith("http")
            else f"{settings.frontend_url}{frontend_path}"
        )
        response = RedirectResponse(redirect_to, status_code=302)
        auth.set_session(response, claims)

    response.delete_cookie("oidc_state", path="/")
    return response


@app.get("/auth/me")
async def auth_me(request: Request) -> JSONResponse:
    """Get current user information."""
    user = auth.get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Use stored tum_id from session (extracted at auth time)
    # Fallback to sub if tum_id wasn't found during authentication
    tum_id = user.get("tum_id") or user.get("sub")

    return JSONResponse(
        content={
            "sub": user.get("sub"),
            "tum_id": tum_id,
            "email": user.get("email"),
            "name": user.get("name"),
        }
    )


@app.post("/auth/logout")
async def auth_logout() -> JSONResponse:
    response = JSONResponse(content={"ok": True})
    response.delete_cookie("session", path="/")
    return response


@app.post("/auth/vhb-login", response_model=VHBLoginResponse)
async def vhb_login(req: VHBLoginRequest, response: Response) -> VHBLoginResponse:
    """Authenticate VHB users with a shared password."""
    if not settings.vhb_password:
        raise HTTPException(status_code=503, detail="VHB login not configured")

    if req.password != settings.vhb_password:
        raise HTTPException(status_code=401, detail="Invalid password")

    # Create session token for VHB user
    session_claims = {
        "sub": "vhb-guest",
        "email": "vhb@external.de",
        "name": "VHB User",
        "is_vhb_user": True,  # Flag to identify VHB users
        "iat": int(time.time()),
        "exp": int(time.time()) + 60 * 60 * 24,  # 24h
    }
    token = oidc.sign(session_claims)

    oidc.set_cookie(response, "session", token, max_age=60 * 60 * 24)
    return VHBLoginResponse(ok=True, token=token)
