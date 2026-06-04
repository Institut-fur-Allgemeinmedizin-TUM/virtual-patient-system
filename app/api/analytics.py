from fastapi import (
    Depends,
    HTTPException,
    Request,
    APIRouter,
    Response,
)
import csv
import io
import json
from typing import Union
from sqlalchemy.orm import Session as OrmSession
from sqlalchemy import func, String, cast
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

analyticsRouter = APIRouter()


@analyticsRouter.post(
    "/api/analytics/sessions/stats",
    response_model=GetSessionsHistoryResponse
)
async def get_sessions_stats(
    req: GetSessionsHistoryRequest,
    request: Request,
    as_csv: bool = False,
    db: OrmSession = Depends(get_db)
) -> Union[GetSessionsHistoryResponse, Response]:
    user = auth.require_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if user.get("is_vhb_user", False):
        raise HTTPException(status_code=403, detail="Forbidden")
    if not user.is_admin():
        raise HTTPException(status_code=403, detail="Forbidden")

    rows, total, output_keys = _fetch_sessions_stats_data(req, db)

    if as_csv:
        return _format_sessions_stats_csv(rows, output_keys, req.include_messages)

    return _format_sessions_stats_json(rows, total, req)


def _fetch_sessions_stats_data(
    req: GetSessionsHistoryRequest,
    db: OrmSession
) -> tuple[list[dict], int, list[str]]:
    if not req.selected_columns() and not req.aggregations:
        raise HTTPException(
            status_code=400, detail="At least one column must be selected"
        )
    if len(req.order_by) > 3:
        raise HTTPException(
            status_code=400, detail="Cannot order by more than 3 columns"
        )
    if not req.aggregations and req.selected_columns().count(SessionHistoryColumn.id) == 0:
        raise HTTPException(
            status_code=400, detail="id column must be selected for pagination to work"
        )

    # Base (non-aggregated) columns mapped from enums
    base_columns = [column_db_map[col] for col in req.selected_columns()]

    # Build full list of selected columns including aggregations
    selected_columns = list(base_columns)
    for agg in (req.aggregations or []):
        if agg.function == "avg":
            selected_columns.append(
                func.avg(column_db_map[agg.column]).label(agg.alias)
            )
        elif agg.function == "min":
            selected_columns.append(
                func.min(column_db_map[agg.column]).label(agg.alias)
            )
        elif agg.function == "max":
            selected_columns.append(
                func.max(column_db_map[agg.column]).label(agg.alias)
            )
        elif agg.function == "count":
            selected_columns.append(
                func.count(column_db_map[agg.column]).label(agg.alias)
            )
        else:
            raise HTTPException(
                status_code=400, detail=f"Unsupported aggregation function: {agg.function}"
            )

    # Output keys in the same order as the selected_columns used in the query.
    output_keys = [col.value for col in req.selected_columns()] + [
        agg.alias for agg in (req.aggregations or [])
    ]

    query = db.query(
        *selected_columns
    ).select_from(Session).join(
        Evaluation,
        Evaluation.session_id == Session.id,
        isouter=(not req.only_evaluated),
    )

    for filter_item in (req.filters or []):
        col = column_db_map[filter_item.column]
        if filter_item.value is None:
            query = query.filter(col.is_(None))
        elif isinstance(filter_item.value, str) and "%" in filter_item.value:
            query = query.filter(cast(col, String).ilike(filter_item.value))
        else:
            query = query.filter(col == filter_item.value)

    if req.include_messages:
        MessageAlias = aliased(Message)
        query = (
            query.join(MessageAlias, MessageAlias.session_id == Session.id)
            .group_by(*base_columns)
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

    # Compute total
    total_q = db.query(func.count(Session.id)).select_from(Session).join(
        Evaluation,
        Evaluation.session_id == Session.id,
        isouter=(not req.only_evaluated),
    )
    for filter_item in (req.filters or []):
        col = column_db_map[filter_item.column]
        if filter_item.value is None:
            total_q = total_q.filter(col.is_(None))
        elif isinstance(filter_item.value, str) and "%" in filter_item.value:
            total_q = total_q.filter(cast(col, String).ilike(filter_item.value))
        else:
            total_q = total_q.filter(col == filter_item.value)
    total = total_q.scalar() or 0

    if req.offset > 0:
        query = query.offset(req.offset)
    if req.limit > 0:
        query = query.limit(req.limit)

    results = query.all()

    # Normalize rows into dicts
    rows = []
    for row in results:
        try:
            row_vals = tuple(row)
        except TypeError:
            row_vals = (row,)

        values = {}
        for i, key in enumerate(output_keys):
            values[key] = row_vals[i] if i < len(row_vals) else None

        if req.include_messages:
            values["messages"] = (
                row_vals[len(output_keys)] if len(row_vals) > len(output_keys) else []
            )
        rows.append(values)

    return rows, total, output_keys


def _format_sessions_stats_csv(
    rows: list[dict],
    output_keys: list[str],
    include_messages: bool
) -> Response:
    csv_buffer = io.StringIO()
    headers = output_keys.copy()
    if include_messages:
        headers.append("messages")

    writer = csv.DictWriter(csv_buffer, fieldnames=headers, delimiter=";")
    writer.writeheader()

    for row in rows:
        if include_messages and row.get("messages"):
            row["messages"] = json.dumps(row["messages"], indent=2, ensure_ascii=False)
        writer.writerow(row)

    return Response(
        content=csv_buffer.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=sessions_stats.csv"
        }
    )


def _format_sessions_stats_json(
    rows: list[dict],
    total: int,
    req: GetSessionsHistoryRequest
) -> GetSessionsHistoryResponse:
    json_rows = [{"values": r} for r in rows]
    return GetSessionsHistoryResponse(
        columns=req.selected_columns(),
        rows=json_rows,
        total=total,
        limit=req.limit,
        offset=req.offset,
    )

