"""
ResearchMind AI main application entry point.
Exposes FastAPI app from app.api.main for compatibility with standard uvicorn commands.
"""
from app.api.main import app

__all__ = ["app"]

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
