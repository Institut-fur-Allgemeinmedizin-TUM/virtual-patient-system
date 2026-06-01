from enum import Enum

from pydantic import BaseModel
from typing import Optional, Any


class CaseItemModel(BaseModel):
    id: str
    title: str
    language: str
    patient_name: str
    patient_age: int
    patient_occupation: str


class GetCasesResponse(BaseModel):
    cases: list[CaseItemModel]


class MedicalBackgroundResponseType(Enum):
    LIST_AVAILABLE = 1
    DIAGNOSTIC_RESPONSE = 2


class MedicalBackgroundResponse(BaseModel):  #
    type: MedicalBackgroundResponseType
    diagnostics_available: Optional[list[str]] = None
    diagnostic_data: Optional[Any] = None
