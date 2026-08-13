"use client";

import { useMemo, useEffect, useRef } from "react";
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
  useReactFlow,
  ReactFlowProvider,
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

// Person Node (Unified for Target, Matched, and Network Peers)
function PersonNodeComponent({ data }: { data: any }) {
  const router = useRouter();
  const isTarget = data.isTarget;
  const isChosen = data.isChosen;
  const isDimmed = data.isDimmed;

  return (
    <div
      onClick={(e) => {
        // If clicking action link specifically, route to profile
        if ((e.target as HTMLElement).closest(".view-profile-btn")) {
          router.push(`/${data.handle}`);
          return;
        }
        // Otherwise trigger selection in the graph
        if (data.onSelect) {
          data.onSelect(data.handle);
        }
      }}
      style={{
        background: isTarget
          ? "linear-gradient(135deg, #052e16 0%, #0b1f14 100%)"
          : isChosen
          ? "linear-gradient(135deg, #064e3b 0%, #022c22 100%)"
          : "#0f172a",
        border: `2px solid ${
          isTarget || isChosen ? "#00ed64" : isDimmed ? "#1e293b" : "#334155"
        }`,
        borderRadius: "14px",
        padding: "12px 16px",
        minWidth: "210px",
        maxWidth: "250px",
        boxShadow: isTarget || isChosen
          ? "0 10px 30px -5px rgba(0, 237, 100, 0.4)"
          : isDimmed
          ? "none"
          : "0 4px 12px rgba(0, 0, 0, 0.3)",
        cursor: "pointer",
        opacity: isDimmed ? 0.35 : 1,
        transition: "opacity 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.15s ease",
      }}
      className="hover:scale-105"
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: isTarget || isChosen ? "#00ed64" : "#475569",
          width: "8px",
          height: "8px",
          border: "2px solid #0f172a",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span
          style={{
            background: isTarget
              ? "rgba(0, 237, 100, 0.25)"
              : isChosen
              ? "rgba(0, 237, 100, 0.25)"
              : "rgba(148, 163, 184, 0.12)",
            color: isTarget || isChosen ? "#00ed64" : "#94a3b8",
            fontSize: "9.5px",
            fontWeight: 800,
            padding: "2px 7px",
            borderRadius: "9999px",
            letterSpacing: "0.4px",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          {isTarget ? (
            <>
              <Sparkles size={10} /> TARGET
            </>
          ) : isChosen ? (
            "★ TOP MATCH"
          ) : (
            "ATTENDEE"
          )}
        </span>

        {data.score && !isDimmed && (
          <span style={{ fontSize: "10.5px", color: isChosen ? "#00ed64" : "#64748b", fontWeight: 700 }}>
            {data.score} pts
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: isTarget || isChosen ? "rgba(0, 237, 100, 0.2)" : "rgba(51, 65, 85, 0.4)",
            border: `1.5px solid ${isTarget || isChosen ? "#00ed64" : "#475569"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isTarget || isChosen ? "#00ed64" : "#e2e8f0",
            fontWeight: 700,
            fontSize: "13px",
          }}
        >
          {data.name ? data.name.charAt(0).toUpperCase() : <User size={14} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "13px",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {data.name || data.handle}
          </div>
          <div style={{ color: isTarget || isChosen ? "#00ed64" : "#94a3b8", fontSize: "11.5px", fontWeight: 600 }}>
            @{data.handle}
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div
        style={{
          marginTop: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `1px solid ${isTarget || isChosen ? "rgba(0, 237, 100, 0.25)" : "rgba(51, 65, 85, 0.4)"}`,
          paddingTop: "6px",
          fontSize: "10.5px",
        }}
      >
        <span style={{ color: isTarget ? "#00ed64" : "#64748b" }}>
          {isTarget ? "Selected" : "Click to select"}
        </span>
        <button
          className="view-profile-btn"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/${data.handle}`);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#00ed64",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            padding: 0,
          }}
        >
          Profile <ArrowRight size={10} />
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: isTarget || isChosen ? "#00ed64" : "#475569",
          width: "8px",
          height: "8px",
          border: "2px solid #0f172a",
        }}
      />
    </div>
  );
}

// Tag Node (Domain / Tech / Skill)
function TagNodeComponent({ data }: { data: any }) {
  const isChosen = data.isChosen;
  const isDimmed = data.isDimmed;

  return (
    <div
      style={{
        background: isChosen ? "#064e3b" : "#082f49",
        border: `1.5px solid ${isChosen ? "#00ed64" : isDimmed ? "#0c4a6e" : "#0284c7"}`,
        borderRadius: "9999px",
        padding: "5px 12px",
        boxShadow: isChosen
          ? "0 0 15px rgba(0, 237, 100, 0.4)"
          : "0 2px 8px rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "center",
        gap: "5px",
        opacity: isDimmed ? 0.35 : 1,
        transition: "opacity 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: isChosen ? "#00ed64" : "#0284c7",
          width: "6px",
          height: "6px",
          border: "1.5px solid #082f49",
        }}
      />

      <TagIcon size={11} color={isChosen ? "#a7f3d0" : "#7dd3fc"} />
      <span
        style={{
          color: isChosen ? "#ffffff" : "#bae6fd",
          fontSize: "11px",
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
          width: "6px",
          height: "6px",
          border: "1.5px solid #082f49",
        }}
      />
    </div>
  );
}

// Evidence Repo Node (GitHub Repository Proof)
function RepoNodeComponent({ data }: { data: any }) {
  const isDimmed = data.isDimmed;

  return (
    <div
      onClick={() => data.url && window.open(data.url, "_blank")}
      style={{
        background: "linear-gradient(135deg, #451a03 0%, #291102 100%)",
        border: "2px solid #f59e0b",
        borderRadius: "14px",
        padding: "10px 14px",
        minWidth: "190px",
        maxWidth: "230px",
        boxShadow: "0 10px 25px -5px rgba(245, 158, 11, 0.35)",
        cursor: "pointer",
        opacity: isDimmed ? 0.35 : 1,
        transition: "opacity 0.3s ease, transform 0.15s ease",
      }}
      className="hover:scale-105"
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "#f59e0b",
          width: "8px",
          height: "8px",
          border: "2px solid #451a03",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <span
          style={{
            background: "rgba(245, 158, 11, 0.2)",
            color: "#fbbf24",
            fontSize: "9.5px",
            fontWeight: 800,
            padding: "2px 7px",
            borderRadius: "9999px",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          <Code size={10} /> PROOF REPO
        </span>

        {typeof data.stars === "number" && data.stars > 0 && (
          <span style={{ fontSize: "10.5px", color: "#fbbf24", display: "flex", alignItems: "center", gap: "2px", fontWeight: 700 }}>
            <Star size={10} fill="#fbbf24" /> {data.stars}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
        <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "12.5px" }}>
          {data.name}
        </div>
        <ExternalLink size={12} color="#fbbf24" />
      </div>

      {data.language && (
        <div style={{ color: "#fef3c7", fontSize: "10.5px", marginTop: "3px" }}>
          Language: <strong>{data.language}</strong>
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  personNode: PersonNodeComponent,
  tagNode: TagNodeComponent,
  repoNode: RepoNodeComponent,
};

// ==========================================
// 2. DAGRE PERSISTENT UNIFIED LAYOUT
// ==========================================
function computePersistentLayout(allPeople: any[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: "LR",
    nodesep: 35,
    ranksep: 85,
    marginx: 50,
    marginy: 50,
  });

  const nodeMap = new Map<string, { id: string; type: string; data: any }>();
  const edgeList: Array<{ id: string; source: string; target: string }> = [];
  const tagSet = new Set<string>();

  // Add all people
  allPeople.forEach((p) => {
    nodeMap.set(p.handle, {
      id: p.handle,
      type: "personNode",
      data: {
        handle: p.handle,
        name: p.name || p.handle,
        description: p.description || "",
        tags: p.tags || [],
        email: p.email || "",
      },
    });

    dagreGraph.setNode(p.handle, { width: 230, height: 110 });

    // Add tags for this person
    (p.tags || []).slice(0, 3).forEach((tag: string) => {
      const tagId = `tag:${tag}`;
      if (!tagSet.has(tagId)) {
        tagSet.add(tagId);
        nodeMap.set(tagId, {
          id: tagId,
          type: "tagNode",
          data: { label: `#${tag}` },
        });
        dagreGraph.setNode(tagId, { width: 140, height: 40 });
      }

      const edgeId = `edge-${p.handle}-${tagId}`;
      edgeList.push({ id: edgeId, source: p.handle, target: tagId });
      dagreGraph.setEdge(p.handle, tagId);
    });
  });

  dagre.layout(dagreGraph);

  const positionMap = new Map<string, { x: number; y: number }>();
  nodeMap.forEach((node, id) => {
    const dagreNode = dagreGraph.node(id);
    if (dagreNode) {
      const isTag = node.type === "tagNode";
      const w = isTag ? 140 : 230;
      const h = isTag ? 40 : 110;
      positionMap.set(id, {
        x: dagreNode.x - w / 2,
        y: dagreNode.y - h / 2,
      });
    }
  });

  return { nodeMap, edgeList, positionMap };
}

// ==========================================
// 3. MAIN KNOWLEDGE GRAPH WITH AUTO-CENTER
// ==========================================
export interface KnowledgeGraphDataProps {
  allPeople?: any[];
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
  onSelectHandle?: (handle: string) => void;
  height?: string | number;
}

function FlowGraphInner({
  allPeople = [],
  target,
  candidates = [],
  chosenHandle,
  onSelectHandle,
}: KnowledgeGraphDataProps) {
  const { setCenter, fitView } = useReactFlow();

  // 1. Build or cache unified graph layout
  const peoplePool = useMemo(() => {
    if (allPeople.length > 0) return allPeople;
    // Fallback: merge target and candidates
    const pool = [target, ...candidates];
    const unique = new Map<string, any>();
    pool.forEach((p) => p?.handle && unique.set(p.handle.toLowerCase(), p));
    return Array.from(unique.values());
  }, [allPeople, target, candidates]);

  const { nodeMap, edgeList, positionMap } = useMemo(() => {
    return computePersistentLayout(peoplePool);
  }, [peoplePool]);

  // 2. Compute Active Highlighting State
  const { nodes: computedNodes, edges: computedEdges } = useMemo(() => {
    const activeTargetHandle = target?.handle?.toLowerCase();
    const activeChosenHandle = (chosenHandle || candidates[0]?.handle || "").toLowerCase();

    const candidateHandles = new Set(candidates.map((c) => c.handle.toLowerCase()));
    const chosenCandidate = candidates.find(
      (c) => c.handle.toLowerCase() === activeChosenHandle
    ) || candidates[0];

    const activeSharedTags = new Set(
      (chosenCandidate?.sharedTags || []).map((t) => `tag:${t}`)
    );
    if (chosenCandidate?.reason) {
      activeSharedTags.add(`tag:${chosenCandidate.reason}`);
    }

    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];

    // Construct Persistent Nodes with Dynamic Highlight Styles
    nodeMap.forEach((baseNode, id) => {
      const pos = positionMap.get(id) || { x: 0, y: 0 };
      const isTarget = id.toLowerCase() === activeTargetHandle;
      const isChosen = id.toLowerCase() === activeChosenHandle;
      const isCandidate = candidateHandles.has(id.toLowerCase());
      const isTag = baseNode.type === "tagNode";
      const isChosenTag = isTag && activeSharedTags.has(id);

      const isHighlight = isTarget || isChosen || isChosenTag;
      const isDimmed = !isHighlight && !isCandidate;

      const candidateDoc = candidates.find((c) => c.handle.toLowerCase() === id.toLowerCase());

      rawNodes.push({
        id,
        type: baseNode.type,
        position: pos,
        data: {
          ...baseNode.data,
          isTarget,
          isChosen,
          isDimmed,
          score: candidateDoc?.score,
          onSelect: onSelectHandle,
        },
      });
    });

    // Add Evidence Repo Node dynamically next to Chosen Match
    if (chosenCandidate?.evidenceRepo) {
      const repoId = `repo:${chosenCandidate.evidenceRepo.name}`;
      const chosenPos = positionMap.get(chosenCandidate.handle) || { x: 400, y: 0 };
      const repoPos = { x: chosenPos.x + 280, y: chosenPos.y };

      rawNodes.push({
        id: repoId,
        type: "repoNode",
        position: repoPos,
        data: {
          name: chosenCandidate.evidenceRepo.name,
          url: chosenCandidate.evidenceRepo.url,
          language: chosenCandidate.evidenceRepo.language,
          stars: chosenCandidate.evidenceRepo.stars,
          isDimmed: false,
        },
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

    // Construct Persistent Edges with Dynamic Glowing Flow
    edgeList.forEach((e) => {
      const sourceIsTarget = e.source.toLowerCase() === activeTargetHandle;
      const targetIsActiveTag = activeSharedTags.has(e.target);
      const isChosenPath = (sourceIsTarget && targetIsActiveTag) || (targetIsActiveTag && e.target.toLowerCase() === activeChosenHandle);

      rawEdges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: isChosenPath,
        style: {
          stroke: isChosenPath ? "#00ed64" : "rgba(148, 163, 184, 0.15)",
          strokeWidth: isChosenPath ? 3 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isChosenPath ? "#00ed64" : "rgba(148, 163, 184, 0.2)",
        },
      });
    });

    return { nodes: rawNodes, edges: rawEdges };
  }, [nodeMap, edgeList, positionMap, target, candidates, chosenHandle, onSelectHandle]);

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  useEffect(() => {
    setNodes(computedNodes);
    setEdges(computedEdges);
  }, [computedNodes, computedEdges, setNodes, setEdges]);

  // Smoothly center on the active target when target changes WITHOUT re-layouting
  useEffect(() => {
    if (target?.handle) {
      const targetPos = positionMap.get(target.handle);
      if (targetPos) {
        setCenter(targetPos.x + 100, targetPos.y + 50, { duration: 600, zoom: 0.95 });
      }
    }
  }, [target?.handle, positionMap, setCenter]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.25, duration: 600 }}
      minZoom={0.15}
      maxZoom={1.8}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1e293b" gap={24} size={1} />
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
          if (n.data?.isTarget) return "#00ed64";
          if (n.data?.isChosen) return "#00ed64";
          if (n.type === "tagNode") return "#0284c7";
          if (n.type === "repoNode") return "#f59e0b";
          return "#475569";
        }}
        maskColor="rgba(5, 8, 17, 0.75)"
        style={{
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid #334155",
          borderRadius: "8px",
        }}
      />
    </ReactFlow>
  );
}

export default function KnowledgeGraph(props: KnowledgeGraphDataProps) {
  return (
    <div
      style={{
        width: "100%",
        height: props.height || "100%",
        background: "#050811",
        borderRadius: "12px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <ReactFlowProvider>
        <FlowGraphInner {...props} />
      </ReactFlowProvider>

      {/* Floating Clickable Instruction */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          background: "rgba(15, 23, 42, 0.9)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(51, 65, 85, 0.8)",
          borderRadius: "8px",
          padding: "6px 12px",
          fontSize: "11px",
          color: "#94a3b8",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          zIndex: 10,
        }}
      >
        <span style={{ color: "#ffffff", fontWeight: 700 }}>
          💡 <span style={{ color: "#00ed64" }}>Click any developer card</span> to highlight & unblock them
        </span>
      </div>
    </div>
  );
}
