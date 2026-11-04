# ResearchMind AI 2.0 — Production Deployment Guide (AWS EC2 & Docker Compose)

This guide provides end-to-end instructions for deploying **ResearchMind AI 2.0** on an AWS EC2 instance running **Ubuntu Server 24.04 LTS** using Docker and Docker Compose.

---

## 1. Project Architecture

ResearchMind AI 2.0 uses a modern multi-container architecture designed for high security, data isolation, and low operational overhead:

```
                  Internet / Public Clients
                             │
                  [Port 80 / Port 443]
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │                 AWS EC2 Instance (Ubuntu 24.04)        │
  │                                                         │
  │   Host Firewall (UFW: 22, 80, 443 only)                 │
  │                                                         │
  │   ┌─────────────────────────────────────────────────┐   │
  │   │  researchmind-frontend Container (Port 80/443)  │   │
  │   │  - Nginx Reverse Proxy                          │   │
  │   │  - Static React 18 / Vite SPA Assets            │   │
  │   │  - Security Headers & Gzip Compression         │   │
  │   └──────────────────────┬──────────────────────────┘   │
  │                          │ Internal Docker Network      │
  │                          │ (researchmind-network)       │
  │                          ▼                              │
  │   ┌─────────────────────────────────────────────────┐   │
  │   │  researchmind-backend Container (Port 8000)     │   │
  │   │  - Non-Root appuser (UID 1000)                  │   │
  │   │  - FastAPI REST API + RAG Pipeline              │   │
  │   │  - FlashRank Local Cross-Encoder Reranker       │   │
  │   │  - In-Memory Sliding-Window Rate Limiter        │   │
  │   └───────────────┬─────────────────┬───────────────┘   │
  │                   │                 │                   │
  │                   ▼                 ▼                   │
  │        Named Volume: backend_data  Named Volume:        │
  │        - researchmind.db (SQLite)  backend_uploads      │
  │        - auth_store.json (Users)   - User PDF & DOCX    │
  │        - qdrant_storage (Vectors)    Documents          │
  └───────────────────┼─────────────────┼───────────────────┘
                      ▼                 ▼
          External AI APIs (Backend Egress Only)
          - Google Gemini API (Deep analysis, literature review, PPT)
          - Groq API (Ultra-fast interactive chat, quick QA, quiz)
```

**Key Architectural Guarantees**:
- The backend port (`8000`) is **never published to the host machine**. All external traffic enters via Nginx on port 80/443.
- All AI provider communications (Gemini, Groq) originate solely from the backend container; no API keys ever reach the frontend.
- Persistent named volumes (`backend_data` and `backend_uploads`) guarantee data survives container recreation and host reboots.

---

## 2. Prerequisites

Before starting deployment, ensure you have:
1. An active **AWS Account** with permissions to launch EC2 instances and configure Security Groups.
2. A registered **Domain Name** (optional for initial IP smoke testing, but required for production HTTPS).
3. API credentials:
   - **Google Gemini API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **Groq API Key**: [Groq Console](https://console.groq.com/keys)
4. SSH key pair (`.pem` file) created in your AWS region.
5. Local Git client and SSH terminal.

---

## 3. Required & Optional Environment Variables

| Variable | Requirement | Purpose | Example |
| :--- | :--- | :--- | :--- |
| `ENV` | **REQUIRED** | Environment mode (triggers strict security checks) | `production` |
| `SECRET_KEY` | **REQUIRED** | JWT signing key (min 32 high-entropy characters) | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GEMINI_API_KEY` | **REQUIRED\*** | Google Gemini API key (literature, PPT, reports) | `AIzaSy...` |
| `GROQ_API_KEY` | **REQUIRED\*** | Groq API key (interactive chat, quick QA, quiz) | `gsk_...` |
| `FRONTEND_URL` | **REQUIRED** | Public application URL (used for CORS & redirect) | `https://researchmind.yourdomain.com` |
| `BACKEND_URL` | **REQUIRED** | Public API URL or domain | `https://researchmind.yourdomain.com` |
| `CORS_ORIGINS` | **REQUIRED** | Comma-separated allowed browser origins | `https://researchmind.yourdomain.com` |
| `ENABLE_DOCS` | Optional | Enable `/docs` and `/openapi.json` | `false` (default in prod) |
| `RATE_LIMIT_PER_MINUTE` | Optional | Rate limit for general API routes | `120` |
| `AUTH_RATE_LIMIT_PER_MINUTE`| Optional | Rate limit for auth/OTP routes | `10` |
| `SMTP_HOST` | Optional | SMTP mail host for live email OTP verification | `smtp.gmail.com` |
| `SMTP_PORT` | Optional | SMTP port | `587` |
| `SMTP_USER` | Optional | SMTP email username | `noreply@yourdomain.com` |
| `SMTP_PASSWORD` | Optional | SMTP password or 16-char Google App Password | `your-app-password` |
| `EMAIL_FROM` | Optional | Sender header for email OTPs | `ResearchMind AI <noreply@yourdomain.com>` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret | `GOCSPX-...` |

*\* At least one AI provider (Gemini or Groq) must be configured.*

---

## 4. How to Prepare a Production `.env` File

On your EC2 instance, create `/opt/researchmind/.env` by copying the template:

```bash
# Copy template
cp .env.example .env

# Generate a cryptographically secure 64-character SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# Edit .env with your favorite editor
nano .env

# Lock down permissions so only root and the application can read it
chmod 600 .env
```

---

## 5. How to Install Docker on Ubuntu 24.04 LTS

If not using the automated cloud-init script (`aws/ec2-user-data.sh`), execute the following on a clean Ubuntu 24.04 instance:

```bash
# 1. Update apt repositories
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg git ufw jq

# 2. Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine and Compose plugin
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Enable and start Docker service
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
```

Log out and back in to apply group changes: `exit` and reconnect via SSH.

---

## 6. How to Configure AWS EC2

### Recommended Instance Specifications
- **Instance Type**: `t3.large` (2 vCPU, 8 GB RAM) or `c6i.large` (compute-optimized).
  - *Minimum*: `t3.medium` (2 vCPU, 4 GB RAM) with 2GB swapfile enabled.
- **Root Storage**: 30 GB to 50 GB General Purpose SSD (gp3).
- **Operating System**: Ubuntu Server 24.04 LTS (HVM), SSD Volume Type.
- **IAM Role**: Attach an IAM role with `AmazonS3FullAccess` (scoped to your backup bucket) if using automated S3 backups.

### Enabling Swap Space (Recommended for t3.medium)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 7. How to Configure the AWS Security Group

Create an AWS Security Group named `researchmind-prod-sg` with the following inbound rules:

| Type | Protocol | Port Range | Source | Justification |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP | `22` | `YOUR_OFFICE_OR_HOME_IP/32` | Administrative access only. **Never allow 0.0.0.0/0**. |
| **HTTP** | TCP | `80` | `0.0.0.0/0` | Public web traffic & Let's Encrypt validation. |
| **HTTPS**| TCP | `443`| `0.0.0.0/0` | Secure public web traffic. |

**Outbound Rules**:
- Allow All Traffic (`0.0.0.0/0`) to allow the backend to query Gemini (`generativelanguage.googleapis.com`) and Groq (`api.groq.com`).

**DO NOT** add port `8000` to the Security Group. Port 8000 is internal only.

---

## 8. How to Transfer the Project to EC2

### Option A: Using Git (Recommended)
```bash
# Clone directly onto your server into /opt/researchmind
sudo mkdir -p /opt/researchmind
sudo chown ubuntu:ubuntu /opt/researchmind
git clone https://github.com/namanpatel7018-ux/NEW-RESEARCH-MIND-AI.git /opt/researchmind
cd /opt/researchmind
```

### Option B: Using Rsync / SCP from your local machine
```bash
rsync -avz --exclude '.git' --exclude 'node_modules' --exclude '.venv' \
  -e "ssh -i /path/to/key.pem" \
  ./ ubuntu@<EC2_PUBLIC_IP>:/opt/researchmind/
```

---

## 9. How to Build and Start the Containers

Once `.env` is configured in `/opt/researchmind`:

```bash
cd /opt/researchmind

# 1. Validate Docker Compose configuration
docker compose -f docker-compose.prod.yml config

# 2. Build production images
docker compose -f docker-compose.prod.yml build --pull

# 3. Start services in detached mode
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 4. Verify running containers
docker compose -f docker-compose.prod.yml ps
```

---

## 10. How to Verify Deployment Health

Run the automated rollout script:
```bash
bash aws/deploy.sh
```

Or verify manually:
```bash
# 1. Check frontend HTTP response
curl -I http://localhost/

# 2. Check health endpoint through Nginx proxy
curl -s http://localhost/health

# Expected response:
# {"status":"healthy","message":"ResearchMind AI is running", ...}

# 3. Check container health status
docker inspect --format='{{.State.Health.Status}}' researchmind-backend
docker inspect --format='{{.State.Health.Status}}' researchmind-frontend
```

---

## 11. How to Access the Application

- **Initial HTTP Smoke Test**: Open `http://<EC2_PUBLIC_IP>/` in your browser.
- **Production Domain**: Open `https://<YOUR_DOMAIN>/`.

---

## 12. How to Configure a Custom Domain and HTTPS (Let's Encrypt)

### Step 1: Point DNS to EC2 Public IP
In your DNS provider (e.g., Route 53, Cloudflare, Namecheap):
- Create an `A` record pointing `researchmind.yourdomain.com` to your EC2 Public IPv4 address.
- Verify propagation: `dig +short researchmind.yourdomain.com`.

### Step 2: Install Certbot on EC2
```bash
sudo apt-get install -y certbot
```

### Step 3: Obtain Certificate using Webroot or Standalone Mode
```bash
# Temporarily stop the frontend container to free port 80
docker compose -f docker-compose.prod.yml stop frontend

# Run Certbot standalone
sudo certbot certonly --standalone -d researchmind.yourdomain.com --agree-tos -m admin@yourdomain.com --non-interactive

# Restart frontend
docker compose -f docker-compose.prod.yml start frontend
```

### Step 4: Apply SSL Configuration in Nginx
Use the provided `frontend/nginx.ssl.conf.template`:
```bash
# Generate SSL config with your real domain
export DOMAIN="researchmind.yourdomain.com"
envsubst '${DOMAIN}' < frontend/nginx.ssl.conf.template > frontend/nginx.ssl.conf

# Mount certificates and new config in docker-compose.prod.yml or reload Nginx
```

---

## 13. How to Inspect Logs

```bash
# View combined live tail
docker compose -f docker-compose.prod.yml logs -f --tail=100

# View backend only
docker compose -f docker-compose.prod.yml logs -f backend

# View frontend (Nginx access and error logs)
docker compose -f docker-compose.prod.yml logs -f frontend

# Inspect disk usage of Docker logs
sudo du -sh /var/lib/docker/containers/*/*-json.log
```

---

## 14. How to Restart Services

```bash
# Restart entire stack gracefully
docker compose -f docker-compose.prod.yml restart

# Restart backend only
docker compose -f docker-compose.prod.yml restart backend

# Stop stack completely
docker compose -f docker-compose.prod.yml down

# Start stack
docker compose -f docker-compose.prod.yml up -d
```

---

## 15. How to Update the Application

```bash
cd /opt/researchmind

# 1. Pull latest code
git pull origin main

# 2. Run automated zero-downtime deploy script
bash aws/deploy.sh
```

---

## 16. How to Roll Back a Deployment

If an update fails:
```bash
# 1. Check Git history
git log --oneline -n 5

# 2. Revert to previous working commit
git checkout <PREVIOUS_COMMIT_HASH>

# 3. Rebuild and restart
bash aws/deploy.sh
```

---

## 17. How to Back Up and Restore Persistent Data

### Run Automated Backup
```bash
# Creates an atomic snapshot of SQLite, Qdrant vectors, auth store, and uploads
bash aws/backup.sh
```
Backups are saved to `/opt/researchmind/backups/researchmind_backup_<TIMESTAMP>.tar.gz`.

### Schedule Daily Backups (Cron)
```bash
sudo crontab -e
# Add the following line to run backup every midnight:
0 0 * * * /bin/bash /opt/researchmind/aws/backup.sh >> /var/log/researchmind_backup.log 2>&1
```

### Restore from Backup
```bash
bash aws/restore.sh /opt/researchmind/backups/researchmind_backup_20261030_120000.tar.gz
```

---

## 18. How to Rotate Credentials

1. **Google Gemini API Key**:
   - Generate a new key in [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Update `GEMINI_API_KEY` in `/opt/researchmind/.env`.
   - Run: `docker compose -f docker-compose.prod.yml up -d backend`.
   - Revoke the old key in Google AI Studio.

2. **Groq API Key**:
   - Generate a new key in [Groq Console](https://console.groq.com/keys).
   - Update `GROQ_API_KEY` in `/opt/researchmind/.env`.
   - Run: `docker compose -f docker-compose.prod.yml up -d backend`.
   - Revoke the old key.

3. **Application SECRET_KEY**:
   - Generate a new key: `python3 -c "import secrets; print(secrets.token_hex(32))"`.
   - Update `SECRET_KEY` in `.env`.
   - Run: `docker compose -f docker-compose.prod.yml up -d backend`.
   - *Note: Rotating `SECRET_KEY` invalidates active user JWT sessions; users will need to re-login.*

---

## 19. Common Deployment Errors and Solutions

| Error | Root Cause | Solution |
| :--- | :--- | :--- |
| `failed to connect to backend:8000` (HTTP 502) | Backend container crashed or still starting up | Check backend logs: `docker compose -f docker-compose.prod.yml logs backend`. Verify health check status. |
| `Production security validation failed: SECRET_KEY must be configured` | `SECRET_KEY` missing or using default dev key | Generate a 64-char key and set `SECRET_KEY` in `.env`. |
| `CORS error in browser` | Public domain not listed in `CORS_ORIGINS` | Add `https://yourdomain.com` to `CORS_ORIGINS` in `.env` and restart backend. |
| `413 Request Entity Too Large` | Uploaded document exceeds 100MB limit | Keep uploads under 100MB or adjust `client_max_body_size` in `nginx.conf` and `MAX_UPLOAD_SIZE` in `documents.py`. |
| `sqlite3.OperationalError: database is locked` | Concurrent write lock contention | ResearchMind uses WAL mode. Ensure `backend_data` volume is on fast local SSD (gp3) and avoid network NFS mounts for SQLite. |
| `Permission denied` on `/app/data` | Docker volume owned by different UID | Backend runs as UID 1000 (`appuser`). Verify permissions: `docker compose -f docker-compose.prod.yml exec -T backend ls -ld /app/data`. |

---

## 20. AWS Cost and Instance-Sizing Considerations

| Component | Recommended Tier | Estimated Monthly Cost (us-east-1) |
| :--- | :--- | :--- |
| **EC2 Compute** | `t3.large` (2 vCPU, 8 GB RAM) | ~$60 / month |
| **Alternative (Budget)** | `t3.medium` (2 vCPU, 4 GB RAM) | ~$30 / month |
| **EBS Storage** | 40 GB gp3 SSD (3000 IOPS, 125 MB/s) | ~$3.20 / month |
| **Data Transfer** | Outbound Internet egress (10 GB) | ~$0.90 / month |
| **Total Estimated Cost** | — | **~$35 - $65 / month** |

*Tips to reduce costs*:
- Use an **AWS Savings Plan** or **1-Year Reserved Instance** for a 35-40% discount on EC2 compute.
- Use `t3.medium` with a 2 GB swapfile if concurrent traffic is low (1-5 active researchers).
