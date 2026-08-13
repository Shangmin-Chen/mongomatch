"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function IntakeFormPage() {
  const router = useRouter();
  const githubInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [github, setGithub] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanHandle = (val: string) => {
    let s = val.trim();
    s = s.replace(/^https?:\/\//i, "");
    s = s.replace(/^www\./i, "");
    s = s.replace(/^github\.com\//i, "");
    s = s.replace(/^@/, "");
    s = s.split("?")[0].split("#")[0].trim();
    const parts = s.split("/").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    if (parts.length === 1) return parts[0];
    return "";
  };

  const handleGithubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.includes("github.com") || raw.includes("http") || raw.startsWith("@")) {
      setGithub(cleanHandle(raw));
    } else {
      setGithub(raw);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sanitizedGithub = cleanHandle(github);
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          email: email.trim(),
          github: sanitizedGithub || null,
        }),
      });

      const data = await res.json();
      if (!res.ok && data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      const targetHandle = data.handle || sanitizedGithub || "attendee";
      router.push(`/me/${targetHandle}`);
    } catch (err: any) {
      setError(err?.message || "Failed to submit. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="wrapper">
      <h1 className="title">MongoMatch</h1>
      <p className="subtitle">Tell us what you&apos;re building. Find who can unblock you.</p>

      <form onSubmit={handleSubmit}>
        {/* Name */}
        <div className="form-group">
          <label htmlFor="name-input" className="label">
            Name <span style={{ color: "#00ed64" }}>*</span>
          </label>
          <input
            id="name-input"
            type="text"
            className="input"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Description / Stuck on */}
        <div className="form-group">
          <label htmlFor="desc-input" className="label">
            What are you building / stuck on? <span style={{ color: "#00ed64" }}>*</span>
          </label>
          <textarea
            id="desc-input"
            className="textarea"
            placeholder="e.g. Building an agent memory layer with MongoDB Atlas. Need tips on vector index tuning."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Email */}
        <div className="form-group">
          <label htmlFor="email-input" className="label">
            Email <span style={{ color: "#00ed64" }}>*</span>
          </label>
          <input
            id="email-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            className="input"
            placeholder="ada@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* GitHub (optional, prefixed input) */}
        <div className="form-group">
          <label className="label">GitHub Repo or Handle (optional)</label>
          <div
            className="github-container"
            onClick={() => githubInputRef.current?.focus()}
          >
            <span className="github-prefix">github.com/</span>
            <input
              ref={githubInputRef}
              type="text"
              className="github-input"
              placeholder="owner/repo or handle"
              value={github}
              onChange={handleGithubChange}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        {/* Submit */}
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" />
              <span>Submitting...</span>
            </>
          ) : (
            <span>Submit</span>
          )}
        </button>
      </form>
    </main>
  );
}
