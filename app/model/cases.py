from pydantic import BaseModel


class CaseItemModel(BaseModel):
    id: str
    title: str
    language: str
    patient_name: str
    patient_age: int
    patient_occupation: str


class GetCasesResponse(BaseModel):
    cases: list[CaseItemModel]
