from datetime import datetime, timezone
from types import SimpleNamespace

from app.llm.formatting import format_evaluation_response


def test_format_evaluation_response_maps_all_criteria():
    evaluation = SimpleNamespace(
        id=1,
        session_id="s-1",
        created_at=datetime.now(timezone.utc),
        criterion1_score=1,
        criterion1_explanation="a",
        criterion2_score=2,
        criterion2_explanation="b",
        criterion3_score=3,
        criterion3_explanation="c",
        criterion4_score=4,
        criterion4_explanation="d",
        criterion5_score=5,
        criterion5_explanation="e",
        criterion6_score=4,
        criterion6_explanation="f",
        criterion7_score=3,
        criterion7_explanation="g",
        criterion8_score=2,
        criterion8_explanation="h",
        improvement_suggestions=["x", "y", "z"],
    )

    response = format_evaluation_response(evaluation)

    assert response.id == 1
    assert response.session_id == "s-1"
    assert len(response.criteria) == 8
    assert response.criteria[0].name == "Gesprächsführung"
    assert response.criteria[-1].name == "Qualität und Zeit"
    assert response.improvement_suggestions == ["x", "y", "z"]
