from tests.backend.factories.models import create_case, create_message, create_session


def test_create_session_contract(client, force_user, tum_user):
    force_user(tum_user)
    response = client.post("/api/sessions", json={"case_id": "bauchschmerzen"})
    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"session_id", "case_id"}
    assert isinstance(data["session_id"], str)
    assert isinstance(data["case_id"], str)


def test_error_contract_contains_detail(client, force_user, tum_user):
    force_user(tum_user)
    response = client.post("/api/chat", json={"session_id": "missing", "message": "hi"})
    assert response.status_code == 404
    error = response.json()
    assert "detail" in error
    assert isinstance(error["detail"], str)


def test_messages_contract(client, force_user, tum_user, db_session):
    create_case(db_session)
    create_session(db_session, "contract-msg-1", user_id=tum_user["tum_id"])
    create_message(db_session, "contract-msg-1", "system", "Case")
    create_message(db_session, "contract-msg-1", "user", "Hello")
    force_user(tum_user)

    response = client.get("/api/sessions/contract-msg-1/messages")
    assert response.status_code == 200
    data = response.json()
    assert {"session_id", "case_id", "started_at", "ended_at", "messages"} <= set(
        data.keys()
    )
    msg = data["messages"][0]
    assert {"id", "role", "content", "created_at", "tokens_in", "tokens_out"} <= set(
        msg.keys()
    )
