"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DesignNodeData } from "./decomposition-data";
import { CATEGORY_COLORS } from "./decomposition-data";

export function DesignRootNode({ data }: NodeProps) {
  const d = data as unknown as DesignNodeData;
  const color = CATEGORY_COLORS[d.category];

  return (
    <div className="relative flex flex-col items-center">
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-2 !h-2" style={{ background: color }} />
      <div
        className="px-8 py-4 text-center"
        style={{
          background: `oklch(0.13 0.008 160)`,
          border: `1px solid ${color}`,
          borderTop: `3px solid ${color}`,
        }}
      >
        <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color }}>
          {d.category}
        </div>
        <div className="text-xl font-bold tracking-tight" style={{ color: "oklch(0.93 0.01 160)" }}>
          {d.label}
        </div>
        <div className="text-[11px] mt-1" style={{ color: "oklch(0.6 0.02 160)" }}>
          {d.description}
        </div>
      </div>
    </div>
  );
}

export function DesignNode({ data, selected }: NodeProps) {
  const d = data as unknown as DesignNodeData;
  const color = CATEGORY_COLORS[d.category];

  // Size by complexity
  const padding = d.complexity === 3 ? "px-6 py-4" : d.complexity === 2 ? "px-5 py-3" : "px-4 py-2";
  const titleSize = d.complexity === 3 ? "text-base font-bold" : d.complexity === 2 ? "text-sm font-semibold" : "text-xs font-medium";

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-1.5 !h-1.5" style={{ background: color }} />
      
      <div
        className={`${padding} transition-all duration-200 max-w-[220px]`}
        style={{
          background: selected
            ? `oklch(0.15 0.01 160)`
            : `oklch(0.11 0.007 160)`,
          border: `1px solid ${selected ? color : `${color} / 20%`}`,
          borderLeft: `2px solid ${color}`,
        }}
      >
        {/* Category chip */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-1.5 h-1.5 inline-block"
            style={{ background: color }}
          />
          <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: `${color} / 70%` }}>
            {d.category}
          </span>
          {d.complexity === 3 && (
            <span className="text-[9px] ml-auto" style={{ color: "oklch(0.5 0.02 160)" }}>
              root
            </span>
          )}
        </div>

        {/* Title */}
        <div className={`${titleSize} tracking-tight`} style={{ color: "oklch(0.93 0.01 160)" }}>
          {d.label}
        </div>

        {/* Description - only on hover for small nodes */}
        {d.complexity >= 2 && (
          <div
            className="text-[10px] leading-relaxed mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ color: "oklch(0.7 0.02 160)" }}
          >
            {d.description.length > 80 ? d.description.slice(0, 80) + "..." : d.description}
          </div>
        )}

        {/* Tags */}
        {d.complexity >= 2 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {d.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5"
                style={{
                  background: `${color} / 10%`,
                  color: `${color} / 60%`,
                  border: `1px solid ${color} / 15%`,
                }}
              >
                {tag}
              </span>
            ))}
            {d.tags.length > 3 && (
              <span className="text-[9px] px-1 py-0.5" style={{ color: "oklch(0.5 0.02 160)" }}>
                +{d.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-1.5 !h-1.5" style={{ background: color }} />
    </div>
  );
}

export function DetailPanel({ node, onClose }: { node: DesignNodeData | null; onClose: () => void }) {
  if (!node) return null;
  const color = CATEGORY_COLORS[node.category];

  return (
    <div
      className="w-80 h-full overflow-y-auto p-6"
      style={{
        background: "oklch(0.10 0.006 160)",
        borderLeft: "1px solid oklch(1.0 0 0 / 8%)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 inline-block" style={{ background: color }} />
            <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color }}>
              {node.category}
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: "oklch(0.93 0.01 160)" }}>
            {node.label}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-[11px] px-2 py-1 transition-colors hover:bg-white/5"
          style={{ color: "oklch(0.6 0.02 160)" }}
        >
          ESC
        </button>
      </div>

      {/* Description */}
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: "oklch(0.5 0.02 160)" }}>
          Description
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "oklch(0.8 0.01 160)" }}>
          {node.description}
        </p>
      </div>

      {/* Complexity */}
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: "oklch(0.5 0.02 160)" }}>
          Complexity
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((level) => (
            <div
              key={level}
              className="w-6 h-1"
              style={{
                background: level <= node.complexity ? color : "oklch(1.0 0 0 / 10%)",
              }}
            />
          ))}
          <span className="text-[10px] ml-2" style={{ color: "oklch(0.6 0.02 160)" }}>
            {node.complexity === 3 ? "root" : node.complexity === 2 ? "branch" : "leaf"}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: "oklch(0.5 0.02 160)" }}>
          Tags
        </div>
        <div className="flex flex-wrap gap-1.5">
          {node.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-1"
              style={{
                background: `${color} / 10%`,
                color: `${color} / 70%`,
                border: `1px solid ${color} / 20%`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Dependency hint */}
      <div className="mt-8 pt-4" style={{ borderTop: "1px dashed oklch(1.0 0 0 / 8%)" }}>
        <div className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: "oklch(0.5 0.02 160)" }}>
          Legend
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-px" style={{ background: "oklch(0.72 0.17 155 / 25%)" }} />
            <span className="text-[10px]" style={{ color: "oklch(0.6 0.02 160)" }}>Tree edge</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-px border-t border-dashed" style={{ borderColor: "oklch(0.75 0.12 75 / 30%)" }} />
            <span className="text-[10px]" style={{ color: "oklch(0.6 0.02 160)" }}>Cross-dependency</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LegendBar() {
  const categories = ["layout", "component", "pattern", "style", "interaction"] as const;
  const labels: Record<string, string> = {
    layout: "Layout",
    component: "Component",
    pattern: "Pattern",
    style: "Style Token",
    interaction: "Interaction",
  };

  return (
    <div className="flex items-center gap-4 px-4 py-2" style={{ background: "oklch(0.10 0.006 160)" }}>
      <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "oklch(0.5 0.02 160)" }}>
        Layers
      </span>
      {categories.map((cat) => (
        <div key={cat} className="flex items-center gap-1.5">
          <span className="w-2 h-2 inline-block" style={{ background: CATEGORY_COLORS[cat] }} />
          <span className="text-[10px]" style={{ color: `${CATEGORY_COLORS[cat]} / 70%` }}>
            {labels[cat]}
          </span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-px" style={{ background: "oklch(0.72 0.17 155 / 25%)" }} />
          <span className="text-[9px]" style={{ color: "oklch(0.5 0.02 160)" }}>tree</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-px border-t border-dashed" style={{ borderColor: "oklch(0.75 0.12 75 / 30%)" }} />
          <span className="text-[9px]" style={{ color: "oklch(0.5 0.02 160)" }}>cross-dep</span>
        </div>
      </div>
    </div>
  );
}
