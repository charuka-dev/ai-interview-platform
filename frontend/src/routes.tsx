export const ROUTES = {
  LOGIN:         "/login",
  REGISTER:      "/register",
  DASHBOARD:     "/dashboard",
  NEW_INTERVIEW: "/dashboard/new-interview",
  INTERVIEW:     (id: string) => `/interview/${id}`,
  RESULTS:       (id: string) => `/results/${id}`,
  HISTORY:       "/history",
  ROADMAP:       "/roadmap",
  PROFILE:       "/profile",
  ORB_PREVIEW:   "/orb-preview",
} as const;
