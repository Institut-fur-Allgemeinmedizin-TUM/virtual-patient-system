from enum import Enum

from pydantic import BaseModel, Field
from typing import Any, Dict, List, Union

from app.model.models import Evaluation, Session


class SessionHistoryColumn(str, Enum):
    id = "id"
    case = "case"
    started_at = "started_at"
    ended_at = "ended_at"
    user_id = "user_id"
    criterion1_score = "criterion1_score"
    criterion1_explanation = "criterion1_explanation"
    criterion2_score = "criterion2_score"
    criterion2_explanation = "criterion2_explanation"
    criterion3_score = "criterion3_score"
    criterion3_explanation = "criterion3_explanation"
    criterion4_score = "criterion4_score"
    criterion4_explanation = "criterion4_explanation"
    criterion5_score = "criterion5_score"
    criterion5_explanation = "criterion5_explanation"
    criterion6_score = "criterion6_score"
    criterion6_explanation = "criterion6_explanation"
    criterion7_score = "criterion7_score"
    criterion7_explanation = "criterion7_explanation"
    criterion8_score = "criterion8_score"
    criterion8_explanation = "criterion8_explanation"
    improvement_suggestions = "improvement_suggestions"

class AggregationFunction(str, Enum):
    avg = "avg"
    sum = "sum"
    min = "min"
    max = "max"
    count = "count"

class SortDirection(str, Enum):
    asc = "asc"
    desc = "desc"

class AggregationParam(BaseModel):
    column: SessionHistoryColumn
    function: AggregationFunction = AggregationFunction.avg

    @property
    def alias(self) -> str:
        """Generates a dynamic column name, e.g., 'avg_criterion1_score'"""
        return f"{self.function.value}_{self.column.value}"

class SessionHistoryOrderBy(BaseModel):
    column: Union[SessionHistoryColumn, str]
    direction: SortDirection = SortDirection.asc


class SessionHistoryFilter(BaseModel):
    column: SessionHistoryColumn
    value: Any


column_db_map = {
    SessionHistoryColumn.id: Session.id,
    SessionHistoryColumn.case: Session.case_id,
    SessionHistoryColumn.started_at: Session.started_at,
    SessionHistoryColumn.ended_at: Session.ended_at,
    SessionHistoryColumn.user_id: Session.user_id,
    SessionHistoryColumn.criterion1_score: Evaluation.criterion1_score,
    SessionHistoryColumn.criterion2_score: Evaluation.criterion2_score,
    SessionHistoryColumn.criterion3_score: Evaluation.criterion3_score,
    SessionHistoryColumn.criterion4_score: Evaluation.criterion4_score,
    SessionHistoryColumn.criterion5_score: Evaluation.criterion5_score,
    SessionHistoryColumn.criterion6_score: Evaluation.criterion6_score,
    SessionHistoryColumn.criterion7_score: Evaluation.criterion7_score,
    SessionHistoryColumn.criterion8_score: Evaluation.criterion8_score,
    SessionHistoryColumn.criterion1_explanation: Evaluation.criterion1_explanation,
    SessionHistoryColumn.criterion2_explanation: Evaluation.criterion2_explanation,
    SessionHistoryColumn.criterion3_explanation: Evaluation.criterion3_explanation,
    SessionHistoryColumn.criterion4_explanation: Evaluation.criterion4_explanation,
    SessionHistoryColumn.criterion5_explanation: Evaluation.criterion5_explanation,
    SessionHistoryColumn.criterion6_explanation: Evaluation.criterion6_explanation,
    SessionHistoryColumn.criterion7_explanation: Evaluation.criterion7_explanation,
    SessionHistoryColumn.criterion8_explanation: Evaluation.criterion8_explanation,
    SessionHistoryColumn.improvement_suggestions: Evaluation.improvement_suggestions,
}


class GetSessionsHistoryRequest(BaseModel):
    only_evaluated: bool = False
    include_messages: bool = False
    include_columns: list[SessionHistoryColumn] | None = None
    filters: list[SessionHistoryFilter] | None = None
    order_by: list[SessionHistoryOrderBy] = Field(
        default_factory=lambda: [
            SessionHistoryOrderBy(
                column=SessionHistoryColumn.started_at,
                direction=SortDirection.desc,
            )
        ]
    )

    group_by: list[SessionHistoryColumn] | None = None
    aggregations: list[AggregationParam] | None = None

    limit: int = 100
    offset: int = 0

    def selected_columns(self) -> list[SessionHistoryColumn]:
        """Return the effective column order after applying inclusions."""

        if self.include_columns is None:
            return list(SessionHistoryColumn)
        return self.include_columns


class SessionHistoryRow(BaseModel):
    # Keys are column names (as strings) matching SessionHistoryColumn values.
    values: Dict[str, Any]


class GetSessionsHistoryResponse(BaseModel):
    columns: List[str]
    rows: List[SessionHistoryRow]
    total: int
    limit: int
    offset: int
