from pydantic import BaseModel
from typing import Optional

class UserProfileUpdateRequest(BaseModel):
    pronouns: Optional[str] = None

class UserProfileResponse(BaseModel):
    sub: str
    tum_id: Optional[str] = None
    pronouns: str
    roles: list[str]
