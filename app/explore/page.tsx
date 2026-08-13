"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  ExternalLink,
  Mail,
  Sparkles,
  Loader2,
  AlertCircle,
  Star,
  Users,
} from "lucide-react";

import heroFallbackData from "@/lib/hero-fallback.json";

const KnowledgeGraph = dynamic(() => import("@/components/KnowledgeGraph"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", fontSize: "0.85rem" }}>
      Loading graph…
    </div>
  ),
});

interface Candidate {
  handle: string;
  name: string;
  email?: string;
  description?: string;
  sharedTags?: string[];
  reason?: string;
  score?: number;
  evidenceRepo?: { name: string; url: string; description?: string; language?: string | null; stars?: number } | null;
}

interface ExploreData {
  target: { handle: string; name: string; description: string; tags: string[] };
  candidates: Candidate[];
  chosenHandle: string;
  narration: string;
  degraded: boolean;
}

interface DirectoryPerson {
  handle: string;
  name: string;
  tags?: string[];
}

const SUGGESTED = ["langchain-ai/langgraph", "shangmin-chen/mongomatch", "qdrant/qdrant", "tokio-rs/tokio"];

export default function ExplorePage() {
  const [query, setQuery] = useState("langchain-ai/langgraph");
  const [directory, setDirectory] = useState<DirectoryPerson[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExploreData | null>(null);
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetch("/api/people")
      .then((r) => r.json())
      .then((d) => setDirectory(Array.isArray(d.people) ? d.people : []))
      .catch(() => setDirectory([]));
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return directory
      .filter((p) => p.handle.toLowerCase().includes(q) || (p.name || "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, directory]);

  const runQuery = async (rawHandle: string) => {
    const handle = rawHandle.trim();
    if (!handle) return;
    setShowSuggestions(false);

    if (handle.toLowerCase() === "offline") {
      setData(heroFallbackData as ExploreData);
      setError(null);
      setSelectedHandle(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const body = await res.json();
      if (!res.ok || !body?.target) {
        throw new Error(body?.error || "No attendee found for that handle.");
      }
      setData(body);
      setSelectedHandle(null);
    } catch (err: any) {
      setError(err?.message || "Couldn't load that query — showing offline demo data instead.");
      setData(heroFallbackData as ExploreData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runQuery("langchain-ai/langgraph");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGraphNodeClick = (handle: string) => {
    if (!data || handle === data.target.handle) return;
    setSelectedHandle(handle);
    cardRefs.current[handle]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <main style={{ maxWidth: "880px", margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/" style={{ color: "#9ca3af", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.3rem", textDecoration: "none" }}>
          <ArrowLeft size={14} /> Back to Home
        </Link>
        <h1 className="title" style={{ fontSize: "1.75rem", marginTop: "0.75rem", marginBottom: "0.35rem" }}>
          Explore the Graph
        </h1>
        <p className="subtitle" style={{ marginBottom: 0 }}>
          Ask who can unblock any project in the room. MongoDB finds the match, one AI call explains why.
        </p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "0.75rem" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runQuery(query);
          }}
          style={{ display: "flex", gap: "0.5rem" }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} color="#6b7280" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: "2.3rem" }}
              placeholder="Type a GitHub handle or project, e.g. tokio-rs/tokio"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <button type="submit" className="btn-submit" disabled={loading} style={{ width: "auto", padding: "0 1.25rem" }}>
            {loading ? <Loader2 size={16} className="spinner" /> : "Search"}
          </button>
        </form>

        {/* Live autocomplete dropdown */}
        {showSuggestions && matches.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 0.35rem)",
              left: 0,
              right: 0,
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: "8px",
              overflow: "hidden",
              zIndex: 30,
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
            }}
          >
            {matches.map((p) => (
              <button
                key={p.handle}
                onMouseDown={() => {
                  setQuery(p.handle);
                  runQuery(p.handle);
                }}
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.55rem 0.85rem",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid #1f2937",
                  color: "#f3f4f6",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>{p.name}</span>
                <span style={{ color: "#6b7280", fontSize: "0.78rem" }}>@{p.handle}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Suggestions + offline demo */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", marginBottom: "2rem" }}>
        <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>Try:</span>
        {SUGGESTED.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQuery(s);
              runQuery(s);
            }}
            style={{
              background: "#161e2e",
              border: "1px solid #374151",
              color: "#cbd5e1",
              fontSize: "0.75rem",
              padding: "0.2rem 0.65rem",
              borderRadius: "9999px",
              cursor: "pointer",
            }}
          >
            @{s}
          </button>
        ))}
        <button
          onClick={() => runQuery("offline")}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "1px dashed #334155",
            color: "#64748b",
            fontSize: "0.75rem",
            padding: "0.2rem 0.65rem",
            borderRadius: "9999px",
            cursor: "pointer",
          }}
        >
          ⚡ Use offline demo data
        </button>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid #ef4444",
            color: "#fca5a5",
            padding: "0.6rem 0.9rem",
            borderRadius: "8px",
            fontSize: "0.85rem",
            marginBottom: "1.5rem",
          }}
        >
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "#6b7280" }}>
          <Loader2 size={24} className="spinner" style={{ margin: "0 auto 0.75rem" }} />
          Querying the graph…
        </div>
      )}

      {data && (
        <>
          {/* Target summary */}
          <div style={{ background: "#111827", border: "1px solid #374151", borderRadius: "10px", padding: "1.1rem 1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.2rem" }}>
                  Querying for
                </div>
                <Link href={`/${data.target.handle}`} style={{ color: "#ffffff", fontSize: "1.15rem", fontWeight: 700, textDecoration: "none" }}>
                  {data.target.name} <span style={{ color: "#6b7280", fontWeight: 500 }}>@{data.target.handle}</span>
                </Link>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  background: "rgba(0,237,100,0.1)",
                  border: "1px solid rgba(0,237,100,0.3)",
                  color: "#00ed64",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.2rem 0.6rem",
                  borderRadius: "9999px",
                }}
              >
                <Users size={12} /> {data.candidates.length} candidates evaluated
              </span>
            </div>
            {data.target.description && (
              <p style={{ color: "#9ca3af", fontSize: "0.88rem", marginTop: "0.6rem", lineHeight: 1.45 }}>{data.target.description}</p>
            )}
          </div>

          {/* AI narration */}
          <div
            style={{
              background: "rgba(0,237,100,0.06)",
              border: "1px solid rgba(0,237,100,0.3)",
              borderRadius: "10px",
              padding: "1.1rem 1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#00ed64", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              <Sparkles size={14} /> AI INTRODUCTION{data.degraded ? " (offline template)" : ""}
            </div>
            <p style={{ color: "#f3f4f6", fontSize: "0.98rem", lineHeight: 1.55, margin: 0 }}>{data.narration}</p>
          </div>

          {/* Graph */}
          <div style={{ marginBottom: "1.75rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#e5e7eb", marginBottom: "0.5rem" }}>
              How MongoDB found this
            </h2>
            <div
              style={{
                height: "380px",
                width: "100%",
                borderRadius: "12px",
                border: "1px solid #334155",
                overflow: "hidden",
              }}
            >
              <KnowledgeGraph
                target={data.target}
                candidates={data.candidates}
                chosenHandle={data.chosenHandle}
                height="100%"
                onNodeClick={handleGraphNodeClick}
              />
            </div>
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.4rem" }}>
              Click a person in the graph to jump to their card below.
            </p>
          </div>

          {/* Ranked matches */}
          <div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#e5e7eb", marginBottom: "0.75rem" }}>
              Ranked matches
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
              {data.candidates.map((c, idx) => {
                const isChosen = c.handle.toLowerCase() === data.chosenHandle?.toLowerCase();
                const isSelected = selectedHandle === c.handle;
                return (
                  <div
                    key={c.handle}
                    ref={(el) => {
                      cardRefs.current[c.handle] = el;
                    }}
                    style={{
                      background: "#111827",
                      border: `1px solid ${isSelected ? "#00ed64" : isChosen ? "rgba(0,237,100,0.4)" : "#374151"}`,
                      borderRadius: "10px",
                      padding: "0.9rem 1.1rem",
                      transition: "border-color 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.6rem", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ color: "#6b7280", fontSize: "0.75rem", fontWeight: 700 }}>#{idx + 1}</span>
                          <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "0.98rem" }}>{c.name}</span>
                          {isChosen && (
                            <span style={{ background: "rgba(0,237,100,0.15)", color: "#00ed64", fontSize: "0.68rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: "9999px" }}>
                              AI PICK
                            </span>
                          )}
                        </div>
                        {c.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#9ca3af", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                            <Mail size={11} /> {c.email}
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/${c.handle}`}
                        style={{ color: "#00ed64", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
                      >
                        View profile →
                      </Link>
                    </div>

                    {c.reason && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <span
                          style={{
                            background: "rgba(59,130,246,0.1)",
                            border: "1px solid rgba(59,130,246,0.3)",
                            color: "#60a5fa",
                            fontSize: "0.75rem",
                            padding: "0.15rem 0.55rem",
                            borderRadius: "9999px",
                          }}
                        >
                          {c.reason.replace(/^(topic|ai|stack|role|lang):/, "")}
                        </span>
                      </div>
                    )}

                    {c.evidenceRepo && (
                      <a
                        href={c.evidenceRepo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: "0.6rem",
                          padding: "0.5rem 0.7rem",
                          background: "#0b0f19",
                          border: "1px solid #1f2937",
                          borderRadius: "6px",
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ color: "#00ed64", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          {c.evidenceRepo.name} <ExternalLink size={11} />
                        </span>
                        {typeof c.evidenceRepo.stars === "number" && c.evidenceRepo.stars > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: "0.2rem", color: "#fbbf24", fontSize: "0.75rem" }}>
                            <Star size={11} fill="#fbbf24" /> {c.evidenceRepo.stars.toLocaleString()}
                          </span>
                        )}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
