"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowLeft, GitBranch, User } from "lucide-react";

export default function ProfileLookupPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [project, setProject] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cleanInput = (val: string) => {
    let s = val.trim();
    s = s.replace(/^https?:\/\//i, "");
    s = s.replace(/^www\./i, "");
    s = s.replace(/^github\.com\//i, "");
    s = s.replace(/^@/, "");
    s = s.split("?")[0].split("#")[0].trim();
    return s;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawClean = cleanInput(handle);
    if (!rawClean) {
      setError("Please enter a GitHub handle.");
      return;
    }

    // If user typed owner/repo directly in the handle input
    const parts = rawClean.split("/").filter(Boolean);
    let targetPath = "";

    if (parts.length >= 2) {
      targetPath = `/${parts[0]}/${parts[1]}`;
    } else {
      const cleanProj = cleanInput(project);
      if (cleanProj) {
        targetPath = `/${parts[0]}/${cleanProj}`;
      } else {
        targetPath = `/${parts[0]}`;
      }
    }

    router.push(targetPath);
  };

  return (
    <main className="wrapper" style={{ maxWidth: "480px", padding: "2rem 1rem" }}>
      {/* Top back navigation */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/" style={{ color: "#9ca3af", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <ArrowLeft size={14} /> Back to Home
        </Link>
      </div>

      <h1 className="title" style={{ fontSize: "1.75rem", marginBottom: "0.4rem" }}>
        Search Attendee Profile
      </h1>
      <p className="subtitle" style={{ fontSize: "0.95rem", marginBottom: "1.5rem" }}>
        Enter a GitHub username and optional project to view their knowledge graph matches.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* GitHub Handle */}
        <div className="form-group">
          <label htmlFor="handle-input" className="label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <User size={15} color="#00ed64" /> GitHub Handle <span style={{ color: "#00ed64" }}>*</span>
          </label>
          <input
            id="handle-input"
            type="text"
            className="input"
            placeholder="e.g. torvalds or mongodbtesthelix"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </div>

        {/* Optional Project Name */}
        <div className="form-group">
          <label htmlFor="project-input" className="label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <GitBranch size={15} color="#00ed64" /> Project Name (Optional)
          </label>
          <input
            id="project-input"
            type="text"
            className="input"
            placeholder="e.g. linux or ripgrep"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        {error && <div className="error-text">{error}</div>}

        <button type="submit" className="btn-submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <Search size={18} />
          <span>View Profile & Matches</span>
        </button>
      </form>
    </main>
  );
}
