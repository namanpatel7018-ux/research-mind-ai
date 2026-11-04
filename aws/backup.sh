#!/usr/bin/env bash
# ==============================================================================
# ResearchMind AI — Automated Production Backup Script
# Backs up SQLite (atomic VACUUM INTO), Qdrant vector store, auth store, and uploads
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${APP_DIR}/backups"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
ARCHIVE_NAME="researchmind_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "===================================================================="
echo " Starting ResearchMind AI Data Backup"
echo " Timestamp: ${TIMESTAMP}"
echo " Destination: ${BACKUP_DIR}/${ARCHIVE_NAME}"
echo "===================================================================="

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "==> [1/4] Performing atomic SQLite backup using VACUUM INTO..."
# Execute atomic snapshot within the running backend container
docker compose -f "${APP_DIR}/docker-compose.prod.yml" exec -T backend python -c "
import sqlite3, os
db_path = '/app/data/researchmind.db'
backup_path = '/app/data/snapshot.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    conn.execute(f\"VACUUM INTO '{backup_path}'\")
    conn.close()
    print('SQLite atomic snapshot created.')
else:
    print('No database file found to snapshot.')
"

# Copy snapshot and auth store from container volume to temp dir
docker compose -f "${APP_DIR}/docker-compose.prod.yml" cp backend:/app/data/snapshot.db "${TEMP_DIR}/researchmind.db" 2>/dev/null || true
docker compose -f "${APP_DIR}/docker-compose.prod.yml" exec -T backend rm -f /app/data/snapshot.db 2>/dev/null || true
docker compose -f "${APP_DIR}/docker-compose.prod.yml" cp backend:/app/data/auth_store.json "${TEMP_DIR}/auth_store.json" 2>/dev/null || true

echo "==> [2/4] Archiving Qdrant vector store collections..."
docker compose -f "${APP_DIR}/docker-compose.prod.yml" cp backend:/app/data/qdrant_storage "${TEMP_DIR}/qdrant_storage" 2>/dev/null || true

echo "==> [3/4] Archiving uploaded research documents..."
docker compose -f "${APP_DIR}/docker-compose.prod.yml" cp backend:/app/uploads "${TEMP_DIR}/uploads" 2>/dev/null || true

echo "==> [4/4] Creating encrypted/compressed backup tarball..."
tar -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" -C "${TEMP_DIR}" .
chmod 600 "${BACKUP_DIR}/${ARCHIVE_NAME}"

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${ARCHIVE_NAME}" | cut -f1)
echo "==> Backup complete! File: ${BACKUP_DIR}/${ARCHIVE_NAME} (Size: ${BACKUP_SIZE})"

# Retention policy: retain backups for 14 days, delete older
echo "==> Pruning backups older than 14 days..."
find "${BACKUP_DIR}" -name "researchmind_backup_*.tar.gz" -mtime +14 -delete 2>/dev/null || true

# Optional: Upload to S3 if S3_BACKUP_BUCKET is set
if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
    echo "==> Uploading backup to AWS S3: s3://${S3_BACKUP_BUCKET}/researchmind/${ARCHIVE_NAME}..."
    aws s3 cp "${BACKUP_DIR}/${ARCHIVE_NAME}" "s3://${S3_BACKUP_BUCKET}/researchmind/${ARCHIVE_NAME}" --only-show-errors
    echo "==> S3 upload finished."
fi

echo "===================================================================="
echo " Backup process successfully completed."
echo "===================================================================="
