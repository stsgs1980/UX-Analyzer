'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { DesignNodeData } from './decomposition-data';
import { CATEGORY_COLORS } from './decomposition-data';

export function DesignRootNode({ data }: NodeProps) {
  const d = data as unknown as DesignNodeData;
  const color = CATEGORY_COLORS[d.category];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: color, width: 8, height: 8, border: 'none' }}
      />
      <div
        style={{
          padding: '16px 32px',
          textAlign: 'center',
          background: 'oklch(0.13 0.008 160)',
          border: `1px solid ${color}`,
          borderTop: `3px solid ${color}`,
        }}
      >
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            color,
            marginBottom: 4,
          }}
        >
          {d.category}
        </div>
        <div style={{ fontSize: 20, fontWeight: 'bold', color: 'oklch(0.93 0.01 160)' }}>
          {d.label}
        </div>
        <div style={{ fontSize: 11, marginTop: 4, color: 'oklch(0.6 0.02 160)' }}>
          {d.description}
        </div>
      </div>
    </div>
  );
}

export function DesignNode({ data, selected }: NodeProps) {
  const d = data as unknown as DesignNodeData;
  const color = CATEGORY_COLORS[d.category];

  const pad = d.complexity === 3 ? 16 : d.complexity === 2 ? 12 : 8;
  const titleSize = d.complexity === 3 ? 16 : d.complexity === 2 ? 14 : 12;

  return (
    <div style={{ position: 'relative' }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: color, width: 6, height: 6, border: 'none' }}
      />

      <div
        style={{
          padding: pad,
          maxWidth: 220,
          background: selected ? 'oklch(0.15 0.01 160)' : 'oklch(0.11 0.007 160)',
          borderTop: `1px solid ${selected ? color : 'rgba(255,255,255,0.06)'}`,
          borderRight: `1px solid ${selected ? color : 'rgba(255,255,255,0.06)'}`,
          borderBottom: `1px solid ${selected ? color : 'rgba(255,255,255,0.06)'}`,
          borderLeft: `2px solid ${color}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 6, height: 6, display: 'inline-block', background: color }} />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', color }}>
            {d.category}
          </span>
          {d.complexity === 3 && (
            <span style={{ fontSize: 9, marginLeft: 'auto', color: 'oklch(0.5 0.02 160)' }}>
              root
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: titleSize,
            fontWeight: d.complexity === 3 ? 'bold' : d.complexity === 2 ? 600 : 500,
            color: 'oklch(0.93 0.01 160)',
          }}
        >
          {d.label}
        </div>
        {d.complexity >= 2 && (
          <div
            style={{
              fontSize: 10,
              lineHeight: 1.5,
              marginTop: 6,
              color: 'oklch(0.7 0.02 160)',
              opacity: 0.7,
            }}
          >
            {d.description.length > 80 ? d.description.slice(0, 80) + '...' : d.description}
          </div>
        )}
        {d.complexity >= 2 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {d.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  background: `${color}14`,
                  color,
                  border: `1px solid ${color}26`,
                }}
              >
                {tag}
              </span>
            ))}
            {d.tags.length > 3 && (
              <span style={{ fontSize: 9, padding: '2px 4px', color: 'oklch(0.5 0.02 160)' }}>
                +{d.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: color, width: 6, height: 6, border: 'none' }}
      />
    </div>
  );
}

export function DetailPanel({
  node,
  onClose,
}: {
  node: DesignNodeData | null;
  onClose: () => void;
}) {
  if (!node) return null;
  const color = CATEGORY_COLORS[node.category];

  return (
    <div
      style={{
        width: 320,
        height: '100%',
        overflowY: 'auto',
        padding: 24,
        background: 'oklch(0.10 0.006 160)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, display: 'inline-block', background: color }} />
            <span
              style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', color }}
            >
              {node.category}
            </span>
          </div>
          <h2
            style={{ fontSize: 18, fontWeight: 'bold', color: 'oklch(0.93 0.01 160)', margin: 0 }}
          >
            {node.label}
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            fontSize: 11,
            padding: '4px 8px',
            color: 'oklch(0.6 0.02 160)',
            cursor: 'pointer',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          ESC
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            color: 'oklch(0.5 0.02 160)',
            marginBottom: 8,
          }}
        >
          Description
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'oklch(0.8 0.01 160)', margin: 0 }}>
          {node.description}
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            color: 'oklch(0.5 0.02 160)',
            marginBottom: 8,
          }}
        >
          Complexity
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3].map((level) => (
            <div
              key={level}
              style={{
                width: 24,
                height: 4,
                background: level <= node.complexity ? color : 'rgba(255,255,255,0.06)',
              }}
            />
          ))}
          <span style={{ fontSize: 10, marginLeft: 8, color: 'oklch(0.6 0.02 160)' }}>
            {node.complexity === 3 ? 'root' : node.complexity === 2 ? 'branch' : 'leaf'}
          </span>
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            color: 'oklch(0.5 0.02 160)',
            marginBottom: 8,
          }}
        >
          Tags
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {node.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 10,
                padding: '4px 8px',
                background: `${color}14`,
                color: `${color}b3`,
                border: `1px solid ${color}33`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LegendBar() {
  const items: Array<{ key: string; label: string; color: string }> = [
    { key: 'layout', label: 'Layout', color: CATEGORY_COLORS.layout },
    { key: 'component', label: 'Component', color: CATEGORY_COLORS.component },
    { key: 'pattern', label: 'Pattern', color: CATEGORY_COLORS.pattern },
    { key: 'style', label: 'Style Token', color: CATEGORY_COLORS.style },
    { key: 'interaction', label: 'Interaction', color: CATEGORY_COLORS.interaction },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '8px 16px',
        background: 'oklch(0.10 0.006 160)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.3em',
          color: 'oklch(0.5 0.02 160)',
        }}
      >
        Layers
      </span>
      {items.map((item) => (
        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, display: 'inline-block', background: item.color }} />
          <span style={{ fontSize: 10, color: item.color }}>{item.label}</span>
        </div>
      ))}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 24, height: 1, background: 'oklch(0.72 0.17 155 / 30%)' }} />
          <span style={{ fontSize: 9, color: 'oklch(0.5 0.02 160)' }}>tree</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{ width: 24, height: 0, borderTop: '1px dashed oklch(0.75 0.12 75 / 30%)' }}
          />
          <span style={{ fontSize: 9, color: 'oklch(0.5 0.02 160)' }}>cross-dep</span>
        </div>
      </div>
    </div>
  );
}
