from pydantic import BaseModel
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Text, ForeignKey, DateTime, func, Integer, JSON, Boolean
from typing import List, Optional
from datetime import datetime

SessionLiveDefaultTime = 600
UserMaxDailyUsage = 1800


class Base(DeclarativeBase):
    pass


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    language: Mapped[str] = mapped_column(String, nullable=False, default="de")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    case: Mapped[Case] = relationship()
    messages: Mapped[List["Message"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    evaluation: Mapped[Optional["Evaluation"]] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )

    live_api_handle: Mapped[str] = mapped_column(String, nullable=True)
    live_time_remaining: Mapped[int] = mapped_column(
        Integer, nullable=False, default=SessionLiveDefaultTime
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # user|assistant|system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    tokens_in: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tokens_out: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    audio_transcript: Mapped[Optional[bool]] = mapped_column(
        Boolean, default=False, nullable=False
    )

    session: Mapped[Session] = relationship(back_populates="messages")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("sessions.id"), nullable=False, unique=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

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


class SessionSummary(BaseModel):
    session_id: str
    case_id: str
    user_id: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]
    message_count: int
    total_tokens_in: Optional[int]
    total_tokens_out: Optional[int]


class ExportResponse(BaseModel):
    sessions: List[SessionSummary]
    total_sessions: int
    date_range: str


class SessionMessageItem(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    tokens_in: Optional[int]
    tokens_out: Optional[int]


class SessionMessagesResponse(BaseModel):
    session_id: str
    case_id: str
    started_at: datetime
    ended_at: Optional[datetime]
    messages: List[SessionMessageItem]
class SessionSummaryData(BaseModel):
    sessionId: str
    score: float
    
class SessionsSummaryResponse(BaseModel):
    # Key: case_id -> Value: SessionSummaryData object
    sessions: dict[str, SessionSummaryData]