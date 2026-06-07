from app.api.memory import vhb_sessions
from tests.backend.factories.models import (
    create_case,
    create_evaluation,
    create_feedback,
    create_message,
    create_session,
)
from tests.backend.mocks.llm import fake_create_agent_with_text


def test_create_session_tum_persists_to_db(client, force_user, tum_user):
    force_user(tum_user)

    response = client.post("/api/sessions", json={"case_id": "bauchschmerzen"})
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == "bauchschmerzen"
    assert "session_id" in data


def test_create_session_vhb_stores_in_memory(client, force_user, vhb_user):
    force_user(vhb_user)

    response = client.post("/api/sessions", json={"case_id": "bauchschmerzen"})
    assert response.status_code == 200
    session_id = response.json()["session_id"]
    assert session_id in vhb_sessions
    assert vhb_sessions[session_id]["case_id"] == "bauchschmerzen"


def test_chat_vhb_simulated_response(client, force_user, vhb_user, simulate_ai):
    force_user(vhb_user)
    vhb_sessions["vhb-1"] = {
        "case_id": "bauchschmerzen",
        "messages": [{"role": "system", "content": "Case: bauchschmerzen"}],
    }

    response = client.post(
        "/api/chat", json={"session_id": "vhb-1", "message": "Hallo Patient"}
    )

    assert response.status_code == 200
    assert response.json()["reply"].startswith("Simulated response to:")


def test_chat_tum_not_found(client, force_user, tum_user):
    force_user(tum_user)
    response = client.post(
        "/api/chat", json={"session_id": "missing-session", "message": "Hi"}
    )
    assert response.status_code == 404


def test_chat_tum_wrong_user_forbidden(client, force_user, tum_user, db_session):
    create_case(db_session)
    create_session(db_session, "s-chat-1", user_id="different-user")
    force_user(tum_user)

    response = client.post(
        "/api/chat", json={"session_id": "s-chat-1", "message": "Hi"}
    )
    assert response.status_code == 403


def test_chat_tum_simulated_response_persists_turns(
    client, force_user, tum_user, db_session, simulate_ai
):
    create_case(db_session)
    create_session(db_session, "s-chat-2", user_id=tum_user["tum_id"])
    create_message(db_session, "s-chat-2", "system", "Case: bauchschmerzen")
    force_user(tum_user)

    response = client.post(
        "/api/chat", json={"session_id": "s-chat-2", "message": "Wie geht es Ihnen?"}
    )
    assert response.status_code == 200
    assert response.json()["reply"].startswith("Simulated response to:")


def test_get_session_messages_happy_path(client, force_user, tum_user, db_session):
    create_case(db_session)
    create_session(db_session, "s-msg-1", user_id=tum_user["tum_id"])
    create_message(db_session, "s-msg-1", "system", "Case")
    create_message(db_session, "s-msg-1", "user", "Frage")
    force_user(tum_user)

    response = client.get("/api/sessions/s-msg-1/messages")
    assert response.status_code == 200
    assert response.json()["session_id"] == "s-msg-1"
    assert len(response.json()["messages"]) >= 1


def test_get_session_messages_forbidden(client, force_user, other_tum_user, db_session):
    create_case(db_session)
    create_session(db_session, "s-msg-2", user_id="someone-else")
    force_user(other_tum_user)

    response = client.get("/api/sessions/s-msg-2/messages")
    assert response.status_code == 403


def test_evaluate_session_existing_evaluation_returns_cached(
    client, force_user, tum_user, db_session
):
    create_case(db_session)
    create_session(db_session, "s-eval-cached", user_id=tum_user["tum_id"])
    create_evaluation(db_session, "s-eval-cached", score=4)
    force_user(tum_user)

    response = client.post("/api/sessions/s-eval-cached/evaluate")
    assert response.status_code == 200
    assert response.json()["session_id"] == "s-eval-cached"
    assert len(response.json()["criteria"]) == 8


def test_evaluate_session_insufficient_messages(
    client, force_user, tum_user, db_session
):
    create_case(db_session)
    create_session(db_session, "s-eval-few", user_id=tum_user["tum_id"])
    create_message(db_session, "s-eval-few", "user", "Frage 1")
    create_message(db_session, "s-eval-few", "assistant", "Antwort 1")
    force_user(tum_user)

    response = client.post("/api/sessions/s-eval-few/evaluate")
    assert response.status_code == 400


def test_evaluate_session_markdown_json_parsing(
    client, force_user, tum_user, db_session, monkeypatch
):
    create_case(db_session)
    create_session(db_session, "s-eval-json", user_id=tum_user["tum_id"])
    for idx in range(5):
        create_message(db_session, "s-eval-json", "user", f"Frage {idx}")
        create_message(db_session, "s-eval-json", "assistant", f"Antwort {idx}")
    force_user(tum_user)

    markdown_json = """```json
{"criteria":[
{"name":"Gesprächsführung","score":4,"explanation":"A. B."},
{"name":"Erkennung relevanter Informationen","score":4,"explanation":"A. B."},
{"name":"Zielgerichtete Fragen","score":4,"explanation":"A. B."},
{"name":"Spezifische Ursachen","score":4,"explanation":"A. B."},
{"name":"Logische Reihenfolge","score":4,"explanation":"A. B."},
{"name":"Rückversicherung","score":4,"explanation":"A. B."},
{"name":"Zusammenfassung","score":4,"explanation":"A. B."},
{"name":"Qualität und Zeit","score":4,"explanation":"A. B."}
],"suggestions":["a","b","c"]}
```"""
    monkeypatch.setattr(
        "app.api.session.create_agent", fake_create_agent_with_text(markdown_json)
    )

    response = client.post("/api/sessions/s-eval-json/evaluate")
    assert response.status_code == 200
    assert len(response.json()["criteria"]) == 8


def test_evaluate_session_malformed_json_returns_500(
    client, force_user, tum_user, db_session, monkeypatch
):
    create_case(db_session)
    create_session(db_session, "s-eval-bad-json", user_id=tum_user["tum_id"])
    for idx in range(5):
        create_message(db_session, "s-eval-bad-json", "user", f"Frage {idx}")
        create_message(db_session, "s-eval-bad-json", "assistant", f"Antwort {idx}")
    force_user(tum_user)

    monkeypatch.setattr(
        "app.api.session.create_agent", fake_create_agent_with_text("not json")
    )
    response = client.post("/api/sessions/s-eval-bad-json/evaluate")
    assert response.status_code == 500


def test_sessions_summary_happy_path(client, force_user, tum_user, db_session):
    create_case(db_session, "husten")
    create_session(db_session, "s-sum-1", case_id="husten", user_id=tum_user["tum_id"])
    create_evaluation(db_session, "s-sum-1", score=5)
    force_user(tum_user)

    response = client.get("/api/sessions/summary")
    assert response.status_code == 200
    assert "sessions" in response.json()
    assert "husten" in response.json()["sessions"]


def test_sessions_summary_vhb_forbidden(client, force_user, vhb_user):
    force_user(vhb_user)
    response = client.get("/api/sessions/summary")
    assert response.status_code == 403


def test_get_feedback_happy_path_owner(client, force_user, tum_user, db_session):
    create_case(db_session)
    create_session(db_session, "s-fb-owner", user_id=tum_user["tum_id"])
    create_feedback(db_session, "s-fb-owner", score=5, comment="Great!")
    force_user(tum_user)

    response = client.get("/api/sessions/s-fb-owner/feedback")
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "s-fb-owner"
    assert data["feedback_score"] == 5
    assert data["feedback_comment"] == "Great!"


def test_get_feedback_happy_path_admin(client, force_user, admin_user, db_session):
    create_case(db_session)
    create_session(db_session, "s-fb-admin", user_id="other-user")
    create_feedback(db_session, "s-fb-admin", score=4, comment="Good")
    force_user(admin_user)

    response = client.get("/api/sessions/s-fb-admin/feedback")
    assert response.status_code == 200
    assert response.json()["feedback_score"] == 4


def test_get_feedback_not_found(client, force_user, tum_user, db_session):
    create_case(db_session)
    create_session(db_session, "s-fb-missing", user_id=tum_user["tum_id"])
    force_user(tum_user)

    response = client.get("/api/sessions/s-fb-missing/feedback")
    assert response.status_code == 404
