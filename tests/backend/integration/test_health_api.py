from app.db.db import get_db


def test_health_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_oidc_not_configured(client, monkeypatch):
    from app.config.config import settings

    monkeypatch.setattr(settings, "oidc_auth_url", None)
    monkeypatch.setattr(settings, "oidc_client_id", None)
    monkeypatch.setattr(settings, "oidc_redirect_uri", None)

    response = client.get("/health/oidc")

    assert response.status_code == 200
    assert response.json()["oidc_configured"] is False


def test_health_db_error_branch(client):
    class BrokenDB:
        def execute(self, _):
            raise RuntimeError("db down")

        def close(self):
            return None

    def override_db():
        yield BrokenDB()

    client.app.dependency_overrides[get_db] = override_db
    response = client.get("/health/db")
    client.app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    assert response.json()["status"] == "error"
