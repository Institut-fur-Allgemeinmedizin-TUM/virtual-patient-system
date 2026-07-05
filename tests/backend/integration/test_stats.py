import pytest

from app.model.models import User

# FOLLOWING TESTS ARE AI GENERATED!!!

def test_get_leaderboard_filters_by_case_public(client, db_session, tum_user):
    """Verify that cross-contamination between different medical case scores does not occur."""
    from tests.backend.factories.models import create_case, create_session, create_evaluation

    target_case = "bauchschmerzen"
    other_case = "brustschmerzen"

    create_case(db_session, target_case)
    create_case(db_session, other_case)

    # Target case player session
    create_session(db_session, "session_target", case_id=target_case, user_id=tum_user["tum_id"])
    create_evaluation(db_session, "session_target", score=2)

    # Out-of-scope case player session with higher score
    create_session(db_session, "session_other", case_id=other_case, user_id="someone-else")
    create_evaluation(db_session, "session_other", score=5)

    db_session.commit()

    response = client.get(f"/api/stats/leaderboard/{target_case}")
    assert response.status_code == 200
    assert response.json().get("case_id") == target_case


def test_get_leaderboard_limits_to_top_ten_public(client, db_session):
    """Ensure the public leaderboard strictly caps returns at the top 10 items."""
    from tests.backend.factories.models import create_case, create_session, create_evaluation

    case_id = "crowded-case"
    create_case(db_session, case_id)

    # Generate 12 items to test slice boundary limits
    for i in range(12):
        session_id = f"session_{i}"
        user_id = f"bulk_user_{i}"

        # Instantiate backplane records safely on the fly
        u = User(oidc_id=user_id, preferred_username=f"Student_{i}")
        db_session.add(u)
        db_session.flush()

        create_session(db_session, session_id, case_id=case_id, user_id=user_id)
        create_evaluation(db_session, session_id, score=(1 + (i % 5)))

    db_session.commit()

    response = client.get(f"/api/stats/leaderboard/{case_id}")
    assert response.status_code == 200

    data = response.json()
    assert len(data["top_entries"]) == 10


def test_get_leaderboard_fallback_username_public(client, db_session):
    """Validate string conversion fallbacks for users missing a configured preferred_username."""
    from tests.backend.factories.models import create_case, create_session, create_evaluation

    case_id = "fallback-case"
    create_case(db_session, case_id)

    raw_oidc_str = "shibboleth|tum|id_999"
    u = User(oidc_id=raw_oidc_str, preferred_username="")
    db_session.add(u)
    db_session.flush()

    create_session(db_session, "anonymous_session", case_id=case_id, user_id=raw_oidc_str)
    create_evaluation(db_session, "anonymous_session", score=4)
    db_session.commit()

    response = client.get(f"/api/stats/leaderboard/{case_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["top_entries"][0]["username"] == "Anon"