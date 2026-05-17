import httpx

from app.auth import oidc
from tests.backend.mocks.oidc import FakeAsyncClient, FakeTokenResponse


def test_auth_login_missing_config_returns_500(client, monkeypatch):
    from app.config.config import settings

    monkeypatch.setattr(settings, "oidc_auth_url", None)
    monkeypatch.setattr(settings, "oidc_client_id", None)
    monkeypatch.setattr(settings, "oidc_redirect_uri", None)

    response = client.get("/auth/login")
    assert response.status_code == 500


def test_auth_login_sets_state_cookie_and_redirects(client, fixed_oidc_settings):
    response = client.get("/auth/login", params={"redirect_to": "/dashboard"})
    assert response.status_code == 302
    assert response.headers["location"].startswith("https://oidc.example/authorize?")
    assert "oidc_state=" in response.headers.get("set-cookie", "")


def test_auth_callback_missing_code_or_state(client):
    response = client.get("/auth/callback")
    assert response.status_code == 400


def test_auth_callback_missing_cookie(client):
    response = client.get("/auth/callback", params={"code": "abc", "state": "123"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Missing state cookie"


def test_auth_callback_state_mismatch(client, fixed_oidc_settings):
    token = oidc.sign(
        {
            "state": "expected",
            "nonce": "nonce-x",
            "issued_at": 1,
            "redirect_to": "/",
        }
    )
    client.cookies.set("oidc_state", token)

    response = client.get("/auth/callback", params={"code": "abc", "state": "wrong"})
    assert response.status_code == 400
    assert response.json()["detail"] == "State mismatch"


def test_auth_callback_token_exchange_failure(client, fixed_oidc_settings, monkeypatch):
    state_token = oidc.sign(
        {"state": "ok", "nonce": "nonce-x", "issued_at": 1, "redirect_to": "/"}
    )
    client.cookies.set("oidc_state", state_token)

    fake_response = FakeTokenResponse(
        {}, should_raise=httpx.HTTPStatusError("bad", request=None, response=None)
    )
    monkeypatch.setattr(
        "app.api.auth.httpx.AsyncClient", lambda timeout=10.0: FakeAsyncClient(fake_response)
    )

    response = client.get("/auth/callback", params={"code": "abc", "state": "ok"})
    assert response.status_code == 500


def test_auth_callback_mobile_redirect_sets_token(
    client, fixed_oidc_settings, monkeypatch
):
    state_token = oidc.sign(
        {
            "state": "ok",
            "nonce": "nonce-x",
            "issued_at": 1,
            "redirect_to": "virtualpatient://auth-callback",
        }
    )
    client.cookies.set("oidc_state", state_token)

    fake_response = FakeTokenResponse({"id_token": "id-token", "access_token": "access"})
    monkeypatch.setattr(
        "app.api.auth.httpx.AsyncClient", lambda timeout=10.0: FakeAsyncClient(fake_response)
    )

    async def _fake_jwks():
        return {"keys": []}

    monkeypatch.setattr("app.api.auth.auth.fetch_jwks", _fake_jwks)
    monkeypatch.setattr(
        "app.api.auth.jwt.decode",
        lambda *args, **kwargs: {"nonce": "nonce-x", "sub": "u-1", "email": "u@mytum.de"},
    )

    response = client.get("/auth/callback", params={"code": "abc", "state": "ok"})

    assert response.status_code == 302
    assert response.headers["location"].startswith("virtualpatient://auth-callback?")
    assert "token=" in response.headers["location"]


def test_auth_callback_web_redirect_sets_session_cookie(
    client, fixed_oidc_settings, monkeypatch
):
    state_token = oidc.sign(
        {"state": "ok", "nonce": "nonce-x", "issued_at": 1, "redirect_to": "/home"}
    )
    client.cookies.set("oidc_state", state_token)

    fake_response = FakeTokenResponse({"id_token": "id-token", "access_token": "access"})
    monkeypatch.setattr(
        "app.api.auth.httpx.AsyncClient", lambda timeout=10.0: FakeAsyncClient(fake_response)
    )

    async def _fake_jwks():
        return {"keys": []}

    monkeypatch.setattr("app.api.auth.auth.fetch_jwks", _fake_jwks)
    monkeypatch.setattr(
        "app.api.auth.jwt.decode",
        lambda *args, **kwargs: {"nonce": "nonce-x", "sub": "u-1", "email": "u@mytum.de"},
    )

    response = client.get("/auth/callback", params={"code": "abc", "state": "ok"})
    assert response.status_code == 302
    assert response.headers["location"].endswith("/home")
    assert "session=" in response.headers.get("set-cookie", "")


def test_auth_me_authenticated(client, monkeypatch):
    monkeypatch.setattr(
        "app.api.auth.auth.get_current_user",
        lambda _request: {
            "sub": "u-1",
            "tum_id": "u-1",
            "email": "user@mytum.de",
            "name": "User",
        },
    )
    response = client.get("/auth/me")
    assert response.status_code == 200
    assert response.json()["tum_id"] == "u-1"


def test_auth_me_unauthenticated(client, monkeypatch):
    monkeypatch.setattr("app.api.auth.auth.get_current_user", lambda _request: None)
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_auth_logout_clears_cookie(client):
    response = client.post("/auth/logout")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_vhb_login_config_missing(client, monkeypatch):
    from app.config.config import settings

    monkeypatch.setattr(settings, "vhb_password", None)
    response = client.post("/auth/vhb-login", json={"password": "x"})
    assert response.status_code == 503


def test_vhb_login_invalid_password(client, monkeypatch):
    from app.config.config import settings

    monkeypatch.setattr(settings, "vhb_password", "correct")
    response = client.post("/auth/vhb-login", json={"password": "wrong"})
    assert response.status_code == 401


def test_vhb_login_success(client, monkeypatch):
    from app.config.config import settings

    monkeypatch.setattr(settings, "vhb_password", "correct")
    response = client.post("/auth/vhb-login", json={"password": "correct"})
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert isinstance(data["token"], str)
