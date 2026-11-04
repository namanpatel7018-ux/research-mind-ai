#!/usr/bin/env bash
# ==============================================================================
# ResearchMind AI — AWS EC2 Cloud-Init Bootstrap Script
# ==============================================================================
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS
# Target Instance: t3.medium or t3.large (recommended 2 vCPU, 4GB+ RAM)
# ==============================================================================

set -euo pipefail

echo "==> [1/6] Updating base packages and installing prerequisites..."
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    jq

echo "==> [2/6] Installing Docker CE and Docker Compose Plugin..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu || true

echo "==> [3/6] Configuring Host Firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

echo "==> [4/6] Creating deployment directory structure..."
APP_DIR="/opt/researchmind"
mkdir -p "$APP_DIR"
chown -R ubuntu:ubuntu "$APP_DIR"

echo "==> [5/6] System bootstrap complete."
echo "NEXT STEPS for Operator:"
echo "1. Clone or copy code into $APP_DIR"
echo "2. Create $APP_DIR/.env with your production API keys and domain"
echo "3. Run: cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d --build"
echo "4. Enable systemd unit: sudo cp $APP_DIR/aws/researchmind.service /etc/systemd/system/ && sudo systemctl enable --now researchmind"
