"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  initialNodes,
  initialEdges,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type DesignNodeData,
} from "./decomposition-data";
import { DesignNode, DesignRootNode, DetailPanel, LegendBar } from "./graph-components";

const nodeTypes = { designNode: DesignNode, designRoot: DesignRootNode };

export default function DemoGraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeData, setSelectedNodeData] = useState<DesignNodeData | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

  const stableNodeTypes = useMemo(() => nodeTypes, []);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNodeData(node.data as unknown as DesignNodeData);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedNodeData(null);
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const filteredNodes = useMemo(() => {
    if (hiddenCategories.size === 0) return nodes;
    return nodes.map((n) => ({
      ...n,
      hidden: hiddenCategories.has((n.data as unknown as DesignNodeData).category),
    }));
  }, [nodes, hiddenCategories]);

  const filteredEdges = useMemo(() => {
    if (hiddenCategories.size === 0) return edges;
    const hiddenNodeIds = new Set(
      nodes
        .filter((n) => hiddenCategories.has((n.data as unknown as DesignNodeData).category))
        .map((n) => n.id)
    );
    return edges.map((e) => ({
      ...e,
      hidden: hiddenNodeIds.has(e.source) || hiddenNodeIds.has(e.target),
    }));
  }, [edges, nodes, hiddenCategories]);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "oklch(0.09 0.005 160)" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3em", color: "oklch(0.5 0.02 160)" }}>Demo</span>
          <span style={{ fontSize: "14px", fontWeight: "bold", color: "oklch(0.93 0.01 160)" }}>Design Decomposition Graph</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((cat) => {
            const active = !hiddenCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "4px 8px", cursor: "pointer",
                  background: active ? "rgba(255,255,255,0.06)" : "transparent",
                  border: `1px solid ${active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
                  opacity: active ? 1 : 0.35,
                }}
              >
                <span style={{ width: 6, height: 6, background: CATEGORY_COLORS[cat], display: "inline-block" }} />
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: active ? CATEGORY_COLORS[cat] : "rgba(255,255,255,0.3)" }}>
                  {CATEGORY_LABELS[cat]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Flow canvas — must have explicit dimensions for React Flow */}
        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          <ReactFlow
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={stableNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.15}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgba(255,255,255,0.03)" gap={40} size={1} />
            <Controls position="bottom-left" />
            <MiniMap position="bottom-right" />
            {selectedNodeData && (
              <Panel position="top-right">
                <div style={{ padding: "6px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3em", background: "rgba(0,0,0,0.8)", color: CATEGORY_COLORS[selectedNodeData.category] }}>
                  {selectedNodeData.label}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Detail panel */}
        {selectedNodeData && (
          <DetailPanel node={selectedNodeData} onClose={closeDetail} />
        )}
      </div>

      <LegendBar />
    </div>
  );
}
