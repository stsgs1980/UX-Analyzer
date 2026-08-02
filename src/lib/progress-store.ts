/**
 * In-memory progress store for polling-based analysis tracking.
 * Replaces long-lived SSE connections that get killed by proxy timeouts.
 */

export interface ProgressEntry {
  analysisId: string;
  status: "running" | "completed" | "error";
  progress: number;
  step: string;
  message: string;
  result?: Record<string, unknown> | null;
  designMd?: string | null;
  referenceCode?: string | null;
  codePreviewHtml?: string | null;
  rscPayload?: Record<string, unknown> | null;
  error?: string | null;
  updatedAt: number;
}

const store = new Map<string, ProgressEntry>();

/** Auto-cleanup entries older than 1 hour (run on each write) */
function cleanup() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, entry] of store) {
    if (entry.updatedAt < cutoff) store.delete(id);
  }
}

export function initProgress(analysisId: string): ProgressEntry {
  const entry: ProgressEntry = {
    analysisId,
    status: "running",
    progress: 0,
    step: "preparing",
    message: "Подготовка к анализу...",
    updatedAt: Date.now(),
  };
  store.set(analysisId, entry);
  cleanup();
  return entry;
}

export function updateProgress(
  analysisId: string,
  update: Partial<Pick<ProgressEntry, "progress" | "step" | "message" | "status" | "result" | "designMd" | "referenceCode" | "codePreviewHtml" | "rscPayload" | "error">>
) {
  const entry = store.get(analysisId);
  if (!entry) return;
  Object.assign(entry, update, { updatedAt: Date.now() });
  cleanup();
}

export function getProgress(analysisId: string): ProgressEntry | null {
  return store.get(analysisId) || null;
}
