#!/usr/bin/env bash
# ==============================================================================
# ResearchMind AI — Production Restore & Disaster Recovery Script
# Restores SQLite database, Qdrant vectors, auth store, and uploads from a backup
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path_to_backup_tarball.tar.gz>"
    echo "Example: $0 /opt/researchmind/backups/researchmind_backup_20261030_120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup archive '$BACKUP_FILE' does not exist."
    exit 1
fi

echo "===================================================================="
echo " WARNING: RESTORING DATA FROM BACKUP"
echo " Archive: $BACKUP_FILE"
echo " This operation will overwrite active persistent data with backup data."
echo "===================================================================="

read -p "Are you sure you want to proceed with restore? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "==> Extracting backup archive..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

echo "==> Stopping backend container for consistent data restore..."
docker compose -f "${APP_DIR}/docker-compose.prod.yml" stop backend

# Restore into container volumes
echo "==> Restoring SQLite database and auth store..."
if [ -f "${TEMP_DIR}/researchmind.db" ]; then
    docker compose -f "${APP_DIR}/docker-compose.prod.yml" cp "${TEMP_DIR}/researchmind.db" backend:/app/data/researchmind.db
fi
if [ -f "${TEMP_DIR}/auth_store.json" ]; then
    docker compose -f "${APP_DIR}/docker-compose.prod.yml" cp "${TEMP_DIR}/auth_store.json" backend:/app/data/auth_store.json
fi

if [ -d "${TEMP_DIR}/qdrant_storage" ]; then
    echo "==> Restoring Qdrant vector store..."
    docker compose -f "${APP_DIR}/docker-compose.prod.yml" cp "${TEMP_DIR}/qdrant_storage" backend:/app/data/
fi

if [ -d "${TEMP_DIR}/uploads" ]; then
    echo "==> Restoring user document uploads..."
    docker compose -f "${APP_DIR}/docker-compose.prod.yml" cp "${TEMP_DIR}/uploads" backend:/app/
fi

echo "==> Starting backend service..."
docker compose -f "${APP_DIR}/docker-compose.prod.yml" start backend

echo "==> Verifying system health post-restore..."
sleep 5
bash "${APP_DIR}/aws/deploy.sh"

echo "===================================================================="
echo " Data restore successfully completed!"
echo "===================================================================="
