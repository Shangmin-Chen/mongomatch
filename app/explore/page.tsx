"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  ExternalLink,
  Code,
  User,
  Compass,
  Cpu,
} from "lucide-react";

import heroFallbackData from "@/lib/hero-fallback.json";
import KnowledgeGraph, { GraphNode, GraphLink } from "@/components/KnowledgeGraph";

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
  "mongodbtesthelix",
  "mongodbtestollama",
  "mongodbtestpgvector",
  "mongodbtestripgrep",
  "hwchase17/langchain",
  "offline",
];

export default function ExplorePage() {
  const router = useRouter();
  const [handleInput, setHandleInput] = useState("mongodbtesthelix");
  const [loading, setLoading] = useState(false);
  const [exploreData, setExploreData] = useState<ExploreData | null>(heroFallbackData as ExploreData);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  // Responsive window resize listener
  useEffect(() => {
    const updateDimensions = () => {
      if (typeof window !== "undefined") {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const loadGraph = async (handle: string) => {
    if (!handle.trim()) return;
    const clean = handle.trim().toLowerCase();

    // Break-glass offline demo trigger: bypasses fetch entirely
    if (clean === "offline" || clean === "demo") {
      setExploreData(heroFallbackData as ExploreData);
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
      setExploreData(data);
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
    loadGraph("mongodbtesthelix");
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadGraph(handleInput);
  };

  // Construct Force Graph Node/Link Data
  const buildGraphData = (): { nodes: GraphNode[]; links: GraphLink[] } => {
    if (!exploreData || !exploreData.target) {
      return { nodes: [], links: [] };
    }

    const { target, candidates, chosenHandle } = exploreData;
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const tagSet = new Set<string>();

    // 1. Target Node
    nodes.push({
      id: target.handle,
      handle: target.handle,
      name: target.name || target.handle,
      type: "you",
      isChosen: true,
    });

    const chosenCandidate = candidates.find(
      (c) => c.handle.toLowerCase() === chosenHandle.toLowerCase()
    );

    // 2. Candidate Nodes & Tag Connections
    candidates.forEach((candidate) => {
      const isChosen = candidate.handle.toLowerCase() === chosenHandle.toLowerCase();

      nodes.push({
        id: candidate.handle,
        handle: candidate.handle,
        name: candidate.name || candidate.handle,
        type: "match",
        isChosen,
        reason: candidate.reason,
      });

      // Tags shared with target
      const shared = candidate.sharedTags || [];
      shared.forEach((tag) => {
        const tagId = `tag:${tag}`;
        const isPathTag = isChosen && (candidate.reason === tag || shared.length === 1);

        if (!tagSet.has(tagId)) {
          tagSet.add(tagId);
          nodes.push({
            id: tagId,
            name: `#${tag}`,
            type: "tag",
            isChosen: isPathTag,
          });

          // Link from Target to Tag
          links.push({
            source: target.handle,
            target: tagId,
            isChosen: isPathTag,
          });
        }

        // Link from Tag to Candidate
        links.push({
          source: tagId,
          target: candidate.handle,
          isChosen: isPathTag,
        });
      });
    });

    // 3. One Repo Node for the Chosen Candidate
    if (chosenCandidate?.evidenceRepo) {
      const repoId = `repo:${chosenCandidate.evidenceRepo.name}`;
      nodes.push({
        id: repoId,
        name: chosenCandidate.evidenceRepo.name,
        type: "repo",
        url: chosenCandidate.evidenceRepo.url,
        isChosen: true,
      });

      links.push({
        source: chosenCandidate.handle,
        target: repoId,
        isChosen: true,
      });
    }

    return { nodes, links };
  };

  const { nodes, links } = buildGraphData();
  const chosenCandidate = exploreData?.candidates.find(
    (c) => c.handle.toLowerCase() === exploreData?.chosenHandle.toLowerCase()
  );

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
      {/* 2D Force Graph Canvas Layer */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}>
        {nodes.length > 0 && (
          <KnowledgeGraph
            nodes={nodes}
            links={links}
            width={dimensions.width}
            height={dimensions.height}
            interactive={true}
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
          maxWidth: "760px",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {/* Navigation & Controls Container */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(51, 65, 85, 0.8)",
            borderRadius: "12px",
            padding: "0.75rem 1rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.6)",
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
                color: "#94a3b8",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.85rem",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={15} /> Back
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#ffffff", fontWeight: 700, fontSize: "0.95rem" }}>
              <Compass size={18} color="#00ed64" /> MongoMatch Live Graph
            </div>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: "1 1 240px", maxWidth: "340px" }}
          >
            <input
              type="text"
              placeholder="Search handle (e.g. mongodbtesthelix)..."
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              style={{
                flex: 1,
                background: "#0b0f19",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#f8fafc",
                padding: "0.4rem 0.65rem",
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
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.82rem",
              }}
            >
              <Search size={14} />
              {loading ? "..." : "Traverse"}
            </button>
          </form>
        </div>

        {/* Quick-Pick Handle Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
          {SAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setHandleInput(chip);
                loadGraph(chip);
              }}
              style={{
                background: "rgba(15, 23, 42, 0.75)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(51, 65, 85, 0.7)",
                color: chip === "offline" ? "#00ed64" : "#cbd5e1",
                fontSize: "0.75rem",
                padding: "0.2rem 0.6rem",
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
            top: "7rem",
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
      {exploreData && (
        <div
          style={{
            position: "absolute",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            width: "90%",
            maxWidth: "760px",
            background: "rgba(11, 15, 25, 0.92)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(0, 237, 100, 0.35)",
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
            boxShadow: "0 20px 35px -10px rgba(0, 0, 0, 0.8)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  background: "rgba(0, 237, 100, 0.12)",
                  border: "1px solid rgba(0, 237, 100, 0.3)",
                  color: "#00ed64",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.55rem",
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
                  <User size={14} color="#00ed64" /> {chosenCandidate.name} (@{chosenCandidate.handle})
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
              Target: <strong style={{ color: "#00ed64" }}>@{exploreData.target.handle}</strong> &middot; Evaluated {exploreData.candidates.length} graph candidates
            </span>
            <span style={{ color: "#00ed64" }}>✦ Click node to view profile</span>
          </div>
        </div>
      )}
    </div>
  );
}
