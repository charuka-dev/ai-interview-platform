interface PageLoaderProps {
  message?: string;
}

export default function PageLoader({ message = "Loading…" }: PageLoaderProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", minHeight: 320, gap: "1rem",
    }}>
      <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p style={{ fontSize: "0.9rem", color: "var(--text-2)" }}>{message}</p>
    </div>
  );
}

export function FullPageLoader({ message }: PageLoaderProps) {
  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)",
    }}>
      <PageLoader message={message} />
    </div>
  );
}

/** Skeleton shimmer block */
export function Skeleton({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)",
      backgroundSize: "400% 100%",
      animation: "shimmer 1.4s ease infinite",
      borderRadius: 8,
      ...style,
    }} />
  );
}
