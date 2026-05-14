import os
import json
from typing import Optional, Dict, List, Any

from fastapi import APIRouter, HTTPException, Request, Depends, Query, Path
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session as OrmSession

from app.api.memory import vhb_sessions
from app.model.models import (
    Session as ChatSession, Diagnostic
)

from app.db.db import get_db

medical_background_router = APIRouter()

def _load_background_data_from_disk(case_id: str):
    """Load background data from JSON file."""
    case_file = os.path.join(
        os.path.dirname(__file__), "..", "cases", "medical_background", f"{case_id}.json"
    )
    if not os.path.exists(case_file):
        raise HTTPException(status_code=404, detail=f"Background '{case_id}' not found")

    with open(case_file, "r", encoding="utf-8") as f:
        return json.load(f)

def _load_backgrounds_from_disk():
    backgrounds_dir = os.path.join(os.path.dirname(__file__), "..", "cases", "medical_background")
    backgrounds = {}
    for filename in os.listdir(backgrounds_dir):
        if filename.endswith(".json"):
            case_id = filename[:-5]  # Remove .json extension
            try:
                backgrounds[case_id] = _load_background_data_from_disk(case_id)
            except HTTPException:
                continue  # Skip files that can't be loaded
    return backgrounds


BACKGROUNDS = _load_backgrounds_from_disk()

@medical_background_router.get(
    "/api/diagnostics/{case_id}",
    summary="Get medical background diagnostics",
    description="Retrieve available diagnostics for a case or specific diagnostic data. Supports both database sessions and VHB sessions.",
    responses={
        200: {
            "description": "Successfully retrieved diagnostics",
            "content": {
                "application/json": {
                    "examples": {
                        "diagnostics_available": {
                            "summary": "List of available diagnostics",
                            "value": {"diagnostics_available": ["diagnosis1", "diagnosis2", "diagnosis3"]}
                        },
                        "diagnostic": {
                            "summary": "Specific diagnostic data",
                            "value": {"<diagnostic>": {"<some_data_key>": "<some_data_value>"}}
                        }
                    }
                }
            }
        },
        403: {
            "description": "Session not found or not authorized"
        },
        404: {
            "description": "Case or diagnostic not found"
        }
    },
    tags=["Medical Background"]
)
async def get_medical_background(
    case_id: str = Path(
        description="The case to retrieve from the backend."
    ),
    session_id: Optional[str] = Query(
        None,
        description="The session ID for tracking diagnostic usage. Required when requesting specific diagnostic data."
    ),
    diagnostic: Optional[str] = Query(
        None,
        description="The specific diagnostic to retrieve. If not provided, returns list of available diagnostics for the case."
    ),
    request: Request = None,
    db: OrmSession = Depends(get_db)
) -> JSONResponse:
    if not case_id in BACKGROUNDS:
        # Return json of background
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    if not diagnostic:
        return JSONResponse(status_code=200, content={"diagnostics_available": list(BACKGROUNDS[case_id].keys())})

    if not diagnostic in BACKGROUNDS[case_id]:
        raise HTTPException(status_code=404, detail="Diagnostic not found")

    if not session_id:
        raise HTTPException(status_code=403, detail="Session not found")

    session = db.query(ChatSession).where(ChatSession.id == session_id).first()
    if session is None:
        # Session could be vhb session
        if session_id in vhb_sessions:
            # Session is vhb session
            session = vhb_sessions.get(session_id)
            if not session[session_id]["used_diagnostics"]:
                session[session_id]["used_diagnostics"] = [diagnostic]
            else:
                session[session_id]["used_diagnostics"].append(diagnostic)
            return JSONResponse(status_code=200, content={diagnostic: BACKGROUNDS[case_id][diagnostic]})
        else:
            raise HTTPException(status_code=403, detail="Session not found")

    else:
        # Session in DB
            diagnostic_db = db.query(Diagnostic).where(Diagnostic.name == diagnostic).first()
            if diagnostic_db is None:
                add_diagnostic = Diagnostic(
                    name=diagnostic
                )
                db.add(add_diagnostic)
                session.used_diagnostics.append(add_diagnostic)
            else:
                session.used_diagnostics.append(diagnostic_db)

            db.commit()
            return JSONResponse(status_code=200, content={diagnostic: BACKGROUNDS[case_id][diagnostic]})


