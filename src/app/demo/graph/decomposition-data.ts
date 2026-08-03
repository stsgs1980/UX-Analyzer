import type { Node, Edge } from '@xyflow/react';

/* ─────────────────────────────────────────────
   Mock Design Decomposition Data
   Represents a typical UX Analyzer output:
   component tree + cross-dependency edges
   ───────────────────────────────────────────── */

export type NodeCategory = 'layout' | 'component' | 'pattern' | 'style' | 'interaction';

export interface DesignNodeData extends Record<string, unknown> {
  label: string;
  category: NodeCategory;
  description: string;
  tags: string[];
  complexity: 1 | 2 | 3; // visual weight: 1=leaf, 2=branch, 3=root
}

// Category color map (oklch, matching the app's dark theme)
export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  layout: 'oklch(0.72 0.17 155)', // eco green
  component: 'oklch(0.65 0.1 230)', // ocean blue
  pattern: 'oklch(0.75 0.12 75)', // earth amber
  style: 'oklch(0.68 0.15 320)', // chart-4 purple
  interaction: 'oklch(0.70 0.14 45)', // chart-5 orange
};

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  layout: 'Layout',
  component: 'Component',
  pattern: 'Pattern',
  style: 'Style Token',
  interaction: 'Interaction',
};

export const initialNodes: Node<DesignNodeData>[] = [
  // ═══ Root ═══
  {
    id: 'root',
    type: 'designRoot',
    position: { x: 600, y: 0 },
    data: {
      label: 'Design System',
      category: 'layout',
      description: 'Root design system container',
      tags: ['system'],
      complexity: 3,
    },
  },

  // ═══ Layout Layer ═══
  {
    id: 'hero',
    type: 'designNode',
    position: { x: 0, y: 120 },
    data: {
      label: 'Hero Section',
      category: 'layout',
      description:
        'Full-width hero with background gradient, headline, sub-copy, and primary CTA. Uses clamp() for fluid typography and layered OKLCH gradients for depth.',
      tags: ['full-width', 'fluid-typography', 'gradient', 'CTA'],
      complexity: 3,
    },
  },
  {
    id: 'nav',
    type: 'designNode',
    position: { x: 350, y: 120 },
    data: {
      label: 'Navigation',
      category: 'layout',
      description:
        'Sticky top navigation with logo, nav links, and mobile hamburger. Glass-morphism backdrop with subtle blur.',
      tags: ['sticky', 'glass', 'responsive', 'mobile-menu'],
      complexity: 2,
    },
  },
  {
    id: 'grid',
    type: 'designNode',
    position: { x: 700, y: 120 },
    data: {
      label: 'Content Grid',
      category: 'layout',
      description:
        '8-column bento grid with responsive breakpoints (4-col tablet, 1-col mobile). 12px gap. Asymmetric spanning for visual hierarchy.',
      tags: ['bento', '8-col', 'responsive', 'asymmetric'],
      complexity: 2,
    },
  },
  {
    id: 'footer',
    type: 'designNode',
    position: { x: 1050, y: 120 },
    data: {
      label: 'Footer',
      category: 'layout',
      description:
        'Minimal footer with link columns, copyright, and social icons. Broken-line decorative borders.',
      tags: ['columns', 'social', 'minimal'],
      complexity: 1,
    },
  },

  // ═══ Component Layer ═══
  {
    id: 'btn-primary',
    type: 'designNode',
    position: { x: -80, y: 320 },
    data: {
      label: 'Primary Button',
      category: 'component',
      description:
        'Filled CTA with eco-green background, text-sm, tracking-wide. Hover: brightness + glow effect. Focus: ring outline.',
      tags: ['filled', 'glow-hover', 'focus-ring', 'sm'],
      complexity: 1,
    },
  },
  {
    id: 'card',
    type: 'designNode',
    position: { x: 200, y: 320 },
    data: {
      label: 'Bento Card',
      category: 'component',
      description:
        'Transparent card with 1px border, hover border-color transition. No rounded corners (design token: radius=0). Shallow elevation on hover.',
      tags: ['transparent', 'border', 'hover-state', 'no-radius'],
      complexity: 2,
    },
  },
  {
    id: 'badge',
    type: 'designNode',
    position: { x: 480, y: 320 },
    data: {
      label: 'Badge / Label',
      category: 'component',
      description:
        'Uppercase micro-label (10px, tracking-0.3em). Used for methodology tags, scores, and status indicators.',
      tags: ['uppercase', 'micro', 'tracking-label', '10px'],
      complexity: 1,
    },
  },
  {
    id: 'accordion',
    type: 'designNode',
    position: { x: 700, y: 320 },
    data: {
      label: 'Accordion',
      category: 'component',
      description:
        'Collapsible sections with chevron rotation animation. Broken-line decorative borders on open state.',
      tags: ['collapsible', 'chevron', 'animation', 'broken-line'],
      complexity: 2,
    },
  },
  {
    id: 'tabs',
    type: 'designNode',
    position: { x: 920, y: 320 },
    data: {
      label: 'Tab Group',
      category: 'component',
      description:
        'Horizontal tab navigation with bottom-border indicator. Active tab uses eco-green accent line.',
      tags: ['horizontal', 'indicator', 'accent-line'],
      complexity: 1,
    },
  },
  {
    id: 'input',
    type: 'designNode',
    position: { x: 1140, y: 320 },
    data: {
      label: 'Input Field',
      category: 'component',
      description:
        'Text input with border-bottom style, focus glow effect. Placeholder uses muted-foreground token.',
      tags: ['border-bottom', 'focus-glow', 'muted-placeholder'],
      complexity: 1,
    },
  },

  // ═══ Pattern Layer ═══
  {
    id: 'scroll-reveal',
    type: 'designNode',
    position: { x: 50, y: 510 },
    data: {
      label: 'Scroll Reveal',
      category: 'pattern',
      description:
        'Intersection Observer driven fade-up animation. CSS-only with [data-reveal] attribute. Stagger support via [data-reveal-stagger].',
      tags: ['intersection-observer', 'fade-up', 'stagger', 'CSS-only'],
      complexity: 2,
    },
  },
  {
    id: 'fluid-type',
    type: 'designNode',
    position: { x: 310, y: 510 },
    data: {
      label: 'Fluid Typography',
      category: 'pattern',
      description:
        'clamp()-based responsive type scale from 10px to 36px. Hero uses viewport-relative sizing (24vw). Geist Sans + Geist Mono.',
      tags: ['clamp', 'viewport-relative', 'type-scale', 'geist'],
      complexity: 2,
    },
  },
  {
    id: 'scan-line',
    type: 'designNode',
    position: { x: 570, y: 510 },
    data: {
      label: 'Scan Line Effect',
      category: 'pattern',
      description:
        'Animated horizontal line sweeping top-to-bottom. Used in VLM analysis sections. 3s ease-in-out infinite.',
      tags: ['animation', 'sweep', 'VLM-accent', '3s-loop'],
      complexity: 1,
    },
  },
  {
    id: 'skew-decor',
    type: 'designNode',
    position: { x: 830, y: 510 },
    data: {
      label: 'Skew Decoration',
      category: 'pattern',
      description:
        'SkewX(-12deg) / SkewX(12deg) pair for inner content. Creates diagonal accent sections.',
      tags: ['skew', 'diagonal', 'decorative', 'transform'],
      complexity: 1,
    },
  },
  {
    id: 'crosshatch',
    type: 'designNode',
    position: { x: 1090, y: 510 },
    data: {
      label: 'Crosshatch BG',
      category: 'pattern',
      description:
        'Repeating linear-gradient crosshatch pattern in eco-green at 4% opacity. Used as subtle section background.',
      tags: ['gradient', 'crosshatch', 'subtle', '4%-opacity'],
      complexity: 1,
    },
  },

  // ═══ Style Tokens Layer ═══
  {
    id: 'colors',
    type: 'designNode',
    position: { x: 100, y: 700 },
    data: {
      label: 'OKLCH Colors',
      category: 'style',
      description:
        'Full palette in OKLCH color space. Background: oklch(0.09 0.005 160). Primary: oklch(0.72 0.17 155). OLED-friendly deep dark.',
      tags: ['OKLCH', 'oled-dark', 'color-space', 'eco-green'],
      complexity: 2,
    },
  },
  {
    id: 'typography',
    type: 'designNode',
    position: { x: 400, y: 700 },
    data: {
      label: 'Type Scale',
      category: 'style',
      description:
        '8-step modular scale: 10px micro to 36px display. Custom CSS properties (--t-micro through --t-4xl). Line-height tokens included.',
      tags: ['modular-scale', 'CSS-custom', '8-step', 'leading-tokens'],
      complexity: 2,
    },
  },
  {
    id: 'spacing',
    type: 'designNode',
    position: { x: 700, y: 700 },
    data: {
      label: 'Spacing / Radius',
      category: 'style',
      description:
        'Global radius: 0 (no rounded corners). Gap system: 12px base. Tailwind spacing tokens.',
      tags: ['no-radius', '12px-gap', 'tailwind-spacing'],
      complexity: 1,
    },
  },
  {
    id: 'motion',
    type: 'designNode',
    position: { x: 1000, y: 700 },
    data: {
      label: 'Motion Tokens',
      category: 'style',
      description:
        'Easing: cubic-bezier(0.23, 1, 0.32, 1). Duration: 0.3s base. prefers-reduced-motion respected globally.',
      tags: ['easing', '0.3s', 'a11y', 'reduced-motion'],
      complexity: 1,
    },
  },

  // ═══ Interaction Layer ═══
  {
    id: 'hover-glow',
    type: 'designNode',
    position: { x: 50, y: 880 },
    data: {
      label: 'Hover Glow',
      category: 'interaction',
      description:
        'text-shadow glow on hover: oklch(0.72 0.17 155 / 50%). Applied to headings and accent elements.',
      tags: ['text-shadow', 'glow', 'hover', 'accent'],
      complexity: 1,
    },
  },
  {
    id: 'line-hover',
    type: 'designNode',
    position: { x: 350, y: 880 },
    data: {
      label: 'Line Color Shift',
      category: 'interaction',
      description:
        'Border-left color transition on hover (eco -> earth amber). Used in list items and sidebar navigation.',
      tags: ['border-color', 'transition', 'earth-accent', 'hover-state'],
      complexity: 1,
    },
  },
  {
    id: 'slide-right',
    type: 'designNode',
    position: { x: 650, y: 880 },
    data: {
      label: 'Slide Right',
      category: 'interaction',
      description:
        'translateX(4px) on hover with 0.3s easing. Used for navigation items and interactive list elements.',
      tags: ['translateX', '4px', 'navigation', 'hover'],
      complexity: 1,
    },
  },
  {
    id: 'underline-grow',
    type: 'designNode',
    position: { x: 950, y: 880 },
    data: {
      label: 'Underline Grow',
      category: 'interaction',
      description:
        'Bottom border width animates 0 -> 100% on hover. 1px solid currentColor. Used for text links.',
      tags: ['width-animation', 'border-bottom', 'links', '1px'],
      complexity: 1,
    },
  },
];

// Tree edges (parent -> child)
const treeEdges: Edge[] = [
  // Root -> Layouts
  { id: 'e-root-hero', source: 'root', target: 'hero', type: 'smoothstep' },
  { id: 'e-root-nav', source: 'root', target: 'nav', type: 'smoothstep' },
  { id: 'e-root-grid', source: 'root', target: 'grid', type: 'smoothstep' },
  { id: 'e-root-footer', source: 'root', target: 'footer', type: 'smoothstep' },
  // Layout -> Components
  { id: 'e-hero-btn', source: 'hero', target: 'btn-primary', type: 'smoothstep' },
  { id: 'e-hero-card', source: 'hero', target: 'card', type: 'smoothstep' },
  { id: 'e-nav-badge', source: 'nav', target: 'badge', type: 'smoothstep' },
  { id: 'e-grid-card', source: 'grid', target: 'card', type: 'smoothstep' },
  { id: 'e-grid-accordion', source: 'grid', target: 'accordion', type: 'smoothstep' },
  { id: 'e-grid-tabs', source: 'grid', target: 'tabs', type: 'smoothstep' },
  { id: 'e-grid-input', source: 'grid', target: 'input', type: 'smoothstep' },
  // Component -> Patterns
  { id: 'e-card-scroll', source: 'card', target: 'scroll-reveal', type: 'smoothstep' },
  { id: 'e-hero-fluid', source: 'hero', target: 'fluid-type', type: 'smoothstep' },
  { id: 'e-accordion-scan', source: 'accordion', target: 'scan-line', type: 'smoothstep' },
  { id: 'e-card-skew', source: 'card', target: 'skew-decor', type: 'smoothstep' },
  { id: 'e-card-cross', source: 'card', target: 'crosshatch', type: 'smoothstep' },
  // Pattern -> Style
  { id: 'e-fluid-type', source: 'fluid-type', target: 'typography', type: 'smoothstep' },
  { id: 'e-scroll-colors', source: 'scroll-reveal', target: 'colors', type: 'smoothstep' },
  { id: 'e-cross-spacing', source: 'crosshatch', target: 'spacing', type: 'smoothstep' },
  { id: 'e-scan-motion', source: 'scan-line', target: 'motion', type: 'smoothstep' },
  // Style -> Interaction
  { id: 'e-colors-glow', source: 'colors', target: 'hover-glow', type: 'smoothstep' },
  { id: 'e-colors-line', source: 'colors', target: 'line-hover', type: 'smoothstep' },
  { id: 'e-motion-slide', source: 'motion', target: 'slide-right', type: 'smoothstep' },
  { id: 'e-motion-underline', source: 'motion', target: 'underline-grow', type: 'smoothstep' },
];

// Cross-dependency edges (dashed, show shared dependencies)
const crossEdges: Edge[] = [
  // btn-primary uses colors + motion tokens
  {
    id: 'cross-btn-colors',
    source: 'btn-primary',
    target: 'colors',
    type: 'straight',
    style: { strokeDasharray: '6 4' },
    label: 'uses tokens',
  },
  {
    id: 'cross-btn-motion',
    source: 'btn-primary',
    target: 'motion',
    type: 'straight',
    style: { strokeDasharray: '6 4' },
  },
  // card uses scroll-reveal pattern
  {
    id: 'cross-card-hover',
    source: 'card',
    target: 'hover-glow',
    type: 'straight',
    style: { strokeDasharray: '6 4' },
  },
  // accordion uses motion tokens
  {
    id: 'cross-acc-motion',
    source: 'accordion',
    target: 'motion',
    type: 'straight',
    style: { strokeDasharray: '6 4' },
  },
  // tabs uses colors
  {
    id: 'cross-tabs-colors',
    source: 'tabs',
    target: 'colors',
    type: 'straight',
    style: { strokeDasharray: '6 4' },
  },
  // input uses motion tokens for focus glow
  {
    id: 'cross-input-motion',
    source: 'input',
    target: 'motion',
    type: 'straight',
    style: { strokeDasharray: '6 4' },
  },
  // hero uses scroll-reveal
  {
    id: 'cross-hero-reveal',
    source: 'hero',
    target: 'scroll-reveal',
    type: 'straight',
    style: { strokeDasharray: '6 4' },
  },
];

export const initialEdges: Edge[] = [
  ...treeEdges.map((e) => ({
    ...e,
    animated: false,
    style: { stroke: 'oklch(0.72 0.17 155 / 25%)', strokeWidth: 1.5 },
  })),
  ...crossEdges.map((e) => ({
    ...e,
    animated: true,
    style: {
      ...e.style,
      stroke: 'oklch(0.75 0.12 75 / 30%)',
      strokeWidth: 1,
    },
  })),
];
