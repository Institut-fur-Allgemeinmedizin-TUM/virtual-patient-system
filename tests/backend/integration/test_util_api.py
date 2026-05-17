from io import BytesIO

from tests.backend.factories.models import create_case, create_message, create_session
from tests.backend.mocks.openai import FakeOpenAIClient


def test_transcribe_audio_success(client, monkeypatch):
    monkeypatch.setattr(
        "app.api.util.chat_functions.get_openai_client",
        lambda: FakeOpenAIClient(text="Hallo aus Test"),
    )
    response = client.post(
        "/api/transcribe",
        files={"audio": ("sample.webm", BytesIO(b"audio-bytes"), "audio/webm")},
    )
    assert response.status_code == 200
    assert response.json() == {"text": "Hallo aus Test"}


def test_transcribe_audio_failure(client, monkeypatch):
    monkeypatch.setattr(
        "app.api.util.chat_functions.get_openai_client",
        lambda: FakeOpenAIClient(error=RuntimeError("failed")),
    )
    response = client.post(
        "/api/transcribe",
        files={"audio": ("sample.webm", BytesIO(b"audio-bytes"), "audio/webm")},
    )
    assert response.status_code == 500


def test_get_cases_and_case_details(client):
    cases_response = client.get("/api/cases")
    assert cases_response.status_code == 200
    assert "cases" in cases_response.json()
    assert len(cases_response.json()["cases"]) >= 1

    case_id = cases_response.json()["cases"][0]["id"]
    detail_response = client.get(f"/api/cases/{case_id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == case_id


def test_export_and_analytics_summary(client, db_session):
    create_case(db_session, "bauchschmerzen")
    create_session(db_session, "s-export-1", "bauchschmerzen", "user-1")
    create_message(db_session, "s-export-1", "user", "Hallo", tokens_in=5)
    create_message(db_session, "s-export-1", "assistant", "Antwort", tokens_out=7)

    export_response = client.get("/api/export")
    assert export_response.status_code == 200
    export_data = export_response.json()
    assert export_data["total_sessions"] >= 1
    assert any(s["session_id"] == "s-export-1" for s in export_data["sessions"])

    analytics_response = client.get("/api/analytics/summary")
    assert analytics_response.status_code == 200
    analytics_data = analytics_response.json()
    assert "sessions_by_case" in analytics_data
    assert "total_messages" in analytics_data
