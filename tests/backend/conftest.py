import os
from collections.abc import Generator

os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.api import app
from app.api.memory import vhb_sessions
from app.auth import auth as auth_module
from app.config.config import settings
from app.db.db import get_db
from app.model.models import Base


@pytest.fixture(autouse=True)
def reset_global_state(monkeypatch: pytest.MonkeyPatch) -> Generator[None, None, None]:
    vhb_sessions.clear()
    monkeypatch.delenv("SIMULATE_AI", raising=False)
    monkeypatch.setattr(settings, "require_auth", False)
    monkeypatch.setattr(settings, "gemini_api_key", "test-gemini-key")
    yield
    vhb_sessions.clear()


@pytest.fixture
def db_engine(tmp_path):
    db_path = tmp_path / "backend-tests.db"
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
def session_local(db_engine):
    return sessionmaker(bind=db_engine, autoflush=False, autocommit=False, future=True)


@pytest.fixture
def db_session(session_local) -> Generator[Session, None, None]:
    db = session_local()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(session_local) -> Generator[TestClient, None, None]:
    def override_get_db():
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def tum_user():
    return {"sub": "ge38qap", "tum_id": "ge38qap", "name": "TUM User"}


@pytest.fixture
def other_tum_user():
    return {"sub": "ab12cde", "tum_id": "ab12cde", "name": "Other TUM User"}


@pytest.fixture
def vhb_user():
    return {
        "sub": "vhb-guest",
        "is_vhb_user": True,
        "name": "VHB User",
        "email": "vhb@external.de",
    }


@pytest.fixture
def force_user(monkeypatch: pytest.MonkeyPatch):
    def _force(user: dict):
        monkeypatch.setattr(auth_module, "require_user", lambda _request: user)
        monkeypatch.setattr(
            auth_module, "require_user_websocket", lambda _websocket: user
        )
        monkeypatch.setattr(auth_module, "get_current_user", lambda _request: user)
        monkeypatch.setattr(
            auth_module, "get_current_user_websocket", lambda _websocket: user
        )

    return _force


@pytest.fixture
def simulate_ai(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SIMULATE_AI", "true")


@pytest.fixture
def set_require_auth(monkeypatch: pytest.MonkeyPatch):
    def _set(value: bool):
        monkeypatch.setattr(settings, "require_auth", value)

    return _set


@pytest.fixture
def fixed_oidc_settings(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "oidc_auth_url", "https://oidc.example/authorize")
    monkeypatch.setattr(settings, "oidc_token_url", "https://oidc.example/token")
    monkeypatch.setattr(settings, "oidc_client_id", "client-id")
    monkeypatch.setattr(settings, "oidc_client_secret", "client-secret")
    monkeypatch.setattr(
        settings, "oidc_redirect_uri", "http://localhost:8000/auth/callback"
    )
    monkeypatch.setattr(settings, "oidc_issuer", "https://oidc.example")
    monkeypatch.setattr(settings, "frontend_url", "http://localhost:3000")
    monkeypatch.setattr(settings, "app_secret_key", "test-secret-key")


@pytest.fixture
def clear_test_artifacts():
    os.environ.pop("SIMULATE_AI", None)
