"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Code,
  Tag,
  Sparkles,
  RefreshCw,
  Share2,
  Check,
  ArrowLeft,
  Mail,
  User,
  GitBranch,
  UserCheck,
  Star,
} from "lucide-react";

interface RepoDoc {
  name: string;
  url: string;
  description: string;
  language: string | null;
  topics: string[];
  stars: number;
  pushedAt: string;
}

interface MatchDoc {
  handle: string;
  name: string;
  email: string;
  githubUrl?: string;
  sharedTags: string[];
  reason: string;
  evidenceRepo?: RepoDoc | null;
  path?: any[];
  score?: number;
}

interface PersonDoc {
  _id: string;
  name: string;
  description: string;
  email: string;
  github?: string | null;
  githubUrl?: string | null;
  handle: string;
  enriched?: boolean;
  enrichedAt?: string;
  enrichError?: string;
  tags?: string[];
  repos?: RepoDoc[];
  createdAt?: string;
  updatedAt?: string;
}

export default function AttendeeDetailPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug || [];
  const pathString = slug.join("/");

  const [person, setPerson] = useState<PersonDoc | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [matches, setMatches] = useState<MatchDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchPerson = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/person/${pathString}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPerson(data.person);
        setPosition(typeof data.position === "number" ? data.position : null);
        setTotal(typeof data.total === "number" ? data.total : null);
        setMatches(Array.isArray(data.matches) ? data.matches : []);
        setNotFound(false);
      }
    } catch (err) {
      console.error("Error fetching attendee:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPerson();
  }, [pathString]);

  const copyUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <main className="wrapper" style={{ textAlign: "center", paddingTop: "3rem" }}>
        <div className="spinner" style={{ margin: "0 auto 1rem", width: "32px", height: "32px" }} />
        <p style={{ color: "#9ca3af" }}>Loading attendee profile from MongoDB Atlas...</p>
      </main>
    );
  }

  if (notFound || !person) {
    return (
      <main className="wrapper" style={{ textAlign: "center", paddingTop: "3rem" }}>
        <h1 className="title" style={{ fontSize: "1.5rem" }}>Attendee Not Found</h1>
        <p className="subtitle">No registration found in MongoDB for &ldquo;{pathString}&rdquo;.</p>
        <Link href="/form" className="btn-submit" style={{ textDecoration: "none", display: "inline-flex", width: "auto" }}>
          <ArrowLeft size={16} /> Register at /form
        </Link>
      </main>
    );
  }

  const tags = person.tags || [];
  const repos = person.repos || [];

  return (
    <main className="wrapper" style={{ maxWidth: "560px" }}>
      {/* Top action bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <Link href="/" style={{ color: "#9ca3af", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <ArrowLeft size={14} /> Back to Home
        </Link>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => fetchPerson(true)}
            style={{
              background: "#1f2937",
              border: "1px solid #374151",
              color: "#f3f4f6",
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              fontSize: "0.8rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <RefreshCw size={12} className={refreshing ? "spinner" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={copyUrl}
            style={{
              background: "#1f2937",
              border: "1px solid #374151",
              color: "#f3f4f6",
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              fontSize: "0.8rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            {copied ? <Check size={12} color="#00ed64" /> : <Share2 size={12} />}
            {copied ? "Copied!" : "Share URL"}
          </button>
        </div>
      </div>

      {/* Join counter */}
      {position !== null && total !== null && (
        <div
          style={{
            textAlign: "center",
            padding: "0.65rem",
            marginBottom: "1.25rem",
            background: "rgba(0, 237, 100, 0.08)",
            border: "1px solid rgba(0, 237, 100, 0.25)",
            borderRadius: "8px",
            color: "#00ed64",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          You&apos;re #{position} of {total} so far — reload later as more people join.
        </div>
      )}

      {/* Main Profile Card */}
      <div
        style={{
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: "10px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(0, 237, 100, 0.15)",
              border: "2px solid #00ed64",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#00ed64",
              fontWeight: 700,
              fontSize: "1.2rem",
            }}
          >
            {person.name ? person.name.charAt(0).toUpperCase() : <User size={20} />}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", lineHeight: 1.2 }}>
              {person.name}
            </h1>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.35rem", fontSize: "0.85rem" }}>
              <span style={{ color: "#9ca3af", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Mail size={13} color="#00ed64" /> {person.email}
              </span>
              
              {person.github && (
                <a
                  href={person.githubUrl || `https://github.com/${person.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#00ed64",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    textDecoration: "none",
                  }}
                >
                  <GitBranch size={13} /> github.com/{person.github} <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* What they're building / stuck on */}
        <div
          style={{
            background: "#0b0f19",
            border: "1px solid #1f2937",
            borderRadius: "6px",
            padding: "0.85rem 1rem",
            marginTop: "1rem",
            borderLeft: "3px solid #00ed64",
          }}
        >
          <div style={{ fontSize: "0.78rem", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.25rem" }}>
            What I&apos;m building / need unblocking on:
          </div>
          <div style={{ color: "#f3f4f6", fontSize: "0.95rem", lineHeight: 1.45 }}>
            {person.description}
          </div>
        </div>
      </div>

      {/* TOP UNBLOCKER MATCHES SECTION (PLAN_4) */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <UserCheck size={18} color="#00ed64" /> Top People to Unblock You
        </h2>

        {!person.enriched ? (
          <div style={{ background: "#111827", border: "1px dashed #374151", borderRadius: "8px", padding: "1.25rem", textAlign: "center", color: "#9ca3af", fontSize: "0.9rem" }}>
            ⏳ Reading your GitHub profile... matches will compute once indexed.
          </div>
        ) : matches.length === 0 ? (
          <div style={{ background: "#111827", border: "1px dashed #374151", borderRadius: "8px", padding: "1.25rem", textAlign: "center", color: "#9ca3af", fontSize: "0.9rem" }}>
            No matches yet — check back as more people join.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {matches.map((m, idx) => {
              // Strip prefix for display (e.g. "stack:rust" -> "rust", "ai:llm" -> "llm")
              const cleanReason = m.reason ? m.reason.replace(/^(topic|ai|stack|role|lang):/, "") : "Domain Match";

              return (
                <div
                  key={m.handle || idx}
                  style={{
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "10px",
                    padding: "1.1rem 1.25rem",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#ffffff" }}>
                          {m.name}
                        </h3>
                        <Link
                          href={`/${m.handle}`}
                          style={{
                            fontSize: "0.8rem",
                            color: "#9ca3af",
                            textDecoration: "none",
                          }}
                        >
                          @{m.handle}
                        </Link>
                      </div>

                      <div style={{ fontSize: "0.82rem", color: "#00ed64", display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.2rem" }}>
                        <Mail size={12} /> {m.email}
                      </div>
                    </div>

                    {/* Shared Reason Badge */}
                    <span
                      style={{
                        background: "rgba(0, 237, 100, 0.12)",
                        border: "1px solid rgba(0, 237, 100, 0.3)",
                        color: "#00ed64",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        padding: "0.2rem 0.55rem",
                        borderRadius: "9999px",
                        textTransform: "capitalize",
                      }}
                    >
                      {cleanReason}
                    </span>
                  </div>

                  {/* Evidence Repo Proof */}
                  {m.evidenceRepo && (
                    <div
                      style={{
                        marginTop: "0.6rem",
                        padding: "0.6rem 0.75rem",
                        background: "#0b0f19",
                        border: "1px solid #1f2937",
                        borderRadius: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <a
                          href={m.evidenceRepo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#00ed64",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            textDecoration: "none",
                          }}
                        >
                          <Code size={13} /> {m.evidenceRepo.name} <ExternalLink size={11} />
                        </a>

                        {typeof m.evidenceRepo.stars === "number" && m.evidenceRepo.stars > 0 && (
                          <span style={{ fontSize: "0.75rem", color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                            <Star size={11} fill="#fbbf24" /> {m.evidenceRepo.stars}
                          </span>
                        )}
                      </div>

                      {m.evidenceRepo.description && (
                        <p style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: "0.25rem", lineHeight: 1.35 }}>
                          {m.evidenceRepo.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Graph Tags Section */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Tag size={16} color="#00ed64" /> Derived Knowledge Graph Tags ({tags.length})
        </h2>

        {tags.length === 0 ? (
          <div style={{ background: "#111827", border: "1px dashed #374151", borderRadius: "8px", padding: "1rem", textAlign: "center", color: "#9ca3af", fontSize: "0.88rem" }}>
            {person.enriched ? "No exact tags generated yet." : "⏳ Graph tags will appear once the enrichment worker runs."}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {tags.map((tag) => {
              let bg = "#1f2937";
              let color = "#e5e7eb";
              let border = "#374151";

              if (tag.startsWith("ai:")) {
                bg = "rgba(0, 237, 100, 0.1)";
                color = "#00ed64";
                border = "rgba(0, 237, 100, 0.3)";
              } else if (tag.startsWith("stack:")) {
                bg = "rgba(59, 130, 246, 0.1)";
                color = "#60a5fa";
                border = "rgba(59, 130, 246, 0.3)";
              } else if (tag.startsWith("lang:")) {
                bg = "rgba(168, 85, 247, 0.1)";
                color = "#c084fc";
                border = "rgba(168, 85, 247, 0.3)";
              }

              return (
                <span
                  key={tag}
                  style={{
                    background: bg,
                    color: color,
                    border: `1px solid ${border}`,
                    borderRadius: "9999px",
                    padding: "0.25rem 0.65rem",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                  }}
                >
                  #{tag}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Repositories Section */}
      {repos.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Code size={16} color="#00ed64" /> Indexed Repositories ({repos.length})
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {repos.map((repo) => (
              <div
                key={repo.name}
                style={{
                  background: "#111827",
                  border: "1px solid #1f2937",
                  borderRadius: "8px",
                  padding: "0.85rem 1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#00ed64",
                      fontWeight: 600,
                      fontSize: "0.92rem",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    {repo.name} <ExternalLink size={12} />
                  </a>

                  {repo.language && (
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af", background: "#1f2937", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                      {repo.language}
                    </span>
                  )}
                </div>

                {repo.description && (
                  <p style={{ fontSize: "0.82rem", color: "#9ca3af", marginTop: "0.35rem", lineHeight: 1.35 }}>
                    {repo.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Graph Notice */}
      <div
        style={{
          textAlign: "center",
          padding: "1rem",
          background: "rgba(0, 237, 100, 0.05)",
          border: "1px dashed rgba(0, 237, 100, 0.2)",
          borderRadius: "8px",
          color: "#9ca3af",
          fontSize: "0.82rem",
        }}
      >
        <Sparkles size={14} color="#00ed64" style={{ display: "inline", verticalAlign: "middle", marginRight: "0.3rem" }} />
        Bookmark this URL: matches and graph unblockers will automatically populate as more attendees join.
      </div>
    </main>
  );
}
