"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  ExternalLink,
  Code,
  User,
  Compass,
  Cpu,
} from "lucide-react";

import dynamic from "next/dynamic";
import heroFallbackData from "@/lib/hero-fallback.json";

const KnowledgeGraph = dynamic(() => import("@/components/KnowledgeGraph"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", gap: "10px" }}>
      <div className="spinner" style={{ width: "32px", height: "32px" }} />
      <span style={{ fontSize: "14px", fontWeight: 600 }}>Loading Knowledge Graph...</span>
    </div>
  ),
});

interface CandidateDoc {
  handle: string;
  name: string;
  email: string;
  description: string;
  sharedTags: string[];
  reason: string;
  evidenceRepo?: {
    name: string;
    url: string;
    description: string;
    language: string | null;
    stars: number;
  } | null;
  path: any[];
  score: number;
}

interface ExploreData {
  target: {
    handle: string;
    name: string;
    description: string;
    tags: string[];
  };
  candidates: CandidateDoc[];
  chosenHandle: string;
  narration: string;
  degraded: boolean;
}

const SAMPLE_CHIPS = [
  "langchain-ai/langgraph",
  "shangmin-chen/mongomatch",
  "hwchase17/langchain",
  "shadcn/ui",
  "redis/redis",
  "tokio-rs/tokio",
  "qdrant/qdrant",
  "offline",
];

export default function ExplorePage() {
  const [handleInput, setHandleInput] = useState("langchain-ai/langgraph");
  const [loading, setLoading] = useState(false);
  const [exploreData, setExploreData] = useState<ExploreData | null>(heroFallbackData as ExploreData);
  const [error, setError] = useState<string | null>(null);

  const loadGraph = async (handle: string) => {
    if (!handle.trim()) return;
    const clean = handle.trim().toLowerCase();

    // Break-glass offline demo trigger: bypasses fetch entirely
    if (clean === "offline" || clean === "demo") {
      setExploreData(heroFallbackData as ExploreData);
      setHandleInput("mongodbtesthelix");
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: clean }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data: ExploreData = await res.json();
      if (data && data.target) {
        setExploreData(data);
      } else {
        setExploreData(heroFallbackData as ExploreData);
      }
    } catch (err: any) {
      console.error("Explore fetch error, loading offline hero fallback:", err);
      setExploreData(heroFallbackData as ExploreData);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    let initialHandle = "langchain-ai/langgraph";
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlHandle = params.get("handle");
      if (urlHandle && urlHandle.trim()) {
        initialHandle = urlHandle.trim();
        setHandleInput(initialHandle);
      }
    }
    loadGraph(initialHandle);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadGraph(handleInput);
  };

  const chosenCandidate = exploreData?.candidates?.find(
    (c) => c?.handle?.toLowerCase() === exploreData?.chosenHandle?.toLowerCase()
  ) || exploreData?.candidates?.[0];

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#050811",
      }}
    >
      {/* React Flow Knowledge Graph Canvas Layer */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}>
        {exploreData && exploreData.target && (
          <KnowledgeGraph
            target={exploreData.target}
            candidates={exploreData.candidates || []}
            chosenHandle={exploreData.chosenHandle}
            height="100%"
          />
        )}
      </div>

      {/* TOP OVERLAY BAR */}
      <div
        style={{
          position: "absolute",
          top: "1.25rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          width: "90%",
          maxWidth: "780px",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {/* Navigation & Controls Container */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(51, 65, 85, 0.8)",
            borderRadius: "14px",
            padding: "0.75rem 1.1rem",
            boxShadow: "0 15px 30px -5px rgba(0, 0, 0, 0.7)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link
              href="/"
              style={{
                color: "#94a3af",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.85rem",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={15} /> Back
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#ffffff", fontWeight: 700, fontSize: "0.95rem" }}>
              <Compass size={18} color="#00ed64" /> MongoMatch Knowledge Graph
            </div>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: "1 1 240px", maxWidth: "360px" }}
          >
            <input
              type="text"
              placeholder="Search handle (e.g. langchain-ai/langgraph)..."
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              style={{
                flex: 1,
                background: "#0b0f19",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#f8fafc",
                padding: "0.45rem 0.75rem",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: "#00ed64",
                border: "none",
                color: "#001e00",
                fontWeight: 700,
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.82rem",
                boxShadow: "0 0 12px rgba(0, 237, 100, 0.4)",
              }}
            >
              <Search size={14} />
              {loading ? "..." : "Traverse"}
            </button>
          </form>
        </div>

        {/* Quick-Pick Handle Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", justifyContent: "center" }}>
          {SAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setHandleInput(chip);
                loadGraph(chip);
              }}
              style={{
                background: "rgba(15, 23, 42, 0.82)",
                backdropFilter: "blur(8px)",
                border: `1px solid ${chip === "offline" ? "rgba(0, 237, 100, 0.5)" : "rgba(51, 65, 85, 0.7)"}`,
                color: chip === "offline" ? "#00ed64" : "#cbd5e1",
                fontSize: "0.75rem",
                padding: "0.25rem 0.7rem",
                borderRadius: "9999px",
                cursor: "pointer",
                fontWeight: chip === "offline" ? 700 : 500,
              }}
            >
              {chip === "offline" ? "⚡ Offline Break-Glass" : `@${chip}`}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            position: "absolute",
            top: "7.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid #ef4444",
            color: "#fca5a5",
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {/* BOTTOM NARRATION OVERLAY */}
      {exploreData && exploreData.target && (
        <div
          style={{
            position: "absolute",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            width: "90%",
            maxWidth: "780px",
            background: "rgba(11, 15, 25, 0.94)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(0, 237, 100, 0.35)",
            borderRadius: "16px",
            padding: "1.25rem 1.5rem",
            boxShadow: "0 25px 40px -10px rgba(0, 0, 0, 0.85)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "rgba(0, 237, 100, 0.15)",
                  border: "1px solid rgba(0, 237, 100, 0.35)",
                  color: "#00ed64",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  padding: "0.2rem 0.6rem",
                  borderRadius: "9999px",
                }}
              >
                <Cpu size={12} /> ONSTAGE AI MATCHMAKER
              </div>

              {chosenCandidate && (
                <Link
                  href={`/${chosenCandidate.handle}`}
                  style={{
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <User size={14} color="#00ed64" /> {chosenCandidate.name || chosenCandidate.handle} (@{chosenCandidate.handle})
                </Link>
              )}
            </div>

            {chosenCandidate?.evidenceRepo && (
              <a
                href={chosenCandidate.evidenceRepo.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#fbbf24",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <Code size={13} /> {chosenCandidate.evidenceRepo.name} <ExternalLink size={11} />
              </a>
            )}
          </div>

          {/* Narration Text */}
          <p style={{ color: "#f8fafc", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
            {exploreData.narration}
          </p>

          {/* Candidate overview count */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", fontSize: "0.75rem", color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: "0.5rem" }}>
            <span>
              Target: <strong style={{ color: "#00ed64" }}>@{exploreData.target?.handle || "attendee"}</strong> &middot; Evaluated {(exploreData.candidates || []).length} candidates
            </span>
            <span style={{ color: "#00ed64", fontWeight: 600 }}>✦ Click any node card to navigate</span>
          </div>
        </div>
      )}
    </div>
  );
}

