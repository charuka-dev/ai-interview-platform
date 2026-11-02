# AI Interview Platform — Backend

A production-quality backend for an AI-powered mock interview system. Candidates practice job interviews over voice with an AI interviewer (via Vapi + Gemini Flash), then receive a scored evaluation and improvement roadmap (via Gemini Pro).

## Architecture Overview

```
Candidate → Vapi Web SDK (voice call) → Vapi Cloud
                                           ↓ end-of-call webhook
                                       This Backend
                                           ↓ async
                                       Gemini Pro (scoring)
                                           ↓
                                       PostgreSQL (Score record)
```

| Component | Technology |
|-----------|-----------|
| Framework | Fastify (TypeScript) |
| ORM | Prisma + PostgreSQL |
| Queue | BullMQ + Redis (falls back to in-process for local dev) |
| Auth | JWT + bcrypt |
| Storage | S3-compatible (AWS S3, Cloudflare R2, Supabase Storage) |
| Voice AI | Vapi (Gemini Flash as the interview model) |
| Scoring AI | Google Gemini Pro (post-call, not real-time) |

---

## Prerequisites

- **Node.js** ≥ 20
- **PostgreSQL** (local or remote)
- **Redis** (optional for local dev — see Queue Fallback below)
- API keys: Vapi, Google Gemini, S3-compatible storage

---

## Local Setup

### 1. Clone and install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Fill in all values — especially DATABASE_URL, JWT_SECRET, VAPI_API_KEY, GEMINI_API_KEY
```

### 3. Start infrastructure (PostgreSQL + Redis via Docker)

```bash
docker-compose up -d
# Postgres on localhost:5432, Redis on localhost:6379
```

> If you already have Postgres/Redis running locally, skip this step and update the URLs in `.env`.

### 4. Run database migration

```bash
npm run db:migrate
# Creates all tables. Run this whenever you modify prisma/schema.prisma.
```

### 5. Start the development server

```bash
npm run dev
# Server starts on http://localhost:3000
# Fastify prints all registered routes on startup
```

---

## Queue Fallback (No Redis Required for Local Dev)

The queue system detects whether Redis is available:

| `REDIS_URL` env var | Queue mode | Behaviour |
|---------------------|------------|-----------|
| Set | **BullMQ** (Redis-backed) | Jobs persist across restarts, retried on failure |
| Not set | **In-process** | Jobs run as `setImmediate()` callbacks in the same Node process |

To run without Redis, simply remove or comment out `REDIS_URL` in your `.env` file. The server will warn at startup and use the in-process fallback automatically.

> ⚠️ The in-process queue is NOT suitable for production. Jobs are lost if the process restarts.

---

## API Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register with email + password |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✓ | Get current user |

### Resumes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/resumes` | ✓ | Upload PDF/DOCX resume (multipart) |
| GET | `/api/resumes/:id` | ✓ | Get resume + short-lived signed download URL |

### Job Postings
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/job-postings` | ✓ | Create job role + description |
| GET | `/api/job-postings/:id` | ✓ | Get job posting |

### Sessions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/sessions` | ✓ | Create session → get `vapiAssistantId` for frontend |
| GET | `/api/sessions/:id` | ✓ | Get session status |
| GET | `/api/sessions/:id/score` | ✓ | Poll for score (202 while processing) |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/me/history` | ✓ | Past sessions + score trends |
| GET | `/api/users/me/roadmap` | ✓ | Latest improvement roadmap |

### Webhooks
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/webhooks/vapi` | HMAC | Receive Vapi end-of-call events |

---

## Session Flow (Frontend Integration)

```
1. POST /api/sessions → get { sessionId, vapiAssistantId }
2. Frontend: vapi.start({ assistantId })   ← Vapi Web SDK
3. Candidate completes interview
4. Vapi sends end-of-call-report to /api/webhooks/vapi
5. Backend enqueues scoring job (responds 200 immediately)
6. Background worker scores via Gemini Pro (takes 5-30s)
7. Frontend polls GET /api/sessions/:id/score until 200
```

---

## Rubric System

Domain rubrics live in `src/rubrics/` as JSON files. Each rubric contains:
- **`core_topics`** — areas the AI should probe during the interview
- **`scoring_weights`** — how much each dimension counts toward the final score
- **`red_flags`** — indicators of a weak candidate (penalise in scoring)
- **`calibration_examples`** — expected score ranges for strong vs weak answers
- **`suggested_questions`** — starting questions for the interview

### Adding a New Rubric

1. Create `src/rubrics/your-role-name.json` using `backend-python.json` as a template
2. The `RubricService` fuzzy-matches job role names to rubric files automatically
3. Unrecognised roles fall back to `generic.json`

---

## Security Notes

- **Passwords** hashed with bcrypt (cost factor 12 by default)
- **Vapi webhooks** verified with HMAC-SHA256 — unsigned requests are rejected
- **Resume/recording files** stored in private S3 buckets; only short-lived signed URLs are returned to the frontend
- **API keys** (Vapi, Gemini, S3) never transmitted to the frontend
- **Rate limiting** on session creation and resume upload endpoints

---

## Available Scripts

```bash
npm run dev          # Start dev server with hot reload (tsx watch)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled server
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:push      # Push schema without migration (prototyping only)
```

---

## Project Structure

```
backend/
├── src/
│   ├── app.ts                   # Fastify app factory
│   ├── server.ts                # Entry point
│   ├── routes/                  # Route handlers (auth, resumes, sessions, etc.)
│   ├── services/
│   │   ├── vapiService.ts       # Vapi REST API (assistant creation)
│   │   ├── geminiService.ts     # Gemini Flash (parsing) + Pro (scoring)
│   │   ├── rubricService.ts     # Rubric loading, fuzzy match, prompt building
│   │   ├── resumeParserService.ts # PDF/DOCX text extraction + structuring
│   │   ├── storageService.ts    # S3-compatible upload + presigned URLs
│   │   └── roadmapService.ts    # Improvement roadmap generation
│   ├── queue/
│   │   ├── index.ts             # Queue factory (BullMQ vs in-process)
│   │   ├── bullmqQueue.ts       # Redis-backed queue implementation
│   │   ├── inProcessQueue.ts    # Dev fallback (no Redis)
│   │   └── scoringWorker.ts     # Scoring job handler
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification (swappable for Clerk/Auth0)
│   │   └── errorHandler.ts      # Centralized error handling
│   ├── rubrics/                 # JSON rubric files per job category
│   └── prisma/client.ts         # Singleton Prisma client
├── prisma/schema.prisma
├── docker-compose.yml
├── .env.example
└── package.json
```
