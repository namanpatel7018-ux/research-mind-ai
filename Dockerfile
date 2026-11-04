# Root Dockerfile for ResearchMind AI (Backend Service Container)
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/backend/data \
    UPLOAD_DIR=/app/backend/uploads

WORKDIR /app

# Install system dependencies (curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /bin/bash -m appuser

# Copy backend requirements and install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create runtime directories with proper permissions
RUN mkdir -p /app/backend/data /app/backend/uploads /app/data && \
    chown -R appuser:appuser /app

# Copy backend source code and top-level configuration
COPY --chown=appuser:appuser backend/ ./backend/
COPY --chown=appuser:appuser config.yaml ./
COPY --chown=appuser:appuser PROMPT.md ./

WORKDIR /app/backend

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["sh", "-c", "exec uvicorn app.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
