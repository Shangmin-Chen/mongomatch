"use client";

import { useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  User,
  ExternalLink,
  Code,
  Sparkles,
  Mail,
  Star,
  Tag as TagIcon,
  ArrowRight,
} from "lucide-react";
import dagre from "@dagrejs/dagre";

// ==========================================
// 1. CUSTOM NODE COMPONENTS
// ==========================================

// Target Node (You / Queried Attendee)
function TargetNode({ data }: { data: any }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/${data.handle}`)}
      style={{
        background: "linear-gradient(135deg, #052210 0%, #0b1f14 100%)",
        border: "2px solid #00ed64",
        borderRadius: "14px",
        padding: "14px 18px",
        minWidth: "220px",
        maxWidth: "260px",
        boxShadow: "0 10px 25px -5px rgba(0, 237, 100, 0.3)",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      className="hover:scale-105"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span
          style={{
            background: "rgba(0, 237, 100, 0.2)",
            color: "#00ed64",
            fontSize: "10px",
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: "9999px",
            letterSpacing: "0.5px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Sparkles size={10} /> TARGET BUILDER
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(0, 237, 100, 0.15)",
            border: "1.5px solid #00ed64",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#00ed64",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          {data.name ? data.name.charAt(0).toUpperCase() : <User size={16} />}
        </div>
        <div>
          <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>
            {data.name || data.handle}
          </div>
          <div style={{ color: "#00ed64", fontSize: "12px", fontWeight: 600 }}>
            @{data.handle}
          </div>
        </div>
      </div>

      {data.description && (
        <p
          style={{
            color: "#94a3b8",
            fontSize: "11px",
            lineHeight: 1.35,
            marginTop: "10px",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          &ldquo;{data.description}&rdquo;
        </p>
      )}

      {/* Outgoing Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: "#00ed64",
          width: "10px",
          height: "10px",
          border: "2px solid #052210",
        }}
      />
    </div>
  );
}

// Tag Node (Domain / Tech / Skill)
function TagNodeComponent({ data }: { data: any }) {
  const isChosen = data.isChosen;

  return (
    <div
      style={{
        background: isChosen ? "#064e3b" : "#082f49",
        border: `1.5px solid ${isChosen ? "#00ed64" : "#0284c7"}`,
        borderRadius: "9999px",
        padding: "6px 14px",
        boxShadow: isChosen
          ? "0 0 15px rgba(0, 237, 100, 0.4)"
          : "0 4px 10px rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        cursor: "default",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: isChosen ? "#00ed64" : "#0284c7",
          width: "8px",
          height: "8px",
          border: "2px solid #082f49",
        }}
      />

      <TagIcon size={12} color={isChosen ? "#a7f3d0" : "#7dd3fc"} />
      <span
        style={{
          color: isChosen ? "#ffffff" : "#bae6fd",
          fontSize: "12px",
          fontWeight: 700,
        }}
      >
        {data.label}
      </span>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: isChosen ? "#00ed64" : "#0284c7",
          width: "8px",
          height: "8px",
          border: "2px solid #082f49",
        }}
      />
    </div>
  );
}

// Match Node (Candidate Peer Developer)
function MatchNodeComponent({ data }: { data: any }) {
  const router = useRouter();
  const isChosen = data.isChosen;

  return (
    <div
      onClick={() => router.push(`/${data.handle}`)}
      style={{
        background: isChosen
          ? "linear-gradient(135deg, #092e17 0%, #0f3d20 100%)"
          : "#0f172a",
        border: `2px solid ${isChosen ? "#00ed64" : "#334155"}`,
        borderRadius: "14px",
        padding: "14px 16px",
        minWidth: "230px",
        maxWidth: "270px",
        boxShadow: isChosen
          ? "0 10px 30px -5px rgba(0, 237, 100, 0.35)"
          : "0 6px 15px rgba(0, 0, 0, 0.4)",
        cursor: "pointer",
        transition: "transform 0.15s, border-color 0.15s",
      }}
      className="hover:scale-105"
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: isChosen ? "#00ed64" : "#64748b",
          width: "10px",
          height: "10px",
          border: "2px solid #0f172a",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span
          style={{
            background: isChosen ? "rgba(0, 237, 100, 0.25)" : "rgba(148, 163, 184, 0.12)",
            color: isChosen ? "#00ed64" : "#94a3b8",
            fontSize: "10px",
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: "9999px",
            letterSpacing: "0.4px",
          }}
        >
          {isChosen ? "★ TOP UNBLOCKER" : "CANDIDATE PEER"}
        </span>

        {data.score && (
          <span style={{ fontSize: "11px", color: isChosen ? "#00ed64" : "#64748b", fontWeight: 700 }}>
            Score {data.score}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: isChosen ? "rgba(0, 237, 100, 0.2)" : "rgba(51, 65, 85, 0.5)",
            border: `1.5px solid ${isChosen ? "#00ed64" : "#475569"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isChosen ? "#00ed64" : "#e2e8f0",
            fontWeight: 700,
            fontSize: "13px",
          }}
        >
          {data.name ? data.name.charAt(0).toUpperCase() : <User size={15} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "13.5px", lineHeight: 1.2 }}>
            {data.name || data.handle}
          </div>
          <div style={{ color: isChosen ? "#00ed64" : "#94a3b8", fontSize: "12px", fontWeight: 600 }}>
            @{data.handle}
          </div>
        </div>
      </div>

      {data.email && (
        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#64748b", fontSize: "11px", marginTop: "8px" }}>
          <Mail size={11} color={isChosen ? "#00ed64" : "#94a3b8"} /> {data.email}
        </div>
      )}

      <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(51, 65, 85, 0.5)", paddingTop: "8px" }}>
        <span style={{ color: isChosen ? "#00ed64" : "#94a3b8", fontSize: "11px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
          View Profile <ArrowRight size={11} />
        </span>
      </div>

      {/* Source handle if evidence repo attached */}
      {isChosen && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: "#00ed64",
            width: "10px",
            height: "10px",
            border: "2px solid #092e17",
          }}
        />
      )}
    </div>
  );
}

// Evidence Repo Node (GitHub Repository Proof)
function RepoNodeComponent({ data }: { data: any }) {
  return (
    <div
      onClick={() => data.url && window.open(data.url, "_blank")}
      style={{
        background: "linear-gradient(135deg, #451a03 0%, #291102 100%)",
        border: "2px solid #f59e0b",
        borderRadius: "14px",
        padding: "12px 16px",
        minWidth: "210px",
        maxWidth: "250px",
        boxShadow: "0 10px 25px -5px rgba(245, 158, 11, 0.3)",
        cursor: "pointer",
        transition: "transform 0.15s",
      }}
      className="hover:scale-105"
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "#f59e0b",
          width: "10px",
          height: "10px",
          border: "2px solid #451a03",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span
          style={{
            background: "rgba(245, 158, 11, 0.2)",
            color: "#fbbf24",
            fontSize: "10px",
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: "9999px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Code size={10} /> PROOF CODEBASE
        </span>

        {typeof data.stars === "number" && data.stars > 0 && (
          <span style={{ fontSize: "11px", color: "#fbbf24", display: "flex", alignItems: "center", gap: "3px", fontWeight: 700 }}>
            <Star size={11} fill="#fbbf24" /> {data.stars}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "13.5px" }}>
          {data.name}
        </div>
        <ExternalLink size={13} color="#fbbf24" />
      </div>

      {data.language && (
        <div style={{ color: "#fef3c7", fontSize: "11px", marginTop: "4px" }}>
          Primary Language: <strong>{data.language}</strong>
        </div>
      )}

      <div style={{ color: "#fbbf24", fontSize: "11px", fontWeight: 600, marginTop: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
        Open GitHub Repository ↗
      </div>
    </div>
  );
}

// Node types mapping for React Flow
const nodeTypes = {
  targetNode: TargetNode,
  tagNode: TagNodeComponent,
  matchNode: MatchNodeComponent,
  repoNode: RepoNodeComponent,
};

// ==========================================
// 2. DAGRE AUTOMATIC LAYOUT HELPER
// ==========================================
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Left-to-Right layout with comfortable spacing
  dagreGraph.setGraph({
    rankdir: "LR",
    nodesep: 40,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    const isTag = node.type === "tagNode";
    const isRepo = node.type === "repoNode";
    const width = isTag ? 150 : isRepo ? 230 : 250;
    const height = isTag ? 45 : isRepo ? 110 : 130;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isTag = node.type === "tagNode";
    const isRepo = node.type === "repoNode";
    const width = isTag ? 150 : isRepo ? 230 : 250;
    const height = isTag ? 45 : isRepo ? 110 : 130;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ==========================================
// 3. MAIN KNOWLEDGE GRAPH COMPONENT
// ==========================================
export interface KnowledgeGraphDataProps {
  target: {
    handle: string;
    name: string;
    description?: string;
  };
  candidates: Array<{
    handle: string;
    name: string;
    email?: string;
    description?: string;
    sharedTags?: string[];
    reason?: string;
    score?: number;
    evidenceRepo?: {
      name: string;
      url: string;
      language?: string | null;
      stars?: number;
    } | null;
  }>;
  chosenHandle?: string;
  height?: string | number;
}

export default function KnowledgeGraph({
  target,
  candidates = [],
  chosenHandle,
  height = "100%",
}: KnowledgeGraphDataProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!target || !target.handle) return { nodes: [], edges: [] };

    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];
    const tagSet = new Set<string>();

    const activeChosen = (chosenHandle || candidates[0]?.handle || "").toLowerCase();

    // 1. Target Node
    rawNodes.push({
      id: target.handle,
      type: "targetNode",
      data: {
        handle: target.handle,
        name: target.name || target.handle,
        description: target.description || "",
      },
      position: { x: 0, y: 0 },
    });

    const chosenCandidate = candidates.find(
      (c) => c.handle.toLowerCase() === activeChosen
    ) || candidates[0];

    // 2. Candidate Nodes & Tag Edges
    candidates.forEach((candidate) => {
      const isChosen = candidate.handle.toLowerCase() === activeChosen;

      rawNodes.push({
        id: candidate.handle,
        type: "matchNode",
        data: {
          handle: candidate.handle,
          name: candidate.name || candidate.handle,
          email: candidate.email,
          score: candidate.score,
          isChosen,
          reason: candidate.reason,
        },
        position: { x: 0, y: 0 },
      });

      // Tags shared with target
      const shared = candidate.sharedTags || [];
      shared.forEach((tag) => {
        const tagId = `tag:${tag}`;
        const isPathTag = isChosen && (candidate.reason === tag || shared.length === 1);

        if (!tagSet.has(tagId)) {
          tagSet.add(tagId);
          rawNodes.push({
            id: tagId,
            type: "tagNode",
            data: {
              label: `#${tag}`,
              isChosen: isPathTag,
            },
            position: { x: 0, y: 0 },
          });

          // Edge: Target -> Tag
          rawEdges.push({
            id: `edge-${target.handle}-${tagId}`,
            source: target.handle,
            target: tagId,
            animated: isPathTag,
            style: {
              stroke: isPathTag ? "#00ed64" : "rgba(148, 163, 184, 0.4)",
              strokeWidth: isPathTag ? 3 : 1.5,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isPathTag ? "#00ed64" : "#64748b",
            },
          });
        }

        // Edge: Tag -> Candidate
        rawEdges.push({
          id: `edge-${tagId}-${candidate.handle}`,
          source: tagId,
          target: candidate.handle,
          animated: isPathTag,
          style: {
            stroke: isPathTag ? "#00ed64" : "rgba(148, 163, 184, 0.4)",
            strokeWidth: isPathTag ? 3 : 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isPathTag ? "#00ed64" : "#64748b",
          },
        });
      });
    });

    // 3. Evidence Repo Node
    if (chosenCandidate?.evidenceRepo) {
      const repoId = `repo:${chosenCandidate.evidenceRepo.name}`;
      rawNodes.push({
        id: repoId,
        type: "repoNode",
        data: {
          name: chosenCandidate.evidenceRepo.name,
          url: chosenCandidate.evidenceRepo.url,
          language: chosenCandidate.evidenceRepo.language,
          stars: chosenCandidate.evidenceRepo.stars,
        },
        position: { x: 0, y: 0 },
      });

      rawEdges.push({
        id: `edge-${chosenCandidate.handle}-${repoId}`,
        source: chosenCandidate.handle,
        target: repoId,
        animated: true,
        style: {
          stroke: "#f59e0b",
          strokeWidth: 3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#f59e0b",
        },
      });
    }

    return getLayoutedElements(rawNodes, rawEdges);
  }, [target, candidates, chosenHandle]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div
      style={{
        width: "100%",
        height: height,
        background: "#050811",
        borderRadius: "12px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25, duration: 400 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls
          showInteractive={false}
          style={{
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid #334155",
            borderRadius: "8px",
            fill: "#ffffff",
          }}
        />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === "targetNode") return "#00ed64";
            if (n.type === "tagNode") return "#0284c7";
            if (n.type === "repoNode") return "#f59e0b";
            return "#64748b";
          }}
          maskColor="rgba(5, 8, 17, 0.7)"
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid #334155",
            borderRadius: "8px",
          }}
        />
      </ReactFlow>

      {/* Floating Clickable Instruction */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(51, 65, 85, 0.8)",
          borderRadius: "8px",
          padding: "6px 12px",
          fontSize: "11.5px",
          color: "#94a3b8",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          zIndex: 10,
        }}
      >
        <span style={{ color: "#ffffff", fontWeight: 700 }}>
          💡 <span style={{ color: "#00ed64" }}>Click any developer card</span> to navigate to their profile
        </span>
      </div>
    </div>
  );
}
