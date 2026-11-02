// Typed API client — reads VITE_API_BASE_URL, attaches JWT from localStorage.
// All requests go through the single `request()` helper.

// ── Validate env at module load time ─────────────────────────────────────────
// Fail loudly so misconfiguration is caught immediately, not silently routed
// to the Vite dev server (which would produce confusing 404s from the wrong host).
const _rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (!_rawBase) {
  throw new Error(
    "[apiClient] VITE_API_BASE_URL is not set.\n" +
    "Create frontend/.env.local with:\n" +
    "  VITE_API_BASE_URL=http://localhost:3000\n" +
    "then restart the Vite dev server."
  );
}

// Strip trailing slash once so `${BASE}/api/...` never produces a double-slash.
const BASE = _rawBase.replace(/\/$/, "");

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body != null
      ? JSON.stringify(body)
      : undefined,
  });

  if (!res.ok) {
    const errObj = await res.json().catch(() => ({ message: res.statusText }));
    const error = new Error(errObj.message ?? `HTTP ${res.status}`);
    (error as any).status = res.status;
    throw error;
  }

  // 202 / 204 — no body
  if (res.status === 202 || res.status === 204) {
    return { status: res.status } as T;
  }

  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    request<AuthResponse>("POST", "/api/auth/register", { email, password, name }),

  login: (email: string, password: string) =>
    request<AuthResponse>("POST", "/api/auth/login", { email, password }),

  me: () => request<User>("GET", "/api/auth/me"),
};

// ── Resumes ─────────────────────────────────────────────────────────────────

export interface Resume {
  id: string;
  filename: string;
  createdAt: string;
}

export const resumeApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Resume>("POST", "/api/resumes", form, true);
  },
};

// ── Job Postings ─────────────────────────────────────────────────────────────

export interface JobPosting {
  id: string;
  jobRole: string;
  jobDescription: string;
}

export const jobPostingApi = {
  create: (jobRole: string, jobDescription: string) =>
    request<JobPosting>("POST", "/api/job-postings", { jobRole, jobDescription }),
};

// ── Sessions ─────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  vapiAssistantId: string;
  rubricName: string;
  status: "pending" | "active" | "completed" | "scored";
  createdAt: string;
  jobPosting?: JobPosting;
}

export interface Score {
  status: number; // 202 while pending
  technicalAccuracy?: number;
  communication?: number;
  confidence?: number;
  reasoning?: {
    technicalAccuracy: string;
    communication: string;
    confidence: string;
  };
  improvementTips?: string[];
  transcript?: string;
}

export const sessionApi = {
  create: (jobPostingId: string, resumeId: string) =>
    request<Session>("POST", "/api/sessions", { jobPostingId, resumeId }),

  get: (id: string) => request<Session>("GET", `/api/sessions/${id}`),

  getScore: (id: string) => request<Score>("GET", `/api/sessions/${id}/score`),
};

// ── User ─────────────────────────────────────────────────────────────────────

export interface SessionHistoryItem {
  id: string;
  createdAt: string;
  status: string;
  jobPosting: { jobRole: string };
  score?: { technicalAccuracy: number; communication: number; confidence: number };
}

export interface RoadmapItem {
  topic: string;
  priority: "high" | "medium" | "low";
  description: string;
}

export const userApi = {
  history: async () => {
    const res = await request<{ sessions: SessionHistoryItem[] }>("GET", "/api/users/me/history");
    return res.sessions;
  },
  roadmap: async () => {
    try {
      const res = await request<{ focusAreas: RoadmapItem[] }>("GET", "/api/users/me/roadmap");
      return res.focusAreas;
    } catch (err: any) {
      if (err.status === 404 || err.message?.includes("404") || err.message?.includes("NotFound")) {
        return [];
      }
      throw err;
    }
  },
};
