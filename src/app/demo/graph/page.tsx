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

const nodeTypes = {
  designNode: DesignNode,
  designRoot: DesignRootNode,
};

export default function DemoGraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeData, setSelectedNodeData] = useState<DesignNodeData | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNodeData(node.data as unknown as DesignNodeData);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedNodeData(null);
  }, []);

  // Toggle category visibility
  const toggleCategory = useCallback((cat: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  // Filter nodes by visible categories
  const filteredNodes = useMemo(() => {
    if (hiddenCategories.size === 0) return nodes;
    const visible = nodes.map((n) => ({
      ...n,
      hidden: hiddenCategories.has((n.data as unknown as DesignNodeData).category),
    }));
    return visible;
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

  // MiniMap node color
  const miniMapNodeColor = useCallback(
    (node: { id: string }) => {
      const n = nodes.find((nd) => nd.id === node.id);
      if (!n) return "oklch(0.3 0 160)";
      const d = n.data as unknown as DesignNodeData;
      return CATEGORY_COLORS[d.category];
    },
    [nodes]
  );

  return (
    <div className="h-screen w-screen flex flex-col" style={{ background: "oklch(0.09 0.005 160)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: "1px solid oklch(1.0 0 0 / 8%)" }}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "oklch(0.5 0.02 160)" }}>
            Demo
          </span>
          <span className="text-sm font-bold tracking-tight" style={{ color: "oklch(0.93 0.01 160)" }}>
            Design Decomposition Graph
          </span>
        </div>

        {/* Category filter toggles */}
        <div className="flex items-center gap-2">
          {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((cat) => {
            const active = !hiddenCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className="flex items-center gap-1.5 px-2 py-1 transition-all duration-150"
                style={{
                  background: active ? `${CATEGORY_COLORS[cat]} / 10%` : "transparent",
                  border: `1px solid ${active ? `${CATEGORY_COLORS[cat]} / 30%` : "oklch(1.0 0 0 / 8%)"}`,
                  opacity: active ? 1 : 0.35,
                }}
              >
                <span
                  className="w-1.5 h-1.5 inline-block"
                  style={{ background: CATEGORY_COLORS[cat] }}
                />
                <span
                  className="text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: active ? `${CATEGORY_COLORS[cat]} / 80%` : "oklch(0.4 0 160)" }}
                >
                  {CATEGORY_LABELS[cat]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* React Flow canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            style={{ background: "oklch(0.09 0.005 160)" }}
          >
            <Background
              color="oklch(1.0 0 0 / 3%)"
              gap={40}
              size={1}
            />
            <Controls
              position="bottom-left"
              style={{
                background: "oklch(0.10 0.006 160)",
                border: "1px solid oklch(1.0 0 0 / 8%)",
              }}
            />
            <MiniMap
              position="bottom-right"
              nodeColor={miniMapNodeColor}
              maskColor="oklch(0.09 0.005 160 / 80%)"
              style={{
                background: "oklch(0.10 0.006 160)",
                border: "1px solid oklch(1.0 0 0 / 8%)",
              }}
            />

            {/* Selected node hint */}
            {selectedNodeData && (
              <Panel position="top-right">
                <div
                  className="px-3 py-1.5 text-[10px] uppercase tracking-[0.3em]"
                  style={{
                    background: "oklch(0.10 0.006 160)",
                    border: `1px solid ${CATEGORY_COLORS[selectedNodeData.category]} / 20%`,
                    color: CATEGORY_COLORS[selectedNodeData.category],
                  }}
                >
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

      {/* Legend bar */}
      <LegendBar />
    </div>
  );
}
