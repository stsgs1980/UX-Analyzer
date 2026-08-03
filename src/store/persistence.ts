import type { AnalysisResult } from './types';

const STORAGE_KEY = 'ux-analyzer:last-result';

export function persistResult(
  result: AnalysisResult | null,
  analysisId: string | null,
  designMd: string | null,
) {
  if (typeof window === 'undefined' || !result) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ result, analysisId, designMd, ts: Date.now() }),
    );
  } catch {
    /* quota exceeded — ignore */
  }
}

export function restoreResult(): {
  result: AnalysisResult;
  analysisId: string;
  designMd: string | null;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 30 minutes
    if (Date.now() - data.ts > 30 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { result: data.result, analysisId: data.analysisId, designMd: data.designMd || null };
  } catch {
    return null;
  }
}

export function clearPersistedResult() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}
