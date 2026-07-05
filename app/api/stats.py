from fastapi import (
    APIRouter,
    Request,
    Depends,
)

from sqlalchemy.orm import Session as OrmSession
from sqlalchemy import func, select


from app.db.db import get_db
from app.model.models import Evaluation, User, Session
from app.model.stats import LeaderboardEntry, LeaderboardResponse

statsRouter = APIRouter()


@statsRouter.get("/api/stats/leaderboard/{case_id}", response_model=LeaderboardResponse)
async def leaderboard(
    case_id: str,
    db: OrmSession = Depends(get_db),
):
    total_score_exp = (
        Evaluation.criterion1_score
        + Evaluation.criterion2_score
        + Evaluation.criterion3_score
        + Evaluation.criterion4_score
        + Evaluation.criterion5_score
        + Evaluation.criterion6_score
        + Evaluation.criterion7_score
        + Evaluation.criterion8_score
    )

    rank_window = func.rank().over(order_by=total_score_exp.desc())

    stmt = (
        select(
            User.preferred_username,
            User.id.label("uid"),
            total_score_exp.label("total_score"),
            rank_window.label("rank"),
        )
        .join(Session, Session.user_id == User.oidc_id)
        .join(Evaluation, Evaluation.session_id == Session.id)
        .where(Session.case_id == case_id)
        .subquery()
    )

    leaderboard_stmt = (
        select(stmt.c.preferred_username, stmt.c.total_score, stmt.c.rank)
        .where(stmt.c.rank <= 10)
        .order_by(stmt.c.rank.asc())
        .limit(10)
    )

    result = db.execute(leaderboard_stmt)
    rows = result.all()

    top_entries = []
    for row in rows:
        display_name = row.preferred_username or "Anon"
        top_entries.append(
            LeaderboardEntry(
                rank=row.rank, username=display_name, total_score=row.total_score
            )
        )

    return LeaderboardResponse(case_id=case_id, top_entries=top_entries)
