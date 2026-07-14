from app.api.memory import vhb_sessions
from app.model.models import Diagnostic, Session as ChatSession
from tests.backend.factories.models import create_case, create_session


def test_get_medical_background_available_list(client):
    """Test getting list of available diagnostics for a case"""
    response = client.get("/api/diagnostics/brustschmerzen/available")
    assert response.status_code == 200
    data = response.json()
    assert "diagnostics_available" in data
    assert len(data["diagnostics_available"]) > 0

    # Check that schnelltests is in the list
    diag_names = [d["name"] for d in data["diagnostics_available"]]
    assert "schnelltests" in diag_names

    # Each diagnostic should have display_name but not actual data
    for diag in data["diagnostics_available"]:
        assert "name" in diag
        assert "display_name" in diag
        assert diag["data"] is None


def test_get_medical_background_unknown_case_available(client):
    """Test requesting available diagnostics for unknown case returns 404"""
    response = client.get("/api/diagnostics/unknown-case/available")
    assert response.status_code == 404


def test_get_diagnostic_without_session_fails(client):
    """Test that requesting a diagnostic without session_id or diagnostic param fails"""
    response = client.get("/api/diagnostics/brustschmerzen?diagnostic=schnelltests")
    assert response.status_code == 403


def test_get_diagnostic_vhb_session(client):
    """Test getting a diagnostic for a VHB session"""
    # prepare a VHB session in memory
    vhb_sessions["vhb-1"] = {"case_id": "brustschmerzen", "messages": []}

    response = client.get(
        "/api/diagnostics/brustschmerzen?diagnostic=schnelltests&session_id=vhb-1"
    )
    assert response.status_code == 200
    data = response.json()

    # Should return DiagnosticGroup with schnelltests data
    assert data["name"] == "schnelltests"
    assert data["display_name"] == "Schnelltests"
    assert data["data"] is not None
    assert len(data["data"]) > 0

    # ensure the vhb session tracked the used diagnostic
    assert "used_diagnostics" in vhb_sessions["vhb-1"]
    assert "schnelltests" in vhb_sessions["vhb-1"]["used_diagnostics"]


def test_get_diagnostic_db_session_persists(client, force_user, tum_user, db_session):
    """Test that diagnostics are persisted to DB for TUM users"""
    # create corresponding case and session in DB
    create_case(db_session, "brustschmerzen")
    create_session(
        db_session, "s-mb-1", case_id="brustschmerzen", user_id=tum_user["tum_id"]
    )
    force_user(tum_user)

    response = client.get(
        "/api/diagnostics/brustschmerzen?diagnostic=schnelltests&session_id=s-mb-1"
    )
    assert response.status_code == 200
    data = response.json()

    # Should return DiagnosticGroup
    assert data["name"] == "schnelltests"
    assert data["display_name"] == "Schnelltests"
    assert data["data"] is not None

    # check that diagnostic was persisted to the DB and linked to the session
    diag = db_session.query(Diagnostic).filter_by(name="schnelltests").first()
    assert diag is not None
    session = db_session.query(ChatSession).where(ChatSession.id == "s-mb-1").first()
    assert any(d.name == "schnelltests" for d in session.used_diagnostics)


def test_get_diagnostic_db_forbidden_wrong_user(
    client, force_user, other_tum_user, db_session
):
    """Test that users cannot access other users' session diagnostics"""
    create_case(db_session, "brustschmerzen")
    create_session(
        db_session, "s-mb-2", case_id="brustschmerzen", user_id="someone-else"
    )
    force_user(other_tum_user)

    response = client.get(
        "/api/diagnostics/brustschmerzen?diagnostic=schnelltests&session_id=s-mb-2"
    )
    assert response.status_code == 403


def test_get_diagnostic_vhb_not_found_diagnostic(client):
    """Test requesting a diagnostic that doesn't exist"""
    vhb_sessions["vhb-2"] = {"case_id": "brustschmerzen", "messages": []}

    response = client.get(
        "/api/diagnostics/brustschmerzen?diagnostic=nonexistent&session_id=vhb-2"
    )
    assert response.status_code == 404


def test_get_diagnostic_unknown_case(client):
    """Test requesting a diagnostic for unknown case"""
    vhb_sessions["vhb-3"] = {"case_id": "unknown", "messages": []}

    response = client.get(
        "/api/diagnostics/unknown-case?diagnostic=schnelltests&session_id=vhb-3"
    )
    assert response.status_code == 404
