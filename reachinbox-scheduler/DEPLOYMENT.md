# 🚀 ReachInbox Email Scheduler — Deployment Guide

This guide provides end-to-end instructions for deploying the **ReachInbox Email Scheduler** across multiple platforms:
1. [Option 1: Single-Command Docker Compose (Local or VPS)](#option-1-docker-compose-recommended-for-vps--local)
2. [Option 2: Cloud PaaS (Render / Railway)](#option-2-render--railway-cloud-deployment)
3. [Option 3: Hybrid Deployment (Vercel Frontend + Render/Railway Backend)](#option-3-hybrid-deployment-vercel--cloud-backend)
4. [Environment Variables Reference](#environment-variables-reference)
5. [Database Migrations & Verification](#database-migrations--troubleshooting)

---

## Architecture Overview

```
[ Frontend (React SPA / Nginx) ]
             |
             v  /api/*
[ Backend API Server (Express) ] <---> [ BullMQ Queue Worker ]
       |                  |                      |
       v                  v                      v
[ PostgreSQL ]       [ Redis ]           [ Ethereal SMTP ]
(Source of truth)   (Delay + Rate Limit) (Delivery & Previews)
```

---

## Option 1: Docker Compose (Recommended for VPS / Local)

Deploy the entire stack (PostgreSQL, Redis, Backend API & Worker, Frontend Nginx) in a single command.

### Prerequisites
- Docker (v20+) & Docker Compose installed.

### Steps

1. **Clone the Repository & Navigate to Project**:
   ```bash
   git clone <repository_url>
   cd reachinbox-scheduler
   ```

2. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   *(Optional)* Edit `.env` to customize passwords, ports, or your Google OAuth credentials.

3. **Start All Services**:
   ```bash
   docker compose up -d --build
   ```

4. **Verify Running Containers**:
   ```bash
   docker compose ps
   ```
   You will see:
   - `reachinbox-postgres`: Port 5432 (healthy)
   - `reachinbox-redis`: Port 6379 (healthy)
   - `reachinbox-backend`: Port 5000 (running migrations, API, and worker)
   - `reachinbox-frontend`: Port 3000 (serving UI & proxying `/api`)

5. **Access Application**:
   - **Web App**: Open [http://localhost:3000](http://localhost:3000)
   - **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
   - **Log Streaming**:
     ```bash
     docker compose logs -f backend
     ```

6. **Stop Services**:
   ```bash
   docker compose down
   ```

---

## Option 2: Render / Railway (Cloud Deployment)

### Deploying on Render

1. **Using Blueprint (`render.yaml`)**:
   - Push your code to GitHub.
   - Go to [dashboard.render.com](https://dashboard.render.com/) -> **Blueprints** -> **New Blueprint Instance**.
   - Connect this repository. Render will automatically detect `render.yaml` and provision:
     - 1 PostgreSQL database (`reachinbox-postgres`)
     - 1 Redis instance (`reachinbox-redis`)
     - 1 Node.js Web Service (`reachinbox-backend`)
     - 1 Static Site (`reachinbox-frontend`)
   - Fill in your `FRONTEND_URL` on the backend and `VITE_API_URL` on the frontend.
   - Click **Apply**.

2. **Manual Setup on Render**:
   - **PostgreSQL**: Create a Managed PostgreSQL on Render. Copy the Internal Database URL.
   - **Redis**: Create a Managed Redis instance on Render. Copy the Internal Redis URL.
   - **Backend Web Service**:
     - Root Directory: `backend`
     - Build Command: `npm ci && npx prisma generate && npm run build`
     - Start Command: `npx prisma migrate deploy && npm start`
     - Add Environment Variables (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `FRONTEND_URL`).
   - **Frontend Static Site**:
     - Root Directory: `frontend`
     - Build Command: `npm ci && npm run build`
     - Publish Directory: `dist`
     - Add Rewrite Rule: `/*` -> `/index.html`
     - Environment Variable: `VITE_API_URL=https://<your-backend-service>.onrender.com/api`.

---

## Option 3: Hybrid Deployment (Vercel + Cloud Backend)

### 1. Deploy Backend (Railway / Render / Fly.io)
Deploy the backend following Option 2 or using Railway:
- Set up PostgreSQL and Redis.
- Deploy `backend/`.
- Run migrations: `npx prisma migrate deploy`.
- Note your backend URL (e.g. `https://api.yourdomain.com`).

### 2. Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com/) -> **Add New Project**.
2. Select your repository and set Root Directory to `frontend`.
3. Add Environment Variables:
   - `VITE_API_URL`: `https://api.yourdomain.com/api`
   - `VITE_GOOGLE_CLIENT_ID`: `<your-google-client-id>` (if using Google OAuth)
4. Deploy!

---

## Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `PORT` | Backend HTTP port | `5000` |
| `NODE_ENV` | Application environment | `production` or `development` |
| `JWT_SECRET` | Secret key for signing session tokens | Secure random string (32+ chars) |
| `JWT_EXPIRES_IN` | Session token validity duration | `7d` |
| `FRONTEND_URL` | URL of frontend for CORS allowlist | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Secret key from Google Console |
| `ETHEREAL_USER` | Ethereal SMTP username *(optional)* | Auto-generated if left blank |
| `ETHEREAL_PASSWORD` | Ethereal SMTP password *(optional)* | Auto-generated if left blank |
| `WORKER_CONCURRENCY` | Number of simultaneous email sends | `5` |
| `MAX_EMAILS_PER_HOUR` | Max rate limit per sender per hour | `100` |
| `MIN_EMAIL_DELAY_MS` | Minimum gap between consecutive emails | `2000` (2 seconds) |
| `EMAIL_RETRY_ATTEMPTS` | Retries on transient delivery failure | `3` |
| `EMAIL_RETRY_BACKOFF_MS` | Exponential backoff delay | `5000` |

---

## Database Migrations & Troubleshooting

### Running Migrations Manually
If you want to apply migrations directly from your local terminal or CI/CD:
```bash
cd backend
npx prisma migrate deploy
```

### Inspect Database with Prisma Studio
```bash
cd backend
npx prisma studio
```
Opens interactive UI at `http://localhost:5555`.

### Health Check Endpoint
To verify database and Redis connectivity in production:
```bash
curl http://localhost:5000/api/health
```
Response:
```json
{
  "success": true,
  "data": {
    "api": "ok",
    "database": "ok",
    "redis": "ok",
    "timestamp": "2026-09-15T14:30:00.000Z"
  }
}
```
