import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel
from sqlalchemy import (
    JSON,
    UUID,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class DefaultRoles(str, Enum):
    admin = "Admin"
    default = "Default"
    tum_user = "TUMUser"
    tester = "Tester"


SessionLiveDefaultTime = 600
UserMaxDailyUsage = 1800


class Base(DeclarativeBase):
    pass


# Association table for User and Role (Many-to-Many)
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    users: Mapped[List["User"]] = relationship(
        secondary=user_roles, back_populates="roles"
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    oidc_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, nullable=True
    )
    pronouns: Mapped[str] = mapped_column(
        String(50), nullable=False, default="not_specified"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    roles: Mapped[List[Role]] = relationship(
        secondary=user_roles, back_populates="users"
    )
    sessions: Mapped[List["Session"]] = relationship(back_populates="user")

    def is_admin(self) -> bool:
        return any(role.name == DefaultRoles.admin.value for role in self.roles)

    def is_tumuser(self) -> bool:
        return any(role.name == DefaultRoles.tum_user.value for role in self.roles)


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    language: Mapped[str] = mapped_column(String, nullable=False, default="de")


session_diagnostics = Table(
    "session_diagnostics",
    Base.metadata,
    Column(
        "session_id", ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True
    ),
    Column(
        "diagnostic_id",
        ForeignKey("diagnostics.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.oidc_id"), nullable=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=datetime.now().isoformat()
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    case: Mapped[Case] = relationship()
    user: Mapped[Optional[User]] = relationship(back_populates="sessions")
    messages: Mapped[List["Message"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )

    evaluation: Mapped[Optional["Evaluation"]] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )

    student_diagnosis: Mapped[Optional[str]] = mapped_column(
        String, nullable=True, server_default=None
    )

    used_diagnostics: Mapped[List["Diagnostic"]] = relationship(
        secondary="session_diagnostics", cascade="save-update, merge"
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


class Diagnostic(Base):
    __tablename__ = "diagnostics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)


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
    duration_minutes: Optional[float] = None
    live_time_used: Optional[int] = None
    user_word_count: Optional[int] = None


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
    duration_minutes: Optional[float] = None
    live_time_used: Optional[int] = None
    user_word_count: Optional[int] = None
    messages: List[SessionMessageItem]


class SessionSummaryData(BaseModel):
    sessionId: str
    score: float


class SessionsSummaryResponse(BaseModel):
    # Key: case_id -> Value: SessionSummaryData object
    sessions: dict[str, SessionSummaryData]
