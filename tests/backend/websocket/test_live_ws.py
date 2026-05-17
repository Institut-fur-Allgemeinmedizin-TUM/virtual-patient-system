import pytest
from starlette.websockets import WebSocketDisconnect

from app.api.memory import vhb_sessions
from app.config.config import settings
from tests.backend.factories.models import create_case, create_session


def assert_disconnect_on_connect_or_receive(client, path: str):
    try:
        with client.websocket_connect(path) as websocket:
            with pytest.raises(WebSocketDisconnect):
                websocket.receive_text()
    except WebSocketDisconnect:
        pass


def test_live_ws_vhb_not_available(client, force_user, vhb_user):
    vhb_sessions["vhb-live-1"] = {"case_id": "bauchschmerzen", "messages": []}
    force_user(vhb_user)

    assert_disconnect_on_connect_or_receive(client, "/api/live/vhb-live-1/ws")


def test_live_ws_session_not_found(client, force_user, tum_user):
    force_user(tum_user)
    assert_disconnect_on_connect_or_receive(client, "/api/live/missing/ws")


def test_live_ws_missing_gemini_key_returns_error(
    client, force_user, tum_user, db_session
):
    create_case(db_session)
    create_session(db_session, "live-s-1", user_id=tum_user["tum_id"])
    force_user(tum_user)
    settings.gemini_api_key = None

    with client.websocket_connect("/api/live/live-s-1/ws") as websocket:
        payload = websocket.receive_json()
        assert payload["error"] == "Gemini Live is not configured on backend"


def test_live_ws_no_time_remaining(client, force_user, tum_user, db_session):
    session = create_session(db_session, "live-s-2", user_id=tum_user["tum_id"])
    create_case(db_session)
    session.live_time_remaining = 0
    db_session.add(session)
    db_session.commit()
    force_user(tum_user)
    settings.gemini_api_key = "fake-key"

    with client.websocket_connect("/api/live/live-s-2/ws") as websocket:
        payload = websocket.receive_json()
        assert payload["error"] == "no live time remaining"


def test_live_ws_invalid_user_disconnects(client, force_user, tum_user, db_session):
    create_case(db_session)
    create_session(db_session, "live-s-3", user_id="other-user")
    force_user(tum_user)
    settings.gemini_api_key = "fake-key"

    assert_disconnect_on_connect_or_receive(client, "/api/live/live-s-3/ws")
