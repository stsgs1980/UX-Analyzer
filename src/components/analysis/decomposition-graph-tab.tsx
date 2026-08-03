'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  buildGraphFromAnalysis,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type DesignNodeData,
} from './decomposition-data';
import { DesignNode, DesignRootNode, DetailPanel, LegendBar } from './graph-components';
import type { AnalysisResult } from '@/store/analysis-store';

const nodeTypes = { designNode: DesignNode, designRoot: DesignRootNode };

/**
 * Full-viewport Decomposition Graph overlay.
 * Populated with REAL pipeline data from AnalysisResult.
 */
export function DecompositionGraphOverlay({
  onClose,
  result,
}: {
  onClose: () => void;
  result: AnalysisResult;
}) {
  const graphData = useMemo(() => buildGraphFromAnalysis(result), [result]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graphData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphData.edges);
  const [selectedNodeData, setSelectedNodeData] = useState<DesignNodeData | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

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
      hidden: hiddenCategories.has((n.data as unknown as DesignNodeData).category),
    }));
  }, [nodes, hiddenCategories]);

  const filteredEdges = useMemo(() => {
    if (hiddenCategories.size === 0) return edges;
    const hiddenNodeIds = new Set(
      nodes
        .filter((n) => hiddenCategories.has((n.data as unknown as DesignNodeData).category))
        .map((n) => n.id),
    );
    return edges.map((e) => ({
      ...e,
      hidden: hiddenNodeIds.has(e.source) || hiddenNodeIds.has(e.target),
    }));
  }, [edges, nodes, hiddenCategories]);

  // ESC key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedNodeData) {
          closeDetail();
        } else {
          onClose();
        }
      }
    },
    [selectedNodeData, closeDetail, onClose],
  );

  useMemo(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Count nodes per category for the header stats
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      layout: 0,
      component: 0,
      pattern: 0,
      style: 0,
      interaction: 0,
    };
    graphData.nodes.forEach((n) => {
      const cat = (n.data as unknown as DesignNodeData).category;
      if (cat in counts) counts[cat]++;
    });
    return counts;
  }, [graphData.nodes]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        background: 'oklch(0.09 0.005 160)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              color: 'oklch(0.5 0.02 160)',
            }}
          >
            Design Decomposition
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'oklch(0.4 0.01 160)',
            }}
          >
            {graphData.nodes.length} nodes / {graphData.edges.length} edges
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((cat) => {
            const active = !hiddenCategories.has(cat);
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: `1px solid ${
                    active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'
                  }`,
                  opacity: active ? 1 : 0.35,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    background: CATEGORY_COLORS[cat],
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    color: active ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {CATEGORY_LABELS[cat]} ({count})
                </span>
              </button>
            );
          })}
          <button
            onClick={onClose}
            style={{
              marginLeft: 12,
              fontSize: 10,
              padding: '3px 10px',
              color: 'oklch(0.6 0.02 160)',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            ESC
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
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

        {selectedNodeData && <DetailPanel node={selectedNodeData} onClose={closeDetail} />}
      </div>

      <LegendBar />
    </div>
  );
}

/**
 * Bento-card preview: shows stats from real data + "Open" button.
 * Clicking opens the full DecompositionGraphOverlay.
 */
export function DecompositionGraphTab({ data }: { data: AnalysisResult }) {
  const [isOpen, setIsOpen] = useState(false);

  // Count nodes per category from real data
  const stats = useMemo(() => {
    const graphData = buildGraphFromAnalysis(data);
    const counts: Record<string, number> = {
      layout: 0,
      component: 0,
      pattern: 0,
      style: 0,
      interaction: 0,
    };
    graphData.nodes.forEach((n) => {
      const d = n.data as unknown as DesignNodeData;
      if (d.category in counts) counts[d.category]++;
    });
    return { total: graphData.nodes.length, edges: graphData.edges.length, counts };
  }, [data]);

  return (
    <>
      {/* Card content: mini preview + open button */}
      <div style={{ padding: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 6,
            marginBottom: 16,
          }}
        >
          {(['layout', 'component', 'pattern', 'style', 'interaction'] as const).map((cat) => (
            <div
              key={cat}
              style={{
                padding: '6px 4px',
                textAlign: 'center',
                borderLeft: `2px solid ${CATEGORY_COLORS[cat]}`,
                borderBottom: `1px solid rgba(255,255,255,0.06)`,
                background: `${CATEGORY_COLORS[cat]}08`,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: CATEGORY_COLORS[cat],
                  marginBottom: 2,
                }}
              >
                {CATEGORY_LABELS[cat]}
              </div>
              <div style={{ fontSize: 11, color: 'oklch(0.7 0.02 160)' }}>
                {stats.counts[cat]} nodes
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 11,
            color: 'oklch(0.6 0.02 160)',
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          Interactive decomposition graph built from analysis data:
          {stats.total} nodes across 5 layers with {stats.edges} connections. Click to explore with
          mini-map, category filters, and detail panel.
        </div>

        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            color: 'oklch(0.93 0.01 160)',
            background: 'oklch(0.72 0.17 155 / 15%)',
            border: `1px solid oklch(0.72 0.17 155 / 30%)`,
            borderTop: '2px solid oklch(0.72 0.17 155)',
          }}
        >
          Open Decomposition Graph
        </button>
      </div>

      {/* Full-screen overlay */}
      {isOpen && <DecompositionGraphOverlay onClose={() => setIsOpen(false)} result={data} />}
    </>
  );
}
