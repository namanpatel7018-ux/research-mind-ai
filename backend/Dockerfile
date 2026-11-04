# Production Dockerfile for ResearchMind AI (FastAPI + RAG Backend)
FROM python:3.12-slim

# Prevent python from buffering stdout/stderr and writing bytecode
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data \
    UPLOAD_DIR=/app/uploads

WORKDIR /app

# Install system dependencies (curl for container health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and group
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /bin/bash -m appuser

# Install Python dependencies with cache optimization
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create runtime directories for data persistence and uploads with proper ownership
RUN mkdir -p /app/data /app/uploads /app/data/qdrant_storage && \
    chown -R appuser:appuser /app

# Copy backend source code with non-root ownership
COPY --chown=appuser:appuser . ./

# Switch to non-root user
USER appuser

EXPOSE 8000

# Health check using the FastAPI /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start Uvicorn with exec to properly handle SIGTERM for graceful shutdown
CMD ["sh", "-c", "exec uvicorn app.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
