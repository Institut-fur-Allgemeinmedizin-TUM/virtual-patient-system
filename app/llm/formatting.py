from app.model.evaluation import EvaluationResponse, EvaluationCriterion
from app.model.models import Evaluation


def format_evaluation_response(evaluation: Evaluation) -> EvaluationResponse:
    """Format an Evaluation model instance as an EvaluationResponse."""
    criteria = [
        EvaluationCriterion(
            name="Gesprächsführung",
            score=evaluation.criterion1_score,
            explanation=evaluation.criterion1_explanation
        ),
        EvaluationCriterion(
            name="Erkennung relevanter Informationen",
            score=evaluation.criterion2_score,
            explanation=evaluation.criterion2_explanation
        ),
        EvaluationCriterion(
            name="Zielgerichtete Fragen",
            score=evaluation.criterion3_score,
            explanation=evaluation.criterion3_explanation
        ),
        EvaluationCriterion(
            name="Spezifische Ursachen",
            score=evaluation.criterion4_score,
            explanation=evaluation.criterion4_explanation
        ),
        EvaluationCriterion(
            name="Logische Reihenfolge",
            score=evaluation.criterion5_score,
            explanation=evaluation.criterion5_explanation
        ),
        EvaluationCriterion(
            name="Rückversicherung",
            score=evaluation.criterion6_score,
            explanation=evaluation.criterion6_explanation
        ),
        EvaluationCriterion(
            name="Zusammenfassung",
            score=evaluation.criterion7_score,
            explanation=evaluation.criterion7_explanation
        ),
        EvaluationCriterion(
            name="Qualität und Zeit",
            score=evaluation.criterion8_score,
            explanation=evaluation.criterion8_explanation
        ),
    ]

    return EvaluationResponse(
        id=evaluation.id,
        session_id=evaluation.session_id,
        created_at=evaluation.created_at,
        criteria=criteria,
        improvement_suggestions=evaluation.improvement_suggestions
    )