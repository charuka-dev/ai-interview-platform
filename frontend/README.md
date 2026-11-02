# InterviewAI — Frontend

React + Vite + TypeScript + Tailwind CSS frontend for the AI Interview Platform.

## Prerequisites

- Node.js 18+
- The backend running on `http://localhost:3000` (see `../backend/`)

## Setup

```bash
# 1. Install deps (already done if you ran npm install)
npm install

# 2. Create your local env file
cp .env.local.example .env.local

# 3. Fill in your values in .env.local:
#    VITE_API_BASE_URL=http://localhost:3000
#    VITE_VAPI_PUBLIC_KEY=<your key from https://dashboard.vapi.ai/>

# 4. Start the dev server
npm run dev
```

The app will be at **http://localhost:5173**.

The Vite dev server proxies `/api/*` requests to the backend at `VITE_API_BASE_URL`, so CORS is not an issue during development.

## Validate the SiriOrb first

Before testing the full call flow, visit:

```
http://localhost:5173/orb-preview
```

This is a public route (no auth needed) where you can:
- Drag the **volume** slider to see all 5 blob layers react in real time
- Switch between all 4 **status** modes (idle, connecting, AI speaking, user speaking)
- Resize the orb with the **size** slider

Check browser DevTools → Performance tab to confirm 60fps.

## Folder structure

```
src/
├── routes/          # One file per page
├── components/
│   ├── voice/       # SiriOrb, CallControls, CaptionOverlay
│   ├── forms/       # ResumeUpload
│   └── dashboard/   # SessionHistoryCard, RoadmapCard
├── lib/             # apiClient, vapiClient, authContext
└── routes.tsx       # Centralised path constants
```

## Environment variables

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (e.g. `http://localhost:3000`) |
| `VITE_VAPI_PUBLIC_KEY` | Vapi public key from your Vapi dashboard |
