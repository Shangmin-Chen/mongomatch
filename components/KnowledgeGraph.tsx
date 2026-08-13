"use client";

import { useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { User, Star, ExternalLink } from "lucide-react";
import dagre from "@dagrejs/dagre";

// A small, stable left-to-right graph: target -> shared tag -> match [-> proof repo].
// Deterministic dagre layout (no physics jumble). Clicking a person node never
// navigates by itself — the caller decides what a click means via onNodeClick.

export interface GraphTarget {
  handle: string;
  name: string;
  description?: string;
}

export interface GraphCandidate {
  handle: string;
  name: string;
  email?: string;
  sharedTags?: string[];
  reason?: string;
  score?: number;
  evidenceRepo?: {
    name: string;
    url: string;
    language?: string | null;
    stars?: number;
  } | null;
}

export interface KnowledgeGraphProps {
  target: GraphTarget;
  candidates: GraphCandidate[];
  chosenHandle?: string;
  height?: string | number;
  onNodeClick?: (handle: string) => void;
}

function PersonNode({ data }: { data: any }) {
  const isYou = data.variant === "you";
  const isChosen = data.variant === "chosen";
  const isHighlighted = isYou || isChosen;
  const accent = isHighlighted ? "#00ed64" : "#475569";

  return (
    <div
      style={{
        background: isYou ? "#052210" : isChosen ? "#0a2416" : "#0f172a",
        border: `${isHighlighted ? 2 : 1}px solid ${accent}`,
        borderRadius: "10px",
        padding: isHighlighted ? "0.75rem 0.95rem" : "0.55rem 0.75rem",
        minWidth: isHighlighted ? "190px" : "160px",
        maxWidth: "220px",
        cursor: "pointer",
        boxShadow: isHighlighted ? "0 0 22px rgba(0, 237, 100, 0.35)" : "none",
        opacity: isHighlighted ? 1 : 0.55,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
        <User size={isHighlighted ? 14 : 12} color={accent} />
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.02em" }}>
          {isYou ? "You" : isChosen ? "Top match" : "Match"}
        </span>
      </div>
      <div style={{ color: "#f8fafc", fontWeight: 600, fontSize: isHighlighted ? "0.92rem" : "0.82rem", lineHeight: 1.25 }}>
        {data.name}
      </div>
      <div style={{ color: "#64748b", fontSize: "0.72rem", marginTop: "0.1rem" }}>@{data.handle}</div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

function TagNode({ data }: { data: any }) {
  return (
    <div
      style={{
        background: data.isPathTag ? "#064e3b" : "#0f172a",
        border: `${data.isPathTag ? 2 : 1}px solid ${data.isPathTag ? "#00ed64" : "#334155"}`,
        borderRadius: "9999px",
        padding: data.isPathTag ? "0.4rem 0.85rem" : "0.28rem 0.65rem",
        color: data.isPathTag ? "#a7f3d0" : "#94a3b8",
        fontSize: data.isPathTag ? "0.78rem" : "0.68rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        boxShadow: data.isPathTag ? "0 0 16px rgba(0, 237, 100, 0.3)" : "none",
        opacity: data.isPathTag ? 1 : 0.5,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      {data.label}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

function RepoNode({ data }: { data: any }) {
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="nodrag"
      style={{
        display: "block",
        background: "#451a03",
        border: "1.5px solid #f59e0b",
        borderRadius: "10px",
        padding: "0.55rem 0.75rem",
        minWidth: "160px",
        maxWidth: "200px",
        textDecoration: "none",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#fbbf24", fontSize: "0.7rem", fontWeight: 700, marginBottom: "0.15rem" }}>
        EVIDENCE <ExternalLink size={11} />
      </div>
      <div style={{ color: "#fef3c7", fontSize: "0.82rem", fontWeight: 600 }}>{data.name}</div>
      {typeof data.stars === "number" && data.stars > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", color: "#fbbf24", fontSize: "0.7rem", marginTop: "0.15rem" }}>
          <Star size={10} fill="#fbbf24" /> {data.stars.toLocaleString()}
        </div>
      )}
    </a>
  );
}

const nodeTypes = { personNode: PersonNode, tagNode: TagNode, repoNode: RepoNode };

function layout(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 30, ranksep: 80, marginx: 30, marginy: 30 });

  nodes.forEach((n) => {
    const w = n.type === "tagNode" ? 130 : 210;
    const h = n.type === "tagNode" ? 36 : 80;
    g.setNode(n.id, { width: w, height: h });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));

  try {
    dagre.layout(g);
  } catch {
    // fall through with default positions if dagre chokes on odd input
  }

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return pos ? { ...n, position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 } } : n;
  });
}

export default function KnowledgeGraph({ target, candidates = [], chosenHandle, height = "100%", onNodeClick }: KnowledgeGraphProps) {
  const { nodes: builtNodes, edges: builtEdges } = useMemo(() => {
    if (!target?.handle) return { nodes: [], edges: [] };

    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];
    const tagSeen = new Set<string>();
    const activeChosen = (chosenHandle || candidates[0]?.handle || "").toLowerCase();
    const chosenCandidate = candidates.find((c) => c.handle.toLowerCase() === activeChosen) || candidates[0];

    rawNodes.push({
      id: target.handle,
      type: "personNode",
      data: { handle: target.handle, name: target.name || target.handle, variant: "you" },
      position: { x: 0, y: 0 },
    });

    candidates.forEach((c) => {
      const isChosen = c.handle.toLowerCase() === activeChosen;
      rawNodes.push({
        id: c.handle,
        type: "personNode",
        data: { handle: c.handle, name: c.name || c.handle, variant: isChosen ? "chosen" : "match" },
        position: { x: 0, y: 0 },
      });

      (c.sharedTags || []).forEach((tag) => {
        const tagId = `tag:${tag}`;
        const isPathTag = isChosen && (c.reason === tag || (c.sharedTags || []).length === 1);

        if (!tagSeen.has(tagId)) {
          tagSeen.add(tagId);
          rawNodes.push({ id: tagId, type: "tagNode", data: { label: `#${tag}`, isPathTag }, position: { x: 0, y: 0 } });
          rawEdges.push({
            id: `e-${target.handle}-${tagId}`,
            source: target.handle,
            target: tagId,
            animated: isPathTag,
            style: { stroke: isPathTag ? "#00ed64" : "rgba(148,163,184,0.2)", strokeWidth: isPathTag ? 3 : 1 },
            markerEnd: { type: MarkerType.ArrowClosed, color: isPathTag ? "#00ed64" : "#475569" },
          });
        }

        rawEdges.push({
          id: `e-${tagId}-${c.handle}`,
          source: tagId,
          target: c.handle,
          animated: isPathTag,
          style: { stroke: isPathTag ? "#00ed64" : "rgba(148,163,184,0.2)", strokeWidth: isPathTag ? 3 : 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: isPathTag ? "#00ed64" : "#475569" },
        });
      });
    });

    if (chosenCandidate?.evidenceRepo) {
      const repoId = `repo:${chosenCandidate.evidenceRepo.name}`;
      rawNodes.push({
        id: repoId,
        type: "repoNode",
        data: { ...chosenCandidate.evidenceRepo },
        position: { x: 0, y: 0 },
      });
      rawEdges.push({
        id: `e-${chosenCandidate.handle}-${repoId}`,
        source: chosenCandidate.handle,
        target: repoId,
        animated: true,
        style: { stroke: "#f59e0b", strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
      });
    }

    return { nodes: layout(rawNodes, rawEdges), edges: rawEdges };
  }, [target, candidates, chosenHandle]);

  const [nodes, setNodes, onNodesChange] = useNodesState(builtNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(builtEdges);

  useEffect(() => {
    setNodes(builtNodes);
    setEdges(builtEdges);
  }, [builtNodes, builtEdges, setNodes, setEdges]);

  return (
    <div style={{ width: "100%", height, background: "#050811", borderRadius: "12px", overflow: "hidden" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          if (node.type === "personNode") onNodeClick?.(node.id);
        }}
        fitView
        fitViewOptions={{ padding: 0.3, duration: 300 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background color="#1e293b" gap={22} size={1} />
        <Controls showInteractive={false} style={{ background: "rgba(15,23,42,0.9)", borderRadius: "8px", overflow: "hidden" }} />
      </ReactFlow>
    </div>
  );
}
