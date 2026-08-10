from pydantic import BaseModel
from typing import Optional


class UserProfileUpdateRequest(BaseModel):
    pronouns: Optional[str] = None
    display_name: Optional[str] = None


class UserProfileResponse(BaseModel):
    sub: str
    tum_id: Optional[str] = None
    pronouns: str
    display_name: str
    roles: list[str]
