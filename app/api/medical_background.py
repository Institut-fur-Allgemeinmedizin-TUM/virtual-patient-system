import base64
import json
import os

from fastapi import APIRouter, HTTPException, Request, Depends, Query, Path
from sqlalchemy.orm import Session as OrmSession

from app.api.memory import vhb_sessions, logger
from app.auth import auth
from app.db.db import get_db
from app.model.cases import (
    MedicalBackgroundsAvailableResponse,
    DiagnosticValue,
    DiagnosticGroup,
    DataType, )
from app.model.models import Session as ChatSession, Diagnostic

diagnostics_router = APIRouter()


def _load_background_data_from_disk(case_id: str) -> dict[str, list[DiagnosticGroup]]:
    """Load background data from JSON file."""
    case_file = os.path.join(
        os.path.dirname(__file__),
        "..",
        "cases",
        "medical_background",
        f"{case_id}.json",
    )
    if not os.path.exists(case_file):
        raise HTTPException(status_code=404, detail=f"Background '{case_id}' not found")

    with open(case_file, "r", encoding="utf-8") as f:
        background_data = {}

        json_data = json.load(f)
        for key, value in json_data.items():
            diag_group = DiagnosticGroup(
                name=key, display_name=value["display_name"], data=[]
            )
            for subkey, subvalue in value["data"].items():
                diag_data = DiagnosticValue(
                    name=subkey,
                    display_name=subvalue["display_name"],
                    unit=subvalue["unit"],
                    data_type=subvalue["data_type"],
                    data=subvalue["data"],
                )
                diag_group.data.append(diag_data)

            background_data[key] = diag_group
        return background_data


def _load_backgrounds_from_disk() -> dict[str, dict[str, DiagnosticGroup]]:
    backgrounds_dir = os.path.join(
        os.path.dirname(__file__), "..", "cases", "medical_background"
    )
    backgrounds = {}
    for filename in os.listdir(backgrounds_dir):
        if filename.endswith(".json"):
            case_id = filename[:-5]  # Remove .json extension
            try:
                backgrounds[case_id] = _load_background_data_from_disk(case_id)
            except HTTPException:
                continue  # Skip files that can't be loaded
    return backgrounds


BACKGROUNDS: dict[str, dict[str, DiagnosticGroup]] = _load_backgrounds_from_disk()


@diagnostics_router.get("/api/diagnostics/{case_id}/available")
async def get_medical_background_available(
    request: Request,
    case_id: str = Path(description="The case to retrieve from the backend."),
) -> MedicalBackgroundsAvailableResponse:
    if not case_id in BACKGROUNDS:
        # Return json of background
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    available_diagnostics = []
    for diag_name, diag_group in BACKGROUNDS[case_id].items():
        available_diagnostics.append(
            DiagnosticGroup(
                name=diag_name,
                display_name=diag_group.display_name,
                data=None,  # Don't include actual data in the available endpoint
            )
        )
    return MedicalBackgroundsAvailableResponse(
        diagnostics_available=available_diagnostics
    )


@diagnostics_router.get(
    "/api/diagnostics/{case_id}",
)
async def get_medical_background(
    request: Request,
    case_id: str = Path(description="The case to retrieve from the backend."),
    diagnostic: str = Query(
        None,
        description="The specific diagnostic to retrieve. If not provided, returns list of available diagnostics for the case.",
    ),
    session_id: str = Query(
        None,
        description="The session ID for tracking diagnostic usage. Required when requesting specific diagnostic data.",
    ),
    db: OrmSession = Depends(get_db),
) -> DiagnosticGroup:
    if not case_id in BACKGROUNDS:
        # Return json of background
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    if not diagnostic in BACKGROUNDS[case_id]:
        raise HTTPException(status_code=404, detail="Diagnostic not found")

    diagnostic_ret = BACKGROUNDS[case_id][diagnostic]
    if diagnostic_ret.data is not None:
        for i in range(len(diagnostic_ret.data)):
            is_large_data = (
                diagnostic_ret.data[i].data_type == DataType.Audio
                or diagnostic_ret.data[i].data_type == DataType.Video
                or diagnostic_ret.data[i].data_type == DataType.Image_Png
                or diagnostic_ret.data[i].data_type == DataType.Image_Jpeg
            )
            if isinstance(diagnostic_ret.data[i].data, str) and is_large_data:
                # Load data from disk
                if not diagnostic_ret.data[i].data.startswith("path:"):
                    logger.warn("Error, filepath not starting with 'path:'")
                    continue
                with open(diagnostic_ret.data[i].data[5:], "rb") as file:
                    raw = file.read()
                    diagnostic_ret.data[i].data = {
                        "type": "binary",
                        "encoding": "base64",
                        "mime": "application/octet-stream",
                        "data": base64.b64encode(raw).decode("ascii"),
                    }

    session = db.query(ChatSession).where(ChatSession.id == session_id).first()
    if session is None:
        # Session could be vhb session
        if session_id in vhb_sessions:
            # Session is vhb session
            session = vhb_sessions.get(session_id)
            if session.get("used_diagnostics") is None:
                session["used_diagnostics"] = []
            session["used_diagnostics"].append(diagnostic_ret.name)
            return diagnostic_ret
        else:
            raise HTTPException(status_code=403, detail="Session not found")

    else:
        user = auth.require_user(request)
        tum_id = user.get("tum_id") or user.get("sub")
        if session.user_id != tum_id:
            raise HTTPException(status_code=403, detail="Invalid user id")

        # Session in DB
        diagnostic_db = (
            db.query(Diagnostic).where(Diagnostic.name == diagnostic_ret.name).first()
        )
        if diagnostic_db is None:
            add_diagnostic = Diagnostic(name=diagnostic_ret.name)
            db.add(add_diagnostic)
            session.used_diagnostics.append(add_diagnostic)
        else:
            session.used_diagnostics.append(diagnostic_db)

        db.commit()
        return diagnostic_ret
