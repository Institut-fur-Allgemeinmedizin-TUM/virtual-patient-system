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


class DataType(Enum):
    Integer = "integer"
    String = "string"
    Float = "float"
    Image_Png = "image/png"
    Image_Jpeg = "image/jpeg"
    Video = "video"
    Audio = "audio"


class DiagnosticValue(BaseModel):
    name: str
    display_name: str
    unit: str
    data_type: DataType
    data: Any


class DiagnosticGroup(BaseModel):
    name: str
    display_name: str
    data: Optional[list[DiagnosticValue]] = None


class MedicalBackgroundsAvailableResponse(BaseModel):
    diagnostics_available: list[DiagnosticGroup]


class UsedDiagnosticsResponse(BaseModel):
    diagnostics_used: list[str]
