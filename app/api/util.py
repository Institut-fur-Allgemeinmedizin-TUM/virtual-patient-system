from datetime import datetime, timedelta
from typing import Optional

from fastapi import (
    Depends,
    HTTPException,
    Query,
    File,
    UploadFile,
    APIRouter,
)
from fastapi.responses import JSONResponse
from sqlalchemy import func, desc
from sqlalchemy.orm import Session as OrmSession

from app.db.db import get_db
from app.llm import chat as chat_functions
from app.model.cases import GetCasesResponse
from app.model.models import (
    Session as ChatSession,
    Message,
    ExportResponse,
    SessionSummary,
)

utilRouter = APIRouter()


# Analytics and Export endpoints
@utilRouter.get("/api/export", response_model=ExportResponse)
async def export_sessions(
    case_id: Optional[str] = Query(None, description="Filter by case ID"),
    days: int = Query(7, description="Number of days to look back"),
    db: OrmSession = Depends(get_db),
) -> ExportResponse:
    """Export session data for analytics and evaluation."""

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Build query
    query = db.query(ChatSession)
    if case_id:
        query = query.filter(ChatSession.case_id == case_id)
    query = query.filter(ChatSession.started_at >= start_date)

    sessions = query.order_by(desc(ChatSession.started_at)).all()

    # Build summaries with token counts
    session_summaries = []
    for session in sessions:
        # Get token totals for this session
        token_stats = (
            db.query(
                func.sum(Message.tokens_in).label("total_in"),
                func.sum(Message.tokens_out).label("total_out"),
                func.count(Message.id).label("msg_count"),
            )
            .filter(Message.session_id == session.id)
            .first()
        )

        session_summaries.append(
            SessionSummary(
                session_id=session.id,
                case_id=session.case_id,
                user_id=session.user_id,
                started_at=session.started_at,
                ended_at=session.ended_at,
                message_count=token_stats.msg_count or 0,
                total_tokens_in=token_stats.total_in,
                total_tokens_out=token_stats.total_out,
            )
        )

    return ExportResponse(
        sessions=session_summaries,
        total_sessions=len(session_summaries),
        date_range=f"{start_date.date()} to {end_date.date()}",
    )


@utilRouter.get("/api/cases/{case_id}")
async def get_case_details(case_id: str) -> JSONResponse:
    """Get case details including patient persona information."""
    try:
        case_data = chat_functions.load_case_data(case_id)
        persona = case_data.get("persona", {})

        return JSONResponse(
            content={
                "id": case_data.get("id", case_id),
                "title": case_data.get("title", ""),
                "language": case_data.get("language", "de"),
                "patient_name": persona.get("name", ""),
                "patient_age": persona.get("age", ""),
                "patient_occupation": persona.get("occupation", ""),
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load case: {str(e)}")


@utilRouter.get("/api/cases", response_model=GetCasesResponse)
async def get_cases() -> GetCasesResponse:
    """Get case details including patient persona information."""
    try:
        cases_data = chat_functions.load_all_cases()
        cases_list = []
        for case_id, case_data in cases_data.items():
            persona = case_data.get("persona", {})
            casesJson = {
                "id": case_data.get("id", case_id),
                "title": case_data.get("title", ""),
                "language": case_data.get("language", "de"),
                "patient_name": persona.get("name", ""),
                "patient_age": persona.get("age", ""),
                "patient_occupation": persona.get("occupation", ""),
            }
            cases_list.append(casesJson)
        return GetCasesResponse(cases=cases_list)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load case: {str(e)}")


@utilRouter.get("/api/analytics/summary")
async def get_analytics_summary(
    days: int = Query(7, description="Number of days to look back"),
    db: OrmSession = Depends(get_db),
) -> JSONResponse:
    """Get basic analytics summary."""

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Session counts by case
    case_stats = (
        db.query(ChatSession.case_id, func.count(ChatSession.id).label("session_count"))
        .filter(ChatSession.started_at >= start_date)
        .group_by(ChatSession.case_id)
        .all()
    )

    # Total token usage
    token_stats = (
        db.query(
            func.sum(Message.tokens_in).label("total_tokens_in"),
            func.sum(Message.tokens_out).label("total_tokens_out"),
            func.count(Message.id).label("total_messages"),
        )
        .join(ChatSession)
        .filter(ChatSession.started_at >= start_date)
        .first()
    )

    return JSONResponse(
        content={
            "date_range": f"{start_date.date()} to {end_date.date()}",
            "sessions_by_case": [
                {"case_id": case_id, "session_count": count}
                for case_id, count in case_stats
            ],
            "total_tokens_in": token_stats.total_tokens_in or 0,
            "total_tokens_out": token_stats.total_tokens_out or 0,
            "total_messages": token_stats.total_messages or 0,
            "total_sessions": sum(count for _, count in case_stats),
        }
    )
