from fastapi import (
    Depends,
    HTTPException,
    Request,
    APIRouter,
)
from sqlalchemy.orm import Session as OrmSession
from sqlalchemy import func
from sqlalchemy.orm import aliased
from app.auth import auth
from app.db.db import get_db
from app.model.analytics import (
    GetSessionsHistoryRequest,
    GetSessionsHistoryResponse,
    SessionHistoryColumn,
    column_db_map,
)

from app.model.evaluation import EvaluationResponse
from app.model.models import (
    Evaluation,
    Message,
    Session,
)
from app.config.config import settings

analyticRouter = APIRouter()


@analyticRouter.get(
    "/api/analytics/sessions", response_model=GetSessionsHistoryResponse
)
async def get_sessions(
    req: GetSessionsHistoryRequest, request: Request, db: OrmSession = Depends(get_db)
) -> GetSessionsHistoryResponse:
    user = auth.require_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if user.get("is_vhb_user", False):
        raise HTTPException(status_code=403, detail="Forbidden")
    # TODO - implement better check
    if user.get("tum_id") != "12345678" and settings.require_auth:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not req.selected_columns():
        raise HTTPException(
            status_code=400, detail="At least one column must be selected"
        )
    if len(req.order_by) > 3:
        raise HTTPException(
            status_code=400, detail="Cannot order by more than 3 columns"
        )
    if req.selected_columns().count(SessionHistoryColumn.id) == 0:
        raise HTTPException(
            status_code=400, detail="id column must be selected for pagination to work"
        )

    selected_columns = [column_db_map[col] for col in req.selected_columns()]

    query = db.query(
        *selected_columns
    ).join(
        Evaluation,
        Evaluation.session_id == Session.id,
        isouter=(not req.only_evaluated),
    )

    if req.include_messages:
        # If messages are included, we need to join them and aggregate into a list

        MessageAlias = aliased(Message)
        query = (
            query.join(MessageAlias, MessageAlias.session_id == Session.id)
            .group_by(*selected_columns)
            .add_columns(
                func.json_agg(
                    func.json_build_object(
                        "role", MessageAlias.role, "content", MessageAlias.content
                    )
                ).label("messages")
            )
        )

    for order in req.order_by:
        col = column_db_map[order.column]
        asc = getattr(order.direction, "value", order.direction) == "asc"
        query = query.order_by(col.asc() if asc else col.desc())

    # Compute total (without limit/offset)
    total_q = db.query(func.count(Session.id)).join(
        Evaluation,
        Evaluation.session_id == Session.id,
        isouter=(not req.only_evaluated),
    )
    total = total_q.scalar() or 0

    results = query.offset(req.offset).limit(req.limit).all()

    # Normalize rows into dicts keyed by column name
    rows = []
    for row in results:
        try:
            row_vals = tuple(row)
        except TypeError:
            row_vals = (row,)

        values = {}
        for i, col_enum in enumerate(req.selected_columns()):
            # Use enum value (string) as key
            values[col_enum.value] = row_vals[i] if i < len(row_vals) else None

        if req.include_messages:
            values["messages"] = (
                row_vals[-1] if len(row_vals) > len(req.selected_columns()) else []
            )
        rows.append({"values": values})

    return GetSessionsHistoryResponse(
        columns=req.selected_columns(),
        rows=rows,
        total=total,
        limit=req.limit,
        offset=req.offset,
    )
