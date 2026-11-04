#!/usr/bin/env bash
# ==============================================================================
# ResearchMind AI — Production EC2 Deployment & Rollout Script
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

cd "$APP_DIR"

echo "===================================================================="
echo " Starting ResearchMind AI Production Deployment on AWS EC2"
echo " Time: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo " Working Directory: $APP_DIR"
echo "===================================================================="

# 1. Verify environment configuration
if [ ! -f "$APP_DIR/.env" ]; then
    echo "ERROR: Production .env file not found in $APP_DIR!"
    echo "Please copy .env.example to .env and configure production secrets."
    exit 1
fi

# Restrict permissions on .env
chmod 600 "$APP_DIR/.env" 2>/dev/null || true

# 2. Build production containers
echo "==> Building production Docker images..."
docker compose -f docker-compose.prod.yml build --pull

# 3. Apply updates with rolling container recreation
echo "==> Deploying updated service containers..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 4. Wait for application healthcheck
echo "==> Waiting for backend healthcheck to report healthy..."
MAX_RETRIES=24
COUNT=0

until [ "$COUNT" -ge "$MAX_RETRIES" ]
do
    # Check through frontend reverse proxy on port 80 or container health
    HEALTH_OUTPUT=$(curl -sf http://localhost/health 2>/dev/null || docker compose -f docker-compose.prod.yml exec -T backend curl -sf http://localhost:8000/health 2>/dev/null || echo "")
    if echo "$HEALTH_OUTPUT" | grep -q '"status":\s*"healthy"'; then
        echo "==> Application is HEALTHY!"
        break
    fi
    echo "    Application status not ready yet (waiting 5s... $((COUNT+1))/$MAX_RETRIES)"
    sleep 5
    COUNT=$((COUNT+1))
done

if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Application failed healthcheck within timeout!"
    echo "==> Dumping backend container logs:"
    docker compose -f docker-compose.prod.yml logs --tail=50 backend
    echo "==> Dumping frontend container logs:"
    docker compose -f docker-compose.prod.yml logs --tail=50 frontend
    exit 1
fi

# 5. Clean up stale dangling images
echo "==> Pruning dangling docker images..."
docker image prune -f

echo "===================================================================="
echo " ResearchMind AI Production Deployment SUCCEEDED!"
echo " Web UI / API: http://localhost/"
echo " Healthcheck:  http://localhost/health"
echo "===================================================================="
