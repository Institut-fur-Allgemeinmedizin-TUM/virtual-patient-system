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

NUM_CRITERIA = 8


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

    user_best_window = func.row_number().over(
        partition_by=User.id,
        order_by=total_score_exp.desc()
    )

    subquery = (
        select(
            User.preferred_username,
            User.id.label("uid"),
            total_score_exp.label("total_score"),
            user_best_window.label("user_eval_rank"),
        )
        .join(Session, Session.user_id == User.oidc_id)
        .join(Evaluation, Evaluation.session_id == Session.id)
        .where(Session.case_id == case_id)
        .subquery()
    )

    leaderboard_stmt = (
        select(
            subquery.c.preferred_username,
            subquery.c.total_score,
            func.rank().over(order_by=subquery.c.total_score.desc()).label("rank")
        )
        .where(subquery.c.user_eval_rank == 1)
        .order_by(subquery.c.total_score.desc())
        .limit(10)
    )

    result = db.execute(leaderboard_stmt)
    rows = result.all()

    top_entries = []
    for row in rows:
        display_name = row.preferred_username or "Anon"
        calculated_average = round(float(row.total_score) / NUM_CRITERIA, 4)
        top_entries.append(
            LeaderboardEntry(
                rank=row.rank, username=display_name, average_points=calculated_average
            )
        )

    return LeaderboardResponse(case_id=case_id, top_entries=top_entries)
