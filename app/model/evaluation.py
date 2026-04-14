from datetime import datetime
from typing import List

from pydantic import BaseModel
from sqlalchemy import Text, ForeignKey, DateTime, func, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.model.models import Base, Session


class EvaluationCriterion(BaseModel):
    name: str
    score: int
    explanation: str


class EvaluationResponse(BaseModel):
    id: int
    session_id: str
    created_at: datetime
    criteria: List[EvaluationCriterion]
    improvement_suggestions: List[str]
