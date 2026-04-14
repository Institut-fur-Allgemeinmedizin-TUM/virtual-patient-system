from pydantic import BaseModel


class VHBLoginRequest(BaseModel):
    password: str


class VHBLoginResponse(BaseModel):
    ok: bool
    token: str