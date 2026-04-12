import json
import os
from typing import Dict

from fastapi import HTTPException

from sqlalchemy.orm import Session as OrmSession

from app.config.config import settings
from app.model.models import Case


def load_case_data(case_id: str) -> Dict:
    """Load case data from JSON file."""
    case_file = os.path.join(os.path.dirname(__file__), "cases", f"{case_id}.json")
    if not os.path.exists(case_file):
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    with open(case_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def ensure_case(db: OrmSession, case_id: str) -> Case:
    case = db.get(Case, case_id)
    if case is None:
        # Load case data to get title
        try:
            case_data = load_case_data(case_id)
            title = case_data.get("title", case_id)
            language = case_data.get("language", "de")
        except HTTPException:
            # Fallback for unknown cases
            title = case_id
            language = "de"

        case = Case(id=case_id, title=title, language=language)
        db.add(case)
        db.commit()
    return case


def load_case_prompt(case_id: str) -> str:
    """Load case prompt from JSON file."""
    try:
        case_data = load_case_data(case_id)
        return case_data["persona"]["prompt"]
    except (HTTPException, KeyError):
        return "Du bist ein Simulationspatient. Antworte kurz auf Deutsch."


def get_openai_client():
    from openai import OpenAI

    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")
    return OpenAI(api_key=settings.openai_api_key)