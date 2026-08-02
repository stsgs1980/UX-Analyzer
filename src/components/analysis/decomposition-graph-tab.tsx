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
import {
  DesignNode,
  DesignRootNode,
  DetailPanel,
  LegendBar,
} from "./graph-components";

const nodeTypes = { designNode: DesignNode, designRoot: DesignRootNode };

/**
 * Full-viewport Decomposition Graph overlay.
 * Used inside DecompositionGraphTab — opened via "Open Full View" button.
 */
export function DecompositionGraphOverlay({
  onClose,
}: {
  onClose: () => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeData, setSelectedNodeData] =
    useState<DesignNodeData | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    new Set()
  );

  const stableNodeTypes = useMemo(() => nodeTypes, []);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNodeData(node.data as unknown as DesignNodeData);
  }, []);

  const closeDetail = useCallback(() => setSelectedNodeData(null), []);

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
      hidden: hiddenCategories.has(
        (n.data as unknown as DesignNodeData).category
      ),
    }));
  }, [nodes, hiddenCategories]);

  const filteredEdges = useMemo(() => {
    if (hiddenCategories.size === 0) return edges;
    const hiddenNodeIds = new Set(
      nodes
        .filter((n) =>
          hiddenCategories.has((n.data as unknown as DesignNodeData).category)
        )
        .map((n) => n.id)
    );
    return edges.map((e) => ({
      ...e,
      hidden: hiddenNodeIds.has(e.source) || hiddenNodeIds.has(e.target),
    }));
  }, [edges, nodes, hiddenCategories]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        background: "oklch(0.09 0.005 160)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              color: "oklch(0.5 0.02 160)",
            }}
          >
            Design Decomposition
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {(
            Object.keys(CATEGORY_LABELS) as Array<
              keyof typeof CATEGORY_LABELS
            >
          ).map((cat) => {
            const active = !hiddenCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  cursor: "pointer",
                  background: active
                    ? "rgba(255,255,255,0.06)"
                    : "transparent",
                  border: `1px solid ${
                    active
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(255,255,255,0.06)"
                  }`,
                  opacity: active ? 1 : 0.35,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    background: CATEGORY_COLORS[cat],
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    color: active
                      ? CATEGORY_COLORS[cat]
                      : "rgba(255,255,255,0.3)",
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </span>
              </button>
            );
          })}
          <button
            onClick={onClose}
            style={{
              marginLeft: 12,
              fontSize: 10,
              padding: "3px 10px",
              color: "oklch(0.6 0.02 160)",
              cursor: "pointer",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            ESC
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
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
          </ReactFlow>
        </div>

        {selectedNodeData && (
          <DetailPanel node={selectedNodeData} onClose={closeDetail} />
        )}
      </div>

      <LegendBar />
    </div>
  );
}

/**
 * Bento-card preview: shows a miniature static preview with "Open" button.
 * Clicking opens the full DecompositionGraphOverlay.
 */
export function DecompositionGraphTab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Card content: mini preview + open button */}
      <div style={{ padding: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 6,
            marginBottom: 16,
          }}
        >
          {(["layout", "component", "pattern", "style", "interaction"] as const).map(
            (cat) => (
              <div
                key={cat}
                style={{
                  padding: "6px 4px",
                  textAlign: "center",
                  borderLeft: `2px solid ${CATEGORY_COLORS[cat]}`,
                  borderBottom: `1px solid rgba(255,255,255,0.06)`,
                  background: `${CATEGORY_COLORS[cat]}08`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    color: CATEGORY_COLORS[cat],
                    marginBottom: 2,
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </div>
                <div style={{ fontSize: 11, color: "oklch(0.7 0.02 160)" }}>
                  {cat === "layout" && "4 nodes"}
                  {cat === "component" && "6 nodes"}
                  {cat === "pattern" && "5 nodes"}
                  {cat === "style" && "4 nodes"}
                  {cat === "interaction" && "4 nodes"}
                </div>
              </div>
            )
          )}
        </div>

        <div
          style={{
            fontSize: 11,
            color: "oklch(0.6 0.02 160)",
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          Interactive node graph: 5 layers, 25 nodes, tree edges +
          cross-dependencies. Click to explore full decomposition with
          mini-map, filters, and detail panel.
        </div>

        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: "100%",
            padding: "10px 16px",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            color: "oklch(0.93 0.01 160)",
            background: "oklch(0.72 0.17 155 / 15%)",
            border: `1px solid oklch(0.72 0.17 155 / 30%)`,
            borderTop: "2px solid oklch(0.72 0.17 155)",
          }}
        >
          Open Decomposition Graph
        </button>
      </div>

      {/* Full-screen overlay */}
      {isOpen && (
        <DecompositionGraphOverlay onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
