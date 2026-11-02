import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* ── Desktop sidebar (always visible ≥1024px) ── */}
      <div className="hidden-mobile" style={{ display: "contents" }}>
        <Sidebar />
      </div>

      {/* ── Mobile sidebar + overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
                zIndex: 49, display: "block",
              }}
            />
            <motion.div
              key="sidebar"
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{ position: "fixed", top: 0, left: 0, zIndex: 50, height: "100vh" }}
            >
              <Sidebar isOpen onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="main-content">
        {/* Mobile top bar */}
        <header style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0 1rem", height: 52,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-1)",
          flexShrink: 0,
        }}
          className="lg-hidden"
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-2)", display: "flex", alignItems: "center",
            }}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-1)" }}>
            InterviewAI
          </span>
        </header>

        {/* Page content */}
        <div className="page-scroll">
          <Outlet />
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .lg-hidden { display: none !important; }
        }
        @media (max-width: 1023px) {
          /* The aside.sidebar is positioned fixed via .sidebar class */
        }
      `}</style>
    </div>
  );
}
