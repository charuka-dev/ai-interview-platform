import { motion } from "framer-motion";
import { useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../lib/authContext";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../routes";
import { LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "AI";

  function handleLogout() { logout(); navigate(ROUTES.LOGIN); }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="page-title" style={{ marginBottom: "0.375rem" }}>Profile</h1>
        <p className="page-subtitle" style={{ marginBottom: "2rem" }}>Manage your account information</p>

        {/* Avatar */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.25rem", fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <p style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "1rem" }}>{user?.name}</p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-3)", marginTop: "0.125rem" }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Account Information
            </p>
            <Input id="profile-name"  label="Full Name" type="text"  defaultValue={user?.name}  placeholder="Your name" />
            <Input id="profile-email" label="Email"     type="email" defaultValue={user?.email} placeholder="you@example.com" disabled
              hint="Email cannot be changed" />
          </div>

          <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Change Password
            </p>
            <Input id="profile-pw-current" label="Current Password" type="password" placeholder="••••••••" />
            <Input id="profile-pw-new"     label="New Password"     type="password" placeholder="Min. 8 characters" />
            <Input id="profile-pw-confirm" label="Confirm Password" type="password" placeholder="Repeat new password" />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Button type="submit" loading={false}>
              {saved ? "✓ Saved!" : "Save Changes"}
            </Button>
            {saved && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ fontSize: "0.875rem", color: "var(--success)" }}
              >
                Profile updated
              </motion.p>
            )}
          </div>
        </form>

        {/* Danger zone */}
        <div className="card" style={{ padding: "1.25rem 1.5rem", marginTop: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontWeight: 500, color: "var(--text-1)", fontSize: "0.9rem" }}>Sign out</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-3)", marginTop: "0.125rem" }}>Sign out of your account on this device</p>
          </div>
          <Button variant="danger" icon={<LogOut size={15} />} onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
