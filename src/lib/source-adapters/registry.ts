/**
 * Adapter Registry — resolves input URLs/images to the correct adapter.
 *
 * URL pattern matching order matters: more specific patterns first.
 * Falls back to UrlAdapter for anything that doesn't match.
 */

import type { SourceType, SourceAdapter, FetchContext } from './types';

/** Pattern → SourceType mapping, checked in order (first match wins) */
interface UrlPattern {
  /** Regex pattern to test against URL */
  pattern: RegExp;
  /** Source type to return on match */
  type: SourceType;
  /** Human-readable label */
  label: string;
}

/**
 * Ordered URL patterns — most specific first.
 * Pinterest board pattern must come before single pin pattern.
 */
const URL_PATTERNS: UrlPattern[] = [
  {
    pattern: /pinterest\.[a-z]+\/[^/]+\/boards\//i,
    type: 'pinterest-board',
    label: 'Pinterest Board',
  },
  {
    pattern: /pinterest\.[a-z]+\//i,
    type: 'pinterest',
    label: 'Pinterest Pin',
  },
  {
    pattern: /dribbble\.com\/shots\//i,
    type: 'dribbble',
    label: 'Dribbble Shot',
  },
  {
    pattern: /behance\.net\/gallery\//i,
    type: 'behance',
    label: 'Behance Project',
  },
  {
    pattern: /codepen\.io\//i,
    type: 'codepen',
    label: 'CodePen',
  },
  {
    pattern: /github\.com\/[^/]+\/[^/]+/i,
    type: 'github',
    label: 'GitHub Repository',
  },
];

/**
 * Detect source type from a single URL.
 * Returns null if no pattern matches (handled as generic "url").
 */
function detectUrlType(url: string): SourceType | null {
  for (const p of URL_PATTERNS) {
    if (p.pattern.test(url)) {
      return p.type;
    }
  }
  return null;
}

/**
 * Detect source type from direct image URL (png, jpg, gif, webp, svg).
 */
function isDirectImageUrl(url: string): boolean {
  return /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(url);
}

/**
 * Resolve the primary source type from input.
 *
 * Priority:
 * 1. Image upload (base64 present) → "image"
 * 2. URL pattern match → specific adapter type
 * 3. Direct image URL → "image"
 * 4. Everything else → "url"
 */
export function resolveSourceType(urls: string[], imageBase64?: string): SourceType {
  // Image upload takes priority
  if (imageBase64) {
    return 'image';
  }

  // Check URL patterns (first URL wins for mixed input)
  if (urls.length > 0) {
    for (const url of urls) {
      const detected = detectUrlType(url);
      if (detected) return detected;
    }
    // Direct image URL
    if (isDirectImageUrl(urls[0])) {
      return 'image';
    }
  }

  return 'url';
}

/**
 * Get human-readable label for a source type.
 */
export function getSourceTypeLabel(type: SourceType): string {
  const pattern = URL_PATTERNS.find((p) => p.type === type);
  if (pattern) return pattern.label;

  const labels: Record<string, string> = {
    url: 'Web Page',
    image: 'Image',
  };
  return labels[type] || type;
}

/** Check if a URL matches a specific source type */
export function isUrlOfType(url: string, type: SourceType): boolean {
  return detectUrlType(url) === type;
}
