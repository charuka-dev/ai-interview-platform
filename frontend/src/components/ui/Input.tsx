import { type InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  suffix?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, suffix, className = "", type, id, ...props }, ref) => {
    const [showPw, setShowPw] = useState(false);
    const isPassword = type === "password";
    const resolvedType = isPassword ? (showPw ? "text" : "password") : type;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-2)" }}>
            {label}
          </label>
        )}
        <div style={{ position: "relative" }}>
          <input
            ref={ref}
            id={id}
            type={resolvedType}
            className={`input-base ${error ? "error" : ""} ${className}`}
            style={isPassword || suffix ? { paddingRight: "2.75rem" } : {}}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
              style={{
                position: "absolute", right: "0.75rem", top: "50%",
                transform: "translateY(-50%)", color: "var(--text-3)",
                background: "none", border: "none", cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center",
              }}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {suffix && !isPassword && (
            <div style={{
              position: "absolute", right: "0.75rem", top: "50%",
              transform: "translateY(-50%)", color: "var(--text-3)",
              pointerEvents: "none",
            }}>
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p style={{ fontSize: "0.8125rem", color: "var(--danger)" }} role="alert">{error}</p>
        )}
        {hint && !error && (
          <p style={{ fontSize: "0.8125rem", color: "var(--text-3)" }}>{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
export default Input;
