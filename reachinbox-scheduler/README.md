# 📬 ReachInbox Email Scheduler

An enterprise-grade, distributed outbound email scheduling system with **precision timing**, **atomic rate limiting**, **concurrency control**, and **guaranteed delivery**.

---

## 🌟 Features

- ⏱️ **Precision Staggered Scheduling**: Queue hundreds or thousands of emails with configurable delays (e.g., 2 seconds apart) and scheduled start times.
- 🛡️ **Atomic Rate Limiting**: Redis Lua-backed distributed rate limiter preventing race conditions across multiple worker processes (e.g. max 100 emails/hour/sender).
- 🔒 **Idempotency & Concurrency**: Compare-and-swap database claims (`UPDATE ... WHERE status = 'SCHEDULED'`) and deterministic BullMQ job IDs ensure no duplicate email is ever sent.
- 🔁 **Resilience & Automatic Rescheduling**: Jobs that hit hourly rate limits are automatically recalculated and rescheduled to the next available hour window. Transient delivery errors trigger exponential backoff retries.
- 📧 **Ethereal SMTP Integration**: Real email dispatch with live Ethereal web preview URLs. Includes automatic test account generation when credentials are not configured.
- ⚡ **Interactive Modern Dashboard**:
  - Real-time status cards (Scheduled, Processing, Sent, Failed).
  - Dual-mode recipient entry: CSV file upload or manual paste.
  - Live auto-refresh and manual refresh.
  - One-click job cancellation for pending scheduled emails.
  - Instant demo authentication mode for rapid evaluation.
- 🐳 **Containerized & Production-Ready**: Multi-stage Dockerfiles, Nginx reverse proxy, and full-stack `docker-compose.yml`.

---

## 🏗️ System Architecture

```
                                  +-----------------------+
                                  |   React 19 + Tailwind |
                                  |   (Nginx Web Server)  |
                                  +-----------+-----------+
                                              |
                                     /api/*   |  HTTP / JWT
                                              v
                                  +-----------+-----------+
                                  |    Express API Server |
                                  |   (Node 20 + TS)      |
                                  +-----+-----------+-----+
                                        |           |
            Transactional State & Logs  |           | Enqueue Delayed Jobs
                                        v           v
                          +-------------+--+     +--+-------------+
                          |   PostgreSQL   |     |     Redis      |
                          |   (Prisma ORM) |     |  BullMQ Queue  |
                          +----------------+     +--------+-------+
                                                          |
                                      Atomic Claim & Pop  |
                                                          v
                                                 +--------+-------+
                                                 | BullMQ Worker  |
                                                 | (Concurrency 5)|
                                                 +--------+-------+
                                                          |
                                             SMTP Send    | (STARTTLS)
                                                          v
                                                 +--------+-------+
                                                 | Ethereal Email |
                                                 | (Preview URL)  |
                                                 +----------------+
```

---

## 🚀 Quick Start with Docker (Recommended)

Run the entire application (Database, Redis, API, Worker, Frontend) with a single command:

```bash
# 1. Clone the repository
git clone <repository_url>
cd reachinbox-scheduler

# 2. Copy environment variables
cp .env.example .env

# 3. Launch the complete stack
docker compose up -d --build
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **API Health Endpoint**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

*(Note: Click "⚡ Continue as Demo User" on the login screen to test immediately without configuring Google OAuth).*

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 20+
- Docker (for PostgreSQL and Redis)

### 2. Start Infrastructure
```bash
docker compose up -d postgres redis
```

### 3. Backend Setup
```bash
cd backend

# Copy environment variables
cp .env.example .env

# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Start backend development server (with embedded worker)
npm run dev
```
Backend runs at `http://localhost:5000`.

### 4. Frontend Setup
```bash
cd ../frontend

# Copy environment variables
cp .env.example .env

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## 🧪 Testing & Verification

Comprehensive unit tests validate the core scheduling math, rate limiting windows, recipient deduplication, and concurrency safety:

```bash
# Run backend tests (Vitest)
cd backend
npm run test

# Run backend typecheck / lint
npm run lint

# Run frontend typecheck / lint
cd ../frontend
npm run lint
```

---

## 📡 API Reference

### Authentication
- `POST /api/auth/google` — Sign in with Google ID token credential.
- `POST /api/auth/demo` — Instant demo sign-in for testing/evaluation.
- `GET /api/auth/me` — Retrieve authenticated user profile.
- `POST /api/auth/logout` — Clear session cookie.

### Email Scheduling
- `POST /api/emails/schedule` — Schedule email campaign.
  ```json
  {
    "subject": "Product Announcement",
    "body": "<p>Hello from ReachInbox!</p>",
    "recipients": ["alice@example.com", "bob@example.com"],
    "startTime": "2026-09-15T10:00:00.000Z",
    "delayBetweenEmails": 2000,
    "hourlyLimit": 100
  }
  ```
- `GET /api/emails/scheduled?page=1&limit=20` — Paginated list of scheduled/pending emails.
- `GET /api/emails/sent?page=1&limit=20` — Paginated list of sent & failed emails with preview URLs.
- `GET /api/emails/stats` — Real-time counts: `scheduled`, `processing`, `sent`, `failed`.
- `GET /api/emails/:id` — Get job details.
- `POST /api/emails/:id/cancel` — Cancel a pending scheduled email.
- `GET /api/health` — System health check (PostgreSQL + Redis status).

---

## 🚢 Cloud Deployment

Detailed step-by-step instructions for deploying to **Render**, **Railway**, **Vercel**, and **Linux VPS** are available in [DEPLOYMENT.md](./DEPLOYMENT.md).
