from datetime import datetime
from typing import List

from pydantic import BaseModel
from sqlalchemy import Text, ForeignKey, DateTime, func, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.model.models import Base, Session


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Criterion 1: Gesprächsführung
    criterion1_score: Mapped[int] = mapped_column(Integer, nullable=False)
    criterion1_explanation: Mapped[str] = mapped_column(Text, nullable=False)

    # Criterion 2: Erkennung relevanter Informationen
    criterion2_score: Mapped[int] = mapped_column(Integer, nullable=False)
    criterion2_explanation: Mapped[str] = mapped_column(Text, nullable=False)

    # Criterion 3: Zielgerichtete Fragen
    criterion3_score: Mapped[int] = mapped_column(Integer, nullable=False)
    criterion3_explanation: Mapped[str] = mapped_column(Text, nullable=False)

    # Criterion 4: Spezifische Ursachen
    criterion4_score: Mapped[int] = mapped_column(Integer, nullable=False)
    criterion4_explanation: Mapped[str] = mapped_column(Text, nullable=False)

    # Criterion 5: Logische Reihenfolge
    criterion5_score: Mapped[int] = mapped_column(Integer, nullable=False)
    criterion5_explanation: Mapped[str] = mapped_column(Text, nullable=False)

    # Criterion 6: Rückversicherung
    criterion6_score: Mapped[int] = mapped_column(Integer, nullable=False)
    criterion6_explanation: Mapped[str] = mapped_column(Text, nullable=False)

    # Criterion 7: Zusammenfassung
    criterion7_score: Mapped[int] = mapped_column(Integer, nullable=False)
    criterion7_explanation: Mapped[str] = mapped_column(Text, nullable=False)

    # Criterion 8: Qualität und Zeit
    criterion8_score: Mapped[int] = mapped_column(Integer, nullable=False)
    criterion8_explanation: Mapped[str] = mapped_column(Text, nullable=False)

    # Improvement suggestions stored as JSON array
    improvement_suggestions: Mapped[List[str]] = mapped_column(JSON, nullable=False)

    session: Mapped[Session] = relationship(back_populates="evaluation")

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