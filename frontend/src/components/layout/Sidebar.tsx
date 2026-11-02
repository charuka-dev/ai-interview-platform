import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, PlusCircle, Clock, Map,
  User, LogOut, Mic, ChevronRight, X,
} from "lucide-react";
import { useAuth } from "../../lib/authContext";
import { ROUTES } from "../../routes";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD,     label: "Dashboard",      icon: LayoutDashboard },
  { to: ROUTES.NEW_INTERVIEW, label: "New Interview",   icon: PlusCircle      },
  { to: ROUTES.HISTORY,       label: "My Interviews",   icon: Clock           },
  { to: ROUTES.ROADMAP,       label: "Roadmap",         icon: Map             },
  { to: ROUTES.PROFILE,       label: "Profile",         icon: User            },
];

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate(ROUTES.LOGIN);
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "AI";

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      {/* Header */}
      <div style={{
        padding: "1.25rem 1rem 1rem",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "var(--accent)", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Mic size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-1)", letterSpacing: "-0.01em" }}>
            InterviewAI
          </span>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: "0.25rem" }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "0.75rem 0.625rem", display: "flex", flexDirection: "column", gap: "0.125rem" }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === ROUTES.DASHBOARD}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            onClick={onClose}
          >
            <Icon size={17} />
            {label}
            {to === ROUTES.NEW_INTERVIEW && (
              <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{
        padding: "0.75rem 0.625rem",
        borderTop: "1px solid var(--border)",
        display: "flex", flexDirection: "column", gap: "0.25rem",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.625rem",
          padding: "0.5rem 0.625rem", borderRadius: 8,
          marginBottom: "0.125rem",
        }}>
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem", fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontSize: "0.875rem", fontWeight: 500, color: "var(--text-1)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {user?.name ?? "User"}
            </p>
            <p style={{
              fontSize: "0.75rem", color: "var(--text-3)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {user?.email}
            </p>
          </div>
        </div>

        <button className="nav-item" onClick={handleLogout} style={{ color: "var(--danger)" }}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
