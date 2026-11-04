"""
ResearchMind AI — User Profile & Credential Routes
==================================================
Profile retrieval, name update, password update, and account removal.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.schemas.auth_schemas import UserOut, UpdateProfileBody, ChangePasswordBody
import app.api.auth_handlers.state as auth_state
from app.api.auth_handlers.security import get_current_user

router = APIRouter()

_PASSWORD_MIN = 8
_PASSWORD_MAX = 128


def _validate_password(password: str) -> None:
    if len(password) < _PASSWORD_MIN or len(password) > _PASSWORD_MAX:
        raise HTTPException(
            status_code=422,
            detail=f"Password must be between {_PASSWORD_MIN} and {_PASSWORD_MAX} characters.",
        )


@router.get("/me", response_model=UserOut, summary="Get current authenticated user")
def read_users_me(current_user: UserOut = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_profile(body: UpdateProfileBody, current: UserOut = Depends(get_current_user)):
    name = body.full_name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Full name must be at least 2 characters.")
    user = auth_state._users[current.email]
    user["full_name"] = name
    auth_state._save_store()
    return UserOut(email=current.email, full_name=name, picture=user.get("picture"), is_verified=True)


@router.post("/change-password")
def change_password(body: ChangePasswordBody, current: UserOut = Depends(get_current_user)):
    user = auth_state._users[current.email]
    if "hashed_password" not in user or not auth_state.pwd_context.verify(body.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    _validate_password(body.new_password)
    user["hashed_password"] = auth_state.pwd_context.hash(body.new_password)
    auth_state._save_store()
    return {"message": "Password updated successfully."}


@router.delete("/me")
def delete_account(current: UserOut = Depends(get_current_user)):
    auth_state._users.pop(current.email, None)
    auth_state._save_store()
    return {"message": "Account deleted."}
