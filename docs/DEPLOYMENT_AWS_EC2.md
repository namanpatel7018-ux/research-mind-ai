# ResearchMind AI — Production Deployment Guide: Docker, Kubernetes & AWS EC2

This guide provides end-to-end instructions for deploying **ResearchMind AI** into production using:
1. **Docker & Docker Compose** (Single-node / EC2)
2. **Kubernetes (EKS / K3s / Minikube)** (Multi-pod container orchestration)
3. **AWS EC2 Production Setup** (with Systemd, SSL/TLS, and Nginx reverse proxy)

---

## 1. System Architecture & Requirements

### Architecture Overview
* **Frontend Container**: Nginx Alpine serving production React 18 / Vite static assets and reverse-proxying `/api/` requests to the backend.
* **Backend Container**: Python 3.12 FastAPI modular monolith handling RAG retrieval, embeddings, document parsing, AI generation, and authentication.
* **Storage Volumes**:
  * `/app/data`: SQLite database (`researchmind.db`), Qdrant vector database (`qdrant_storage`), and user authentication store (`auth_store.json`).
  * `/app/uploads`: Multi-tenant document storage partitioned by user email directory (`uploads/{user_id}/`).

### Recommended Hardware Specifications
| Environment | AWS Instance Type | vCPU | RAM | Storage (EBS gp3) |
| :--- | :--- | :--- | :--- | :--- |
| **Development / Test** | `t3.small` | 2 | 2 GB | 20 GB |
| **Production (Standard)** | `t3.medium` | 2 | 4 GB | 50 GB |
| **Production (High Concurrency)**| `t3.large` or `c6i.large` | 2-4 | 8 GB | 100 GB |

---

## 2. Docker & Docker Compose Deployment (Quickstart)

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/namanpatel7018-ux/NEW-RESEARCH-MIND-AI.git /opt/researchmind
cd /opt/researchmind

# Copy and edit production environment variables
cp .env.example .env
nano .env
```

Ensure the following variables are configured in `.env`:
```env
# AI Providers
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key

# Security
SECRET_KEY=generate-a-strong-32-char-random-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Network & Host
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com/api
CORS_ORIGINS=https://yourdomain.com,http://localhost:5173

# Optional: SMTP Email for OTPs
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=ResearchMind AI <noreply@yourdomain.com>
```

### Step 2: Launch with Docker Compose
```bash
# Production mode (includes resource limits and logging rotation)
docker compose -f docker-compose.prod.yml up -d --build

# Verify running containers and health status
docker compose -f docker-compose.prod.yml ps
```

### Step 3: Health Verification
```bash
# Verify backend health endpoint
curl -f http://localhost:8000/health

# Check live logs
docker compose -f docker-compose.prod.yml logs -f --tail=50
```

---

## 3. AWS EC2 Production Deployment Runbook

### Step 1: Provision EC2 Instance
1. In the **AWS Management Console**, navigate to **EC2** -> **Launch Instance**.
2. **Name**: `researchmind-production`
3. **AMI**: **Ubuntu Server 22.04 LTS (HVM)** or **Ubuntu 24.04 LTS**, 64-bit (x86).
4. **Instance Type**: `t3.medium` (or `t3.large`).
5. **Key Pair**: Select or create an SSH key pair (`researchmind-key.pem`).
6. **Network Settings (Security Group)**:
   * Allow SSH (`22/tcp`) from your IP address.
   * Allow HTTP (`80/tcp`) from anywhere (`0.0.0.0/0`).
   * Allow HTTPS (`443/tcp`) from anywhere (`0.0.0.0/0`).
7. **Storage**: Configure at least **40 GiB to 100 GiB** `gp3` root volume.
8. **Advanced Details (User Data)**: Paste the contents of `aws/ec2-user-data.sh` into the User Data field (or run manually after login).
9. Click **Launch Instance**.

### Step 2: Assign an Elastic IP (Static Public IP)
1. Go to **EC2 Console** -> **Network & Security** -> **Elastic IPs**.
2. Click **Allocate Elastic IP address**.
3. Select the allocated IP, click **Actions** -> **Associate Elastic IP address**, and associate it with your new instance.
4. Update your domain DNS records: point an `A` record (e.g., `researchmind.yourdomain.com`) to this Elastic IP.

### Step 3: Setup Application on Instance
SSH into the EC2 instance:
```bash
ssh -i researchmind-key.pem ubuntu@<YOUR-ELASTIC-IP>

# Clone repository to /opt/researchmind
sudo git clone https://github.com/namanpatel7018-ux/NEW-RESEARCH-MIND-AI.git /opt/researchmind
sudo chown -R ubuntu:ubuntu /opt/researchmind
cd /opt/researchmind

# Configure production .env
cp .env.example .env
nano .env
```

### Step 4: Configure Systemd Daemon for 24/7 Auto-Start
Ensure the application starts automatically when the EC2 instance boots:
```bash
sudo cp aws/researchmind.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now researchmind

# Check status
sudo systemctl status researchmind
```

### Step 5: Configure SSL/TLS with Let's Encrypt (Certbot)
To obtain a free SSL certificate for HTTPS:
```bash
# Install Certbot on host
sudo apt-get install -y certbot

# Stop container temporarily on port 80 to issue cert
sudo docker compose -f docker-compose.prod.yml stop frontend

# Obtain certificate
sudo certbot certonly --standalone -d researchmind.yourdomain.com

# Start containers
sudo docker compose -f docker-compose.prod.yml start frontend
```

---

## 4. Kubernetes (K8s) Production Deployment

The `k8s/` directory contains complete, standard Kubernetes manifests compatible with **AWS EKS**, **Google GKE**, **Azure AKS**, or local **K3s/Minikube**.

### Manifests Included
* `k8s/namespace.yaml`: Dedicated `researchmind` namespace.
* `k8s/configmap.yaml`: Application environment configuration.
* `k8s/secret.example.yaml`: Secrets template for API keys and JWT signing secrets.
* `k8s/pvc.yaml`: Persistent Volume Claims for data (SQLite/Qdrant) and user uploads.
* `k8s/backend-deployment.yaml`: FastAPI backend deployment with health probes and resource limits.
* `k8s/backend-service.yaml`: ClusterIP service routing traffic on port 8000.
* `k8s/frontend-deployment.yaml`: Nginx SPA frontend deployment with 2 replicas.
* `k8s/frontend-service.yaml`: ClusterIP service routing traffic on port 80.
* `k8s/ingress.yaml`: Ingress controller with TLS termination and 100MB body size.
* `k8s/kustomization.yaml`: Kustomize coordinator.

### Step-by-Step K8s Deployment
```bash
# 1. Create the Secret from the template
kubectl apply -f k8s/namespace.yaml

# Create the secret with your live keys:
kubectl create secret generic researchmind-secrets \
  --namespace=researchmind \
  --from-literal=SECRET_KEY="your-random-production-secret" \
  --from-literal=GEMINI_API_KEY="your-gemini-key" \
  --from-literal=GROQ_API_KEY="your-groq-key"

# 2. Deploy all resources via Kustomize
kubectl apply -k k8s/

# 3. Monitor Pod rollout
kubectl get pods -n researchmind -w

# 4. Check services and ingress status
kubectl get svc,ingress -n researchmind
```

---

## 5. Ongoing Maintenance & Zero-Downtime Rollouts

### Deploying Code Updates on EC2
Use the included automated rollout script:
```bash
cd /opt/researchmind
bash aws/deploy.sh
```
This script pulls updates, rebuilds images, restarts containers, monitors healthchecks, and prunes unused images automatically.

### Automated Backups
To take a snapshot of the SQLite database and vector storage:
```bash
# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p /opt/researchmind/backups
docker compose -f docker-compose.prod.yml exec backend \
  sqlite3 /app/data/researchmind.db ".backup '/app/data/backup_${TIMESTAMP}.sqlite'"
```
