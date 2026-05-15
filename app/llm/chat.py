import json
import os
from typing import Dict

from fastapi import HTTPException
from langchain_google_genai import ChatGoogleGenerativeAI

from sqlalchemy.orm import Session as OrmSession

from app.config.config import settings
from app.model.models import Case

chat_llm = ChatGoogleGenerativeAI(
    model=settings.gemini_model,
    api_key=settings.gemini_api_key,
    temperature=0.6,
    max_output_tokens=600,
)

reasoning_llm = ChatGoogleGenerativeAI(
    model=settings.gemini_reasoning_model,
    api_key=settings.gemini_api_key,
    temperature=0.7,
    max_output_tokens=6000,
)


def _load_case_data_from_disk(case_id: str) -> Dict:
    """Load case data from JSON file."""
    case_file = os.path.join(
        os.path.dirname(__file__), "..", "cases", f"{case_id}.json"
    )
    if not os.path.exists(case_file):
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    with open(case_file, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_all_cases_from_disk() -> Dict[str, Dict]:
    cases_dir = os.path.join(os.path.dirname(__file__), "..", "cases")
    cases = {}
    for filename in os.listdir(cases_dir):
        if filename.endswith(".json"):
            case_id = filename[:-5]  # Remove .json extension
            try:
                cases[case_id] = _load_case_data_from_disk(case_id)
            except HTTPException:
                continue  # Skip files that can't be loaded
    return cases


ALL_CASES: Dict[str, Dict] = _load_all_cases_from_disk()


def load_case_data(case_id: str) -> Dict:
    """Load case data from JSON file."""
    if case_id in ALL_CASES:
        return ALL_CASES[case_id]


def load_all_cases() -> Dict[str, Dict]:
    """Return all case data from the in-memory cache."""
    return ALL_CASES


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
