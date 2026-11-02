# AI Interview Platform

A full-stack platform that runs **real-time, voice-based mock interviews** with an AI interviewer, personalized to a candidate's resume, target job role, and job description. After each interview, it generates a structured score with written feedback.

> Built for the IEEE Young Protégé Program.

<!-- Add a demo GIF or screenshot of the live interview screen here -->
<!-- ![Demo](docs/demo.gif) -->

## What it does

1. The candidate enters a **job role**, **job description**, and uploads a **CV**.
2. The backend parses the CV, matches the role to a domain-specific **rubric**, and creates a personalized voice assistant.
3. The candidate has a **live voice interview**. It starts with a self-introduction, then interleaves behavioral and technical questions tailored to their background.
4. When the call ends, a webhook captures the transcript and recording.
5. A background worker scores the interview with a reasoning-tier LLM, returning **technical accuracy, communication, and confidence** scores with reasoning and improvement tips.

## Key features

- **Two-model AI pipeline:** a low-latency LLM for live conversation and a separate, stronger LLM for post-interview evaluation.
- **Rubric-driven prompt engineering:** 10+ IT job-role rubrics (backend, frontend, full-stack, mobile, DevOps, cloud, data, ML, QA, security, DBA) plus a shared behavioral question bank.
- **Job-role classification:** alias mapping and stopword-filtered fuzzy matching routes messy real-world job titles to the right rubric (44% → 92% match accuracy on a 25-title test set).
- **Webhook-driven async scoring:** BullMQ job queue (with an in-process fallback for local development).
- **Audio-reactive interview UI:** animated orb driven by live volume levels, with captions, mute, and end-call controls.

## Architecture

![Architecture](docs/architecture.png)

![Sequence diagram](docs/sequence.png)

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Fastify, TypeScript |
| Frontend | React, Vite, React Router, Tailwind CSS, Framer Motion |
| Database | PostgreSQL (Prisma ORM) |
| Queue | Redis + BullMQ |
| Storage | S3-compatible (MinIO locally) |
| Voice AI | Vapi (STT / TTS / turn-taking) |
| LLMs | Google Gemini (Flash-tier live, Pro-tier scoring) |
| Auth | JWT + bcrypt |
| Infra | Docker Compose |

## Getting started

### Prerequisites

Node.js 18+, Docker Desktop, a [Vapi](https://vapi.ai) account, a Google Gemini API key, and [ngrok](https://ngrok.com) (so Vapi can reach your local webhook).

### Backend

```bash
cd backend
docker compose up -d            # Postgres, Redis, MinIO
npm install
cp .env.example .env            # fill in your keys
npx prisma generate
npx prisma migrate dev
npm run dev                     # http://localhost:3000
```

Expose the webhook for Vapi:

```bash
ngrok http 3000
```

Set `PUBLIC_SERVER_URL` in `backend/.env` to the ngrok HTTPS URL, and configure the same URL plus `/api/webhooks/vapi` and your webhook token in the Vapi dashboard.

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set VITE_API_BASE_URL and VITE_VAPI_PUBLIC_KEY
npm run dev                        # http://localhost:5173
```

## Configuration

| Variable | Purpose |
|---|---|
| `VAPI_API_KEY` | Vapi private key (backend only) |
| `VAPI_WEBHOOK_SECRET` | Bearer token Vapi sends to the webhook |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_FLASH_MODEL` | Model for live interviews (via Vapi) |
| `GEMINI_PRO_MODEL` | Model for post-call scoring |
| `PUBLIC_SERVER_URL` | Public HTTPS URL for webhooks |
| `VITE_VAPI_PUBLIC_KEY` | Vapi public key (frontend) |

Model identifiers change often; check the provider's current model list if a call returns a "model not found" error.

## Project structure

```
backend/    Fastify API, rubric engine, Vapi + Gemini services, scoring worker
frontend/   React SPA: auth, dashboard, live interview screen, results
docs/       Architecture and sequence diagrams
```

## Limitations and roadmap

- Runs locally; production deployment is planned (Cloudflare Pages for the frontend, Railway/Render/Fly.io for the backend).
- Recruiter dashboard is not yet implemented.
- Planned: automated test suite, richer analytics across sessions.

## Author

**R.B. Charuka Lakshan** — Software Engineering undergraduate, NIBM
