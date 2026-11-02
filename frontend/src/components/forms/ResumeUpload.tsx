import { useState } from "react";
import type { ChangeEvent } from "react";
import { Upload, File, X } from "lucide-react";

interface ResumeUploadProps {
  onFile: (file: File) => void;
  file: File | null;
}

export default function ResumeUpload({ onFile, file }: ResumeUploadProps) {
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) onFile(picked);
  }

  if (file) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: "0.875rem",
        padding: "0.875rem 1rem", borderRadius: 8,
        background: "var(--accent-dim)", border: "1px solid var(--accent-ring)",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <File size={16} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: "0.125rem" }}>
            {(file.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFile(null as unknown as File)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", display: "flex", padding: "0.25rem" }}
          aria-label="Remove file"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <label
      htmlFor="resume-upload"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: "0.75rem", padding: "2rem",
        borderRadius: 8, border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-md)"}`,
        background: dragOver ? "var(--accent-dim)" : "var(--surface-1)",
        cursor: "pointer", transition: "all 0.15s", textAlign: "center",
      }}
    >
      <input id="resume-upload" type="file" accept=".pdf,.docx,.doc" style={{ display: "none" }} onChange={handleChange} />
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: "var(--surface-3)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)",
      }}>
        <Upload size={18} />
      </div>
      <div>
        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-1)" }}>
          Drop your resume or <span style={{ color: "#a5b4fc" }}>browse</span>
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--text-3)", marginTop: "0.25rem" }}>PDF or DOCX, up to 10 MB</p>
      </div>
    </label>
  );
}
