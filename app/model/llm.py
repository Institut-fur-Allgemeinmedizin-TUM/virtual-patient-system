from pydantic import BaseModel
from app.model.models import FeedBackMarkerType


class CreateSessionRequest(BaseModel):
    case_id: str


class CreateSessionResponse(BaseModel):
    session_id: str
    case_id: str


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class UserSessionFeedBack(BaseModel):
    session_id: str
    feedback_score: int
    feedback_comment: str
    marker: FeedBackMarkerType | None = None


class PaginatedFeedbacksResponse(BaseModel):
    feedbacks: list[UserSessionFeedBack]
    total: int

class UpdateFeedbackMarkerRequest(BaseModel):
    marker: FeedBackMarkerType