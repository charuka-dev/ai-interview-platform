import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "./lib/authContext";
import ProtectedRoute from "./ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import LoginPage          from "./routes/LoginPage";
import RegisterPage       from "./routes/RegisterPage";
import OrbPreviewPage     from "./routes/OrbPreviewPage";
import DashboardPage      from "./routes/DashboardPage";
import NewInterviewPage   from "./routes/NewInterviewPage";
import InterviewCallPage  from "./routes/InterviewCallPage";
import ResultsPage        from "./routes/ResultsPage";
import InterviewHistoryPage from "./routes/InterviewHistoryPage";
import RoadmapPage        from "./routes/RoadmapPage";
import ProfilePage        from "./routes/ProfilePage";
import { ROUTES } from "./routes";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        style={{ height: "100%" }}
      >
        <Routes location={location}>
          {/* ── Public ── */}
          <Route path={ROUTES.LOGIN}       element={<LoginPage />} />
          <Route path={ROUTES.REGISTER}    element={<RegisterPage />} />
          <Route path={ROUTES.ORB_PREVIEW} element={<OrbPreviewPage />} />

          {/* ── Full-screen call (no sidebar) ── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/interview/:sessionId" element={<InterviewCallPage />} />
          </Route>

          {/* ── Protected + AppShell ── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path={ROUTES.DASHBOARD}     element={<DashboardPage />} />
              <Route path={ROUTES.NEW_INTERVIEW} element={<NewInterviewPage />} />
              <Route path="/results/:sessionId"  element={<ResultsPage />} />
              <Route path={ROUTES.HISTORY}       element={<InterviewHistoryPage />} />
              <Route path={ROUTES.ROADMAP}       element={<RoadmapPage />} />
              <Route path={ROUTES.PROFILE}       element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

import React from 'react';

class GlobalErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <div style={{color: 'red', padding: 50}}>{(this.state.error as Error).message}<br/>{(this.state.error as Error).stack}</div>;
    return this.props.children;
  }
}

export default function App() {
  return (
    <GlobalErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
    </GlobalErrorBoundary>
  );
}
