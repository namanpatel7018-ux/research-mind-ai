"""
ResearchMind AI — User Settings Routes
======================================
Retrieves and updates user preferences (appearance, reasoning models, citation formats).
"""

from fastapi import APIRouter, Depends
from app.schemas.auth_schemas import UserOut
from app.api.auth_handlers.security import get_current_user

router = APIRouter()


@router.get("/settings")
def get_settings(current_user: UserOut = Depends(get_current_user)):
    from app.db import get_user_settings
    return get_user_settings(current_user.email)


@router.patch("/settings")
def update_settings(body: dict, current_user: UserOut = Depends(get_current_user)):
    from app.db import update_user_settings
    return update_user_settings(current_user.email, body)
