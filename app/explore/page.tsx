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
  Zap,
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
}

export default function ExplorePage() {
  const [query, setQuery] = useState("langchain-ai/langgraph");
  const [directory, setDirectory] = useState<DirectoryPerson[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExploreData | null>(null);
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    fetch("/api/people")
      .then((r) => r.json())
      .then((d) => setDirectory(Array.isArray(d.people) ? d.people : []))
      .catch(() => setDirectory([]));
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q.length >= 1 ? directory.filter((p) => p.handle.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) : directory;
    return pool.slice(0, 6);
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
    rowRefs.current[handle]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#050811", overflow: "hidden" }}>
      {/* Compact header: back, title, search — everything in one row */}
      <header
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "0.65rem 1rem",
          borderBottom: "1px solid #1e293b",
          background: "#0b0f19",
        }}
      >
        <Link href="/" style={{ color: "#9ca3af", display: "flex", alignItems: "center", gap: "0.3rem", textDecoration: "none", fontSize: "0.85rem", flexShrink: 0 }}>
          <ArrowLeft size={15} />
        </Link>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runQuery(query);
          }}
          style={{ position: "relative", flex: 1, maxWidth: "420px" }}
        >
          <Search size={14} color="#6b7280" style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            style={{
              width: "100%",
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: "7px",
              color: "#f3f4f6",
              padding: "0.45rem 0.7rem 0.45rem 2rem",
              fontSize: "0.85rem",
              outline: "none",
            }}
            placeholder="Search a handle or project…"
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

          {showSuggestions && suggestions.length > 0 && (
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
              {suggestions.map((p) => (
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
                    padding: "0.5rem 0.8rem",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid #1f2937",
                    color: "#f3f4f6",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>{p.name}</span>
                  <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>@{p.handle}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        <button
          type="button"
          onClick={() => runQuery(query)}
          disabled={loading}
          style={{
            background: "#00ed64",
            border: "none",
            color: "#001e00",
            fontWeight: 700,
            padding: "0.45rem 0.9rem",
            borderRadius: "7px",
            cursor: "pointer",
            fontSize: "0.82rem",
            flexShrink: 0,
          }}
        >
          {loading ? <Loader2 size={14} className="spinner" /> : "Search"}
        </button>

        <button
          type="button"
          onClick={() => runQuery("offline")}
          title="Use offline demo data"
          style={{
            background: "transparent",
            border: "1px dashed #334155",
            color: "#64748b",
            padding: "0.4rem 0.55rem",
            borderRadius: "7px",
            cursor: "pointer",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Zap size={14} />
        </button>
      </header>

      {error && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(239,68,68,0.1)",
            borderBottom: "1px solid #ef4444",
            color: "#fca5a5",
            padding: "0.5rem 1rem",
            fontSize: "0.8rem",
          }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Main area: graph dominates, compact sidebar carries the answer */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* GRAPH — the main event */}
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          {loading && !data ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" }}>
              <Loader2 size={22} className="spinner" style={{ marginRight: "0.5rem" }} /> Querying the graph…
            </div>
          ) : data ? (
            <KnowledgeGraph
              target={data.target}
              candidates={data.candidates}
              chosenHandle={data.chosenHandle}
              height="100%"
              onNodeClick={handleGraphNodeClick}
            />
          ) : null}
        </div>

        {/* SIDEBAR — compact, the "why" behind the graph */}
        {data && (
          <aside
            style={{
              width: "340px",
              flexShrink: 0,
              borderLeft: "1px solid #1e293b",
              background: "#0b0f19",
              overflowY: "auto",
              padding: "1rem",
            }}
          >
            {/* Target */}
            <div style={{ marginBottom: "0.9rem" }}>
              <div style={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Exploring</div>
              <Link href={`/${data.target.handle}`} style={{ color: "#ffffff", fontWeight: 700, fontSize: "1rem", textDecoration: "none" }}>
                {data.target.name}
              </Link>
              <div style={{ color: "#6b7280", fontSize: "0.78rem" }}>@{data.target.handle}</div>
            </div>

            {/* Narration */}
            <div
              style={{
                background: "rgba(0,237,100,0.06)",
                border: "1px solid rgba(0,237,100,0.3)",
                borderRadius: "8px",
                padding: "0.75rem 0.85rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#00ed64", fontSize: "0.68rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                <Sparkles size={12} /> AI INTRODUCTION{data.degraded ? " · OFFLINE" : ""}
              </div>
              <p style={{ color: "#e5e7eb", fontSize: "0.83rem", lineHeight: 1.45, margin: 0 }}>{data.narration}</p>
            </div>

            {/* Ranked matches — compact rows */}
            <div style={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Ranked matches ({data.candidates.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {data.candidates.map((c, idx) => {
                const isChosen = c.handle.toLowerCase() === data.chosenHandle?.toLowerCase();
                const isSelected = selectedHandle === c.handle;
                return (
                  <Link
                    key={c.handle}
                    href={`/${c.handle}`}
                    ref={(el) => {
                      rowRefs.current[c.handle] = el;
                    }}
                    style={{
                      display: "block",
                      background: "#111827",
                      border: `1px solid ${isSelected ? "#00ed64" : isChosen ? "rgba(0,237,100,0.4)" : "#374151"}`,
                      borderRadius: "8px",
                      padding: "0.55rem 0.7rem",
                      textDecoration: "none",
                      transition: "border-color 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
                        <span style={{ color: "#6b7280", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>#{idx + 1}</span>
                        <span style={{ color: "#f3f4f6", fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.name}
                        </span>
                        {isChosen && <Sparkles size={11} color="#00ed64" style={{ flexShrink: 0 }} />}
                      </div>
                      {c.evidenceRepo && (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.15rem", color: "#fbbf24", fontSize: "0.7rem", flexShrink: 0 }}>
                          <ExternalLink size={10} />
                        </span>
                      )}
                    </div>
                    {c.reason && (
                      <div style={{ color: "#60a5fa", fontSize: "0.72rem", marginTop: "0.2rem" }}>
                        {c.reason.replace(/^(topic|ai|stack|role|lang):/, "")}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
