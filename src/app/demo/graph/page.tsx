"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  type ConnectionMode,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ── Types ──
interface CompNodeData extends Record<string, unknown> {
  label: string;
  type: "layout" | "nav" | "content" | "interactive" | "atom" | "page";
  description: string;
  children?: string[];
  tech?: string;
}

// ── Color map ──
const COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  layout:    { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.5)",  text: "#34d399", glow: "rgba(16,185,129,0.15)" },
  nav:       { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.5)",  text: "#818cf8", glow: "rgba(99,102,241,0.15)" },
  content:   { bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.5)",  text: "#60a5fa", glow: "rgba(59,130,246,0.15)" },
  interactive:{ bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.5)", text: "#fbbf24", glow: "rgba(245,158,11,0.15)" },
  atom:      { bg: "rgba(244,63,94,0.10)",   border: "rgba(244,63,94,0.4)",  text: "#fb7185", glow: "rgba(244,63,94,0.10)" },
  page:      { bg: "rgba(139,92,246,0.14)",  border: "rgba(139,92,246,0.5)", text: "#a78bfa", glow: "rgba(139,92,246,0.15)" },
};

const TYPE_LABELS: Record<string, string> = {
  layout: "Layout",
  nav: "Navigation",
  content: "Content",
  interactive: "Interactive",
  atom: "Atom",
  page: "Page",
};

// ── Custom Node ──
function ComponentNode({ data, selected }: NodeProps<Node<CompNodeData>>) {
  const c = COLORS[data.type] || COLORS.atom;
  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-white/30 !border-0" />
      <div
        className="px-4 py-3 rounded-xl border backdrop-blur-md transition-all duration-200 min-w-[180px] max-w-[240px]"
        style={{
          background: c.bg,
          borderColor: selected ? c.text : c.border,
          boxShadow: selected ? `0 0 20px ${c.glow}, 0 0 40px ${c.glow}` : `0 0 10px ${c.glow}`,
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: c.border, color: "#000" }}
          >
            {TYPE_LABELS[data.type] || data.type}
          </span>
          {data.tech && (
            <span className="text-[9px] text-white/30 font-mono">{data.tech}</span>
          )}
        </div>
        <div className="text-sm font-semibold text-white/90 leading-tight">{data.label}</div>
        {selected && data.description && (
          <div className="text-[11px] text-white/50 mt-1.5 leading-relaxed">{data.description}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-white/30 !border-0" />
    </>
  );
}

function PageNode({ data, selected }: NodeProps<Node<CompNodeData>>) {
  const c = COLORS.page;
  return (
    <>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-white/30 !border-0" />
      <div
        className="px-5 py-4 rounded-2xl border backdrop-blur-md transition-all duration-200 min-w-[220px]"
        style={{
          background: c.bg,
          borderColor: selected ? c.text : c.border,
          boxShadow: selected ? `0 0 25px ${c.glow}, 0 0 50px ${c.glow}` : `0 0 15px ${c.glow}`,
        }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mb-2 inline-block"
          style={{ background: c.border, color: "#000" }}>
          PAGE
        </div>
        <div className="text-base font-bold text-white/90">{data.label}</div>
        {selected && data.description && (
          <div className="text-[11px] text-white/50 mt-1.5 leading-relaxed">{data.description}</div>
        )}
      </div>
    </>
  );
}

const nodeTypes: NodeTypes = {
  component: ComponentNode,
  page: PageNode,
};

// ── Mock decomposition data ──
function buildGraphData() {
  const nodes: Node<CompNodeData>[] = [
    // Page
    { id: "page-home", type: "page", position: { x: 400, y: 0 }, data: { label: "Home Page", type: "page", description: "Landing page with hero, features, pricing, CTA" } },
    
    // Layout nodes (top level)
    { id: "layout-main", type: "component", position: { x: 80, y: 120 }, data: { label: "Main Layout", type: "layout", description: "Page-level grid: header + main + footer", tech: "CSS Grid" } },
    { id: "layout-grid", type: "component", position: { x: 320, y: 120 }, data: { label: "Bento Grid", type: "layout", description: "Responsive bento layout with spanning cards", tech: "Tailwind Grid" } },
    { id: "layout-hero", type: "component", position: { x: 580, y: 120 }, data: { label: "Hero Section", type: "layout", description: "Full-width hero with gradient typography", tech: "Flexbox" } },
    
    // Navigation
    { id: "nav-header", type: "component", position: { x: -40, y: 260 }, data: { label: "Sticky Header", type: "nav", description: "Glassmorphism header with backdrop-blur", tech: "sticky + blur" } },
    { id: "nav-links", type: "component", position: { x: 160, y: 260 }, data: { label: "Nav Links", type: "nav", description: "Animated underline links with hover state" } },
    { id: "nav-footer", type: "component", position: { x: 340, y: 260 }, data: { label: "Footer", type: "nav", description: "Minimal footer with social links" } },
    
    // Content components
    { id: "card-hero", type: "component", position: { x: -40, y: 400 }, data: { label: "Hero Card", type: "content", description: "URL input + action buttons", tech: "form" } },
    { id: "card-methods", type: "component", position: { x: 200, y: 400 }, data: { label: "Methods List", type: "content", description: "8 methodology labels with reveal animation" } },
    { id: "card-result", type: "component", position: { x: 440, y: 400 }, data: { label: "Analysis Card", type: "content", description: "Collapsible result with markdown", tech: "react-md" } },
    { id: "card-progress", type: "component", position: { x: 660, y: 400 }, data: { label: "Progress Bar", type: "content", description: "Step indicator with live SSE updates", tech: "event-source" } },
    
    // Interactive
    { id: "btn-analyze", type: "component", position: { x: -40, y: 540 }, data: { label: "Analyze Button", type: "interactive", description: "Primary CTA with loading spinner + disabled states" } },
    { id: "btn-upload", type: "component", position: { x: 180, y: 540 }, data: { label: "Image Upload", type: "interactive", description: "Drag-and-drop + file picker + preview", tech: "input[file]" } },
    { id: "input-url", type: "component", position: { x: 380, y: 540 }, data: { label: "URL Input", type: "interactive", description: "Monospace input with icon prefix and validation" } },
    { id: "toggle-features", type: "component", position: { x: 580, y: 540 }, data: { label: "Feature Toggles", type: "interactive", description: "Checkboxes for Ref Pipeline + RSC Extract" } },
    
    // Atoms
    { id: "atom-typography", type: "component", position: { x: -40, y: 670 }, data: { label: "Gradient Text", type: "atom", description: "bg-clip-text gradient on hero heading", tech: "tailwind" } },
    { id: "atom-badge", type: "component", position: { x: 160, y: 670 }, data: { label: "Source Badge", type: "atom", description: "Colored chip: dribbble/github/url/image" } },
    { id: "atom-tooltip", type: "component", position: { x: 360, y: 670 }, data: { label: "Toast Notification", type: "atom", description: "Sonner toast for success/error/info" } },
    { id: "atom-skeleton", type: "component", position: { x: 560, y: 670 }, data: { label: "Skeleton Loader", type: "atom", description: "Pulse animation placeholder cards" } },
  ];

  const edges: Edge[] = [
    // Page → Layouts
    { id: "e-page-layout-main", source: "page-home", target: "layout-main", animated: true, style: { stroke: "rgba(139,92,246,0.4)", strokeWidth: 2 } },
    { id: "e-page-layout-grid", source: "page-home", target: "layout-grid", animated: true, style: { stroke: "rgba(139,92,246,0.4)", strokeWidth: 2 } },
    { id: "e-page-layout-hero", source: "page-home", target: "layout-hero", animated: true, style: { stroke: "rgba(139,92,246,0.4)", strokeWidth: 2 } },

    // Layout → Nav
    { id: "e-layout-nav-header", source: "layout-main", target: "nav-header", style: { stroke: "rgba(99,102,241,0.25)", strokeWidth: 1.5 } },
    { id: "e-layout-nav-links", source: "nav-header", target: "nav-links", style: { stroke: "rgba(99,102,241,0.25)", strokeWidth: 1.5 } },
    { id: "e-layout-nav-footer", source: "layout-grid", target: "nav-footer", style: { stroke: "rgba(99,102,241,0.25)", strokeWidth: 1.5 } },

    // Layout → Content
    { id: "e-grid-card-hero", source: "layout-grid", target: "card-hero", style: { stroke: "rgba(59,130,246,0.25)", strokeWidth: 1.5 } },
    { id: "e-grid-card-methods", source: "layout-grid", target: "card-methods", style: { stroke: "rgba(59,130,246,0.25)", strokeWidth: 1.5 } },
    { id: "e-hero-card-result", source: "layout-hero", target: "card-result", style: { stroke: "rgba(59,130,246,0.25)", strokeWidth: 1.5 } },
    { id: "e-hero-card-progress", source: "layout-hero", target: "card-progress", style: { stroke: "rgba(59,130,246,0.25)", strokeWidth: 1.5 } },

    // Content → Interactive
    { id: "e-card-hero-btn", source: "card-hero", target: "btn-analyze", style: { stroke: "rgba(245,158,11,0.25)", strokeWidth: 1.5 } },
    { id: "e-card-hero-upload", source: "card-hero", target: "btn-upload", style: { stroke: "rgba(245,158,11,0.25)", strokeWidth: 1.5 } },
    { id: "e-card-hero-input", source: "card-hero", target: "input-url", style: { stroke: "rgba(245,158,11,0.25)", strokeWidth: 1.5 } },
    { id: "e-card-hero-toggles", source: "card-hero", target: "toggle-features", style: { stroke: "rgba(245,158,11,0.25)", strokeWidth: 1.5 } },

    // Interactive → Atoms
    { id: "e-btn-typo", source: "btn-analyze", target: "atom-typography", style: { stroke: "rgba(244,63,94,0.2)", strokeWidth: 1 } },
    { id: "e-upload-badge", source: "btn-upload", target: "atom-badge", style: { stroke: "rgba(244,63,94,0.2)", strokeWidth: 1 } },
    { id: "e-input-toast", source: "input-url", target: "atom-tooltip", style: { stroke: "rgba(244,63,94,0.2)", strokeWidth: 1 } },
    { id: "e-progress-skeleton", source: "card-progress", target: "atom-skeleton", style: { stroke: "rgba(244,63,94,0.2)", strokeWidth: 1 } },

    // Cross-dependencies (dashed)
    { id: "e-cross-input-btn", source: "input-url", target: "btn-analyze", style: { stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "6 4" }, label: "validates", labelStyle: { fill: "rgba(255,255,255,0.25)", fontSize: 10, fontWeight: 300 } },
    { id: "e-cross-progress-result", source: "card-progress", target: "card-result", style: { stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "6 4" }, label: "updates", labelStyle: { fill: "rgba(255,255,255,0.25)", fontSize: 10, fontWeight: 300 } },
    { id: "e-cross-toast-all", source: "atom-tooltip", target: "btn-analyze", style: { stroke: "rgba(255,255,255,0.08)", strokeWidth: 1, strokeDasharray: "6 4" } },
  ];

  return { nodes, edges };
}

export default function DemoGraphPage() {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => buildGraphData(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<CompNodeData> | null>(null);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as Node<CompNodeData>);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="h-screen w-screen bg-[#0a0a0a]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        connectionMode="loose"
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background
          color="rgba(255,255,255,0.03)"
          gap={40}
          size={1}
        />
        <Controls
          className="!bg-white/5 !border-white/10 !rounded-lg !shadow-none"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-black/40 !border-white/10 !rounded-lg"
          nodeColor={(n) => {
            const data = n.data as CompNodeData | undefined;
            return data ? (COLORS[data.type]?.text || "#fb7185") : "rgba(255,255,255,0.2)";
          }}
          maskColor="rgba(0,0,0,0.6)"
          pannable
          zoomable
        />

        {/* Top-left legend */}
        <Panel position="top-left" className="!m-4">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
              Component Decomposition
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TYPE_LABELS).map(([key, label]) => {
                const c = COLORS[key];
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: c.text, boxShadow: `0 0 6px ${c.glow}` }}
                    />
                    <span className="text-[10px] text-white/50 font-medium">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-px bg-white/20" />
                <span className="text-[10px] text-white/30">Hierarchy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-px border-t border-dashed border-white/20" style={{ borderTopStyle: "dashed" }} />
                <span className="text-[10px] text-white/30">Dependency</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Bottom info */}
        <Panel position="bottom-left" className="!m-4">
          <div className="text-[10px] text-white/20 font-mono">
            Click node to inspect &middot; Scroll to zoom &middot; Drag to pan
          </div>
        </Panel>

        {/* Selected node details */}
        {selectedNode && (
          <Panel position="top-right" className="!m-4">
            <div
              className="bg-black/60 backdrop-blur-md border rounded-xl p-4 min-w-[220px] max-w-[280px]"
              style={{ borderColor: COLORS[selectedNode.data.type]?.border || "rgba(255,255,255,0.1)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{ background: COLORS[selectedNode.data.type]?.border, color: "#000" }}
                >
                  {TYPE_LABELS[selectedNode.data.type]}
                </span>
                {selectedNode.data.tech && (
                  <span className="text-[10px] font-mono text-white/30">{selectedNode.data.tech}</span>
                )}
              </div>
              <div className="text-sm font-semibold text-white/90">{selectedNode.data.label}</div>
              <div className="text-[11px] text-white/50 mt-1 leading-relaxed">{selectedNode.data.description}</div>
              <div className="text-[10px] text-white/20 font-mono mt-2">{selectedNode.id}</div>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
