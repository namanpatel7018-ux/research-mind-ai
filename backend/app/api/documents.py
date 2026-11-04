"""
ResearchMind AI — Document Management API
==========================================
Provides:
  - GET    /files: List user-owned documents and indexing status
  - POST   /upload: Upload PDF/DOCX/TXT/MD and index into RAG vector store
  - DELETE /files/{filename}: Delete document, vectors, and chunks
  - GET    /files/{filename}/content: Stream document content
  - GET    /files/{filename}/page/{page_number}: Get page text & layout blocks
"""

from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse

from app.api.auth import get_optional_current_user, UserOut
from app.application.services.document_service import document_service
from app.core.exceptions import ValidationError, EntityNotFoundError
from app.db import log_activity

router = APIRouter()


@router.get("/files")
async def list_files(current_user: Optional[UserOut] = Depends(get_optional_current_user)):
    user_id = current_user.email if current_user else "researcher@example.com"
    files = document_service.list_documents(user_id)
    return {"files": files}


MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB limit matching Nginx client_max_body_size

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename cannot be empty.")

    # Read content with size safeguard
    data = await file.read(MAX_UPLOAD_SIZE + 1)
    if len(data) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File size exceeds the 100MB limit.",
        )

    try:
        stats = document_service.upload_and_index(filename=file.filename, data=data, user_id=user_id)
        log_activity(user_id, "DOCUMENT_UPLOAD", f"Uploaded {file.filename}", file.filename)
        return stats
    except ValidationError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Indexing document failed. Please verify file format and try again.")



@router.delete("/files/{filename}")
async def delete_document_endpoint(
    filename: str,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    deleted = document_service.delete_document(filename=filename, user_id=user_id)
    return {"status": "deleted", "filename": filename, "vectors_removed": deleted}


@router.get("/files/{filename}/content")
async def get_file_content(
    filename: str,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    path = document_service.storage.get_file_path(user_id, filename)
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail="File not found or unauthorized")
    media_type = "application/pdf" if filename.lower().endswith(".pdf") else "text/plain"
    return FileResponse(path, media_type=media_type, filename=filename)


@router.get("/files/{filename}/page/{page_number}")
async def get_page_details(
    filename: str,
    page_number: int,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    try:
        return document_service.get_page_details(filename=filename, page_number=page_number, user_id=user_id)
    except EntityNotFoundError as err:
        raise HTTPException(status_code=404, detail=str(err))
    except ValidationError as err:
        raise HTTPException(status_code=404, detail=str(err))
