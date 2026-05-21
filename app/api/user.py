from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session as OrmSession

from app.auth import auth
from app.db.db import get_db
from app.model.models import User
from app.model.user import UserProfileUpdateRequest, UserProfileResponse

userRouter = APIRouter()

@userRouter.get("/api/user/profile", response_model=UserProfileResponse)
async def get_user_profile(
    request: Request, db: OrmSession = Depends(get_db)
) -> UserProfileResponse:
    """Get the current user's profile information."""
    user_dict = auth.require_user(request)
    tum_id = user_dict.get("tum_id") or user_dict.get("sub")
    
    if not tum_id:
         raise HTTPException(status_code=401, detail="User identification missing")

    db_user = db.query(User).filter(User.oidc_id == tum_id).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found in database")

    return UserProfileResponse(
        sub=user_dict.get("sub", ""),
        tum_id=tum_id,
        pronouns=db_user.pronouns,
        roles=user_dict.get("roles", [])
    )

@userRouter.put("/api/user/profile", response_model=UserProfileResponse)
async def update_user_profile(
    req: UserProfileUpdateRequest, request: Request, db: OrmSession = Depends(get_db)
) -> UserProfileResponse:
    """Update the current user's profile information."""
    user_dict = auth.require_user(request)
    tum_id = user_dict.get("tum_id") or user_dict.get("sub")
    
    if not tum_id:
         raise HTTPException(status_code=401, detail="User identification missing")

    db_user = db.query(User).filter(User.oidc_id == tum_id).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found in database")

    if req.pronouns is not None:
        db_user.pronouns = req.pronouns

    db.commit()
    db.refresh(db_user)

    return UserProfileResponse(
        sub=user_dict.get("sub", ""),
        tum_id=tum_id,
        pronouns=db_user.pronouns,
        roles=user_dict.get("roles", [])
    )
