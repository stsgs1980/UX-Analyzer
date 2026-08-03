/**
 * Source type icon helper — returns an SVG icon or branded indicator
 * for each adapter type in the UX-Analyzer UI.
 *
 * lucide-react doesn't have brand icons (Dribbble, Behance, etc.),
 * so we use small colored indicators with first-letter badges.
 */

import type { LucideIcon } from 'lucide-react';
import { Globe, Image, Pin, LayoutGrid, PenTool, Code2, Github, Layers } from 'lucide-react';

export interface SourceTypeInfo {
  /** Lucide icon for the source type */
  icon: LucideIcon;
  /** Display label */
  label: string;
  /** Tailwind color class for the icon */
  color: string;
  /** Tailwind bg class for badge backgrounds */
  bg: string;
}

const SOURCE_TYPE_MAP: Record<string, SourceTypeInfo> = {
  url: {
    icon: Globe,
    label: 'Web Page',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  image: {
    icon: Image,
    label: 'Image',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
  },
  pinterest: {
    icon: Pin,
    label: 'Pinterest',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
  },
  'pinterest-board': {
    icon: LayoutGrid,
    label: 'Pinterest Board',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
  },
  dribbble: {
    icon: PenTool,
    label: 'Dribbble',
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
  },
  behance: {
    icon: Layers,
    label: 'Behance',
    color: 'text-blue-300',
    bg: 'bg-blue-300/10',
  },
  codepen: {
    icon: Code2,
    label: 'CodePen',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  github: {
    icon: Github,
    label: 'GitHub',
    color: 'text-gray-300',
    bg: 'bg-gray-400/10',
  },
  upload: {
    icon: Image,
    label: 'Upload',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
  },
};

const DEFAULT_INFO: SourceTypeInfo = {
  icon: Globe,
  label: 'URL',
  color: 'text-muted-foreground',
  bg: 'bg-muted-foreground/10',
};

/**
 * Get source type info (icon, label, colors) for a given source type string.
 */
export function getSourceTypeInfo(sourceType?: string | null): SourceTypeInfo {
  if (!sourceType) return DEFAULT_INFO;
  return SOURCE_TYPE_MAP[sourceType] || DEFAULT_INFO;
}

/**
 * Get the badge text for source type display in results header.
 */
export function getSourceTypeBadgeText(sourceType?: string | null, isBatch?: boolean): string {
  if (!sourceType) return isBatch ? 'Batch' : 'Single';
  const info = getSourceTypeInfo(sourceType);
  return info.label;
}

/** Source types that support re-run (have refetchable URLs) */
const RERUNNABLE_TYPES = new Set([
  'url',
  'pinterest',
  'pinterest-board',
  'dribbble',
  'behance',
  'codepen',
  'github',
]);

/**
 * Check if a source type supports re-run / re-analysis.
 * Image uploads cannot be re-fetched.
 */
export function isRerunnable(sourceType?: string | null): boolean {
  if (!sourceType) return false;
  return RERUNNABLE_TYPES.has(sourceType);
}
