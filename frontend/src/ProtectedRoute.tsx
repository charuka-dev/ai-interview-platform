import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./lib/authContext";
import { ROUTES } from "./routes";

/**
 * Wraps all authenticated routes.
 * - While the token is being validated against /api/auth/me, shows nothing
 *   (avoids a flash-redirect to /login on hard refresh).
 * - If no valid token, redirects to /login, preserving the attempted URL
 *   in location state so we can send them back after login if desired.
 */
export default function ProtectedRoute() {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Full-screen dark loader — prevents flash of /login
    return (
      <div className="h-screen w-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
