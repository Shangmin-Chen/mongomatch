"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ZoomIn, ZoomOut, Maximize2, ExternalLink, User } from "lucide-react";

// Dynamically import 2D Force Graph for SSR safety
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

export interface GraphNode {
  id: string;
  name: string;
  type: "you" | "match" | "tag" | "repo";
  handle?: string;
  url?: string;
  val?: number;
  color?: string;
  isChosen?: boolean;
  score?: number;
  reason?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  isChosen?: boolean;
  color?: string;
}

export interface KnowledgeGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  interactive?: boolean;
}

export default function KnowledgeGraph({
  nodes,
  links,
  width,
  height,
  onNodeClick,
  interactive = true,
}: KnowledgeGraphProps) {
  const router = useRouter();
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: width || 800,
    height: height || 500,
  });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Resize observer
  useEffect(() => {
    if (!width || !height) {
      const updateSize = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setContainerDimensions({
            width: width || rect.width || 800,
            height: height || rect.height || 500,
          });
        }
      };
      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }
  }, [width, height]);

  // Auto zoom-to-fit once data loads
  useEffect(() => {
    if (graphRef.current && nodes.length > 0) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50);
      }, 500);
    }
  }, [nodes]);

  const handleNodeClick = (node: any) => {
    if (onNodeClick) {
      onNodeClick(node as GraphNode);
      return;
    }

    if (node.type === "you" || node.type === "match") {
      const targetHandle = node.handle || node.id;
      if (targetHandle) {
        router.push(`/${targetHandle}`);
      }
    } else if (node.type === "repo" && node.url) {
      window.open(node.url, "_blank");
    }
  };

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Custom 2D Node Canvas Renderer
  const renderNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isTarget = node.type === "you";
    const isMatch = node.type === "match";
    const isTag = node.type === "tag";
    const isRepo = node.type === "repo";
    const isChosen = Boolean(node.isChosen);
    const isHovered = hoveredNode === node.id;

    ctx.save();

    if (isTarget || isMatch) {
      // Draw Person Card / Pill Node
      const title = node.handle ? `@${node.handle}` : node.name;
      const subtitle = isTarget
        ? "YOU (TARGET)"
        : isChosen
        ? "TOP UNBLOCKER"
        : node.name !== node.handle
        ? node.name
        : "DEVELOPER";

      ctx.font = `bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const titleWidth = ctx.measureText(title).width;
      ctx.font = `600 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const subWidth = ctx.measureText(subtitle).width;

      const cardWidth = Math.max(titleWidth, subWidth) + 36;
      const cardHeight = 34;
      const x = (node.x || 0) - cardWidth / 2;
      const y = (node.y || 0) - cardHeight / 2;

      // Glow Shadow
      if (isTarget || isChosen || isHovered) {
        ctx.shadowColor = isTarget || isChosen ? "#00ed64" : "#60a5fa";
        ctx.shadowBlur = isHovered ? 18 : 10;
      }

      // Card Fill
      drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 8);
      ctx.fillStyle = isTarget
        ? "#052210"
        : isChosen
        ? "#092e17"
        : isHovered
        ? "#1e293b"
        : "#0f172a";
      ctx.fill();

      // Card Border
      ctx.lineWidth = isTarget || isChosen ? 2.5 : isHovered ? 2 : 1;
      ctx.strokeStyle = isTarget
        ? "#00ed64"
        : isChosen
        ? "#00ed64"
        : isHovered
        ? "#93c5fd"
        : "#334155";
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Avatar Circle indicator
      const circleX = x + 16;
      const circleY = y + cardHeight / 2;
      ctx.beginPath();
      ctx.arc(circleX, circleY, 8, 0, 2 * Math.PI);
      ctx.fillStyle = isTarget || isChosen ? "rgba(0, 237, 100, 0.2)" : "rgba(148, 163, 184, 0.15)";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isTarget || isChosen ? "#00ed64" : "#94a3b8";
      ctx.stroke();

      // Dot inside avatar
      ctx.beginPath();
      ctx.arc(circleX, circleY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = isTarget || isChosen ? "#00ed64" : "#94a3b8";
      ctx.fill();

      // Text: Subtitle / Badge
      ctx.font = `700 7.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = isTarget || isChosen ? "#00ed64" : "#94a3b8";
      ctx.fillText(subtitle.toUpperCase(), x + 30, y + 13);

      // Text: Handle / Name
      ctx.font = `bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(title, x + 30, y + 26);
    } else if (isTag) {
      // Draw Tag Node
      const tagText = node.name || node.id;
      ctx.font = `600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const textWidth = ctx.measureText(tagText).width;
      const pillWidth = textWidth + 16;
      const pillHeight = 20;
      const x = (node.x || 0) - pillWidth / 2;
      const y = (node.y || 0) - pillHeight / 2;

      if (isChosen || isHovered) {
        ctx.shadowColor = isChosen ? "#00ed64" : "#38bdf8";
        ctx.shadowBlur = 8;
      }

      drawRoundedRect(ctx, x, y, pillWidth, pillHeight, 10);
      ctx.fillStyle = isChosen ? "#064e3b" : "#082f49";
      ctx.fill();

      ctx.lineWidth = isChosen ? 1.8 : 1;
      ctx.strokeStyle = isChosen ? "#00ed64" : "#0284c7";
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = isChosen ? "#a7f3d0" : "#7dd3fc";
      ctx.fillText(tagText, x + 8, y + 14);
    } else if (isRepo) {
      // Draw Evidence Repo Node
      const repoText = `📦 ${node.name}`;
      ctx.font = `bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const textWidth = ctx.measureText(repoText).width;
      const pillWidth = textWidth + 18;
      const pillHeight = 22;
      const x = (node.x || 0) - pillWidth / 2;
      const y = (node.y || 0) - pillHeight / 2;

      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 10;

      drawRoundedRect(ctx, x, y, pillWidth, pillHeight, 6);
      ctx.fillStyle = "#451a03";
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#f59e0b";
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#fef3c7";
      ctx.fillText(repoText, x + 9, y + 15);
    }

    ctx.restore();
  };

  // Node Hit Area Painter
  const paintNodePointerArea = (node: any, color: string, ctx: CanvasRenderingContext2D) => {
    const isTag = node.type === "tag";
    const isRepo = node.type === "repo";
    const w = isTag ? 60 : isRepo ? 90 : 120;
    const h = isTag ? 20 : isRepo ? 24 : 36;
    ctx.fillStyle = color;
    drawRoundedRect(ctx, (node.x || 0) - w / 2, (node.y || 0) - h / 2, w, h, 8);
    ctx.fill();
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#050811",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <ForceGraph2D
        ref={graphRef}
        width={containerDimensions.width}
        height={containerDimensions.height}
        graphData={{ nodes, links }}
        backgroundColor="#050811"
        nodeCanvasObject={renderNode}
        nodePointerAreaPaint={paintNodePointerArea}
        linkColor={(link: any) =>
          link.isChosen ? "#00ed64" : "rgba(148, 163, 184, 0.18)"
        }
        linkWidth={(link: any) => (link.isChosen ? 2.5 : 0.8)}
        linkDirectionalParticles={(link: any) => (link.isChosen ? 4 : 0)}
        linkDirectionalParticleSpeed={0.008}
        linkDirectionalParticleWidth={2.5}
        linkDirectionalParticleColor={() => "#00ed64"}
        d3VelocityDecay={0.25}
        cooldownTicks={120}
        onNodeClick={handleNodeClick}
        onNodeHover={(node: any) => {
          setHoveredNode(node ? node.id : null);
          if (containerRef.current) {
            containerRef.current.style.cursor = node ? "pointer" : "default";
          }
        }}
      />

      {/* Floating Graph Controls */}
      {interactive && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            right: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            zIndex: 15,
          }}
        >
          <button
            onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 1.3, 300)}
            title="Zoom In"
            style={{
              background: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid #334155",
              color: "#f8fafc",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 0.7, 300)}
            title="Zoom Out"
            style={{
              background: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid #334155",
              color: "#f8fafc",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => graphRef.current?.zoomToFit(400, 50)}
            title="Fit to Screen"
            style={{
              background: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid #334155",
              color: "#f8fafc",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}

      {/* Legend & Interactive Click Hint Overlay */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(51, 65, 85, 0.8)",
          borderRadius: "8px",
          padding: "0.5rem 0.75rem",
          fontSize: "0.75rem",
          color: "#94a3b8",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.75rem",
          zIndex: 15,
        }}
      >
        <span style={{ color: "#ffffff", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
          💡 <span style={{ color: "#00ed64" }}>Click any developer card</span> to open profile
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00ed64" }} /> Match
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0284c7" }} /> Tag
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} /> Repo Proof
          </span>
        </div>
      </div>
    </div>
  );
}
