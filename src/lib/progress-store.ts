/**
 * In-memory progress store for analysis pipeline.
 * Used by the polling architecture (replaces SSE).
 * Each analysis gets an entry that's updated by ctx.send() and read by the poll endpoint.
 */

export interface ProgressEntry {
  step: string;
  message: string;
  progress: number;
  status: "running" | "completed" | "error";
  result?: Record<string, unknown> | null;
  error?: string | null;
  designMd?: string | null;
  referenceCode?: string | null;
  codePreviewHtml?: string | null;
  rscPayload?: Record<string, unknown> | null;
  /** Timestamp of last update (for cleanup) */
  updatedAt: number;
}

const store = new Map<string, ProgressEntry>();

// Auto-cleanup: remove entries older than 10 minutes every 5 minutes
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [id, entry] of store) {
      if (entry.updatedAt < cutoff) store.delete(id);
    }
  }, 5 * 60 * 1000).unref();
}

export function initProgress(analysisId: string): void {
  store.set(analysisId, {
    step: "init",
    message: "Инициализация...",
    progress: 0,
    status: "running",
    updatedAt: Date.now(),
  });
}

export function updateProgress(analysisId: string, update: Partial<ProgressEntry>): void {
  const entry = store.get(analysisId);
  if (entry) {
    Object.assign(entry, update, { updatedAt: Date.now() });
  }
}

export function getProgress(analysisId: string): ProgressEntry | undefined {
  return store.get(analysisId);
}

export function completeProgress(analysisId: string, result: Record<string, unknown>): void {
  const entry = store.get(analysisId);
  if (entry) {
    entry.status = "completed";
    entry.result = result;
    entry.step = "done";
    entry.message = "Анализ завершён!";
    entry.progress = 1;
    entry.updatedAt = Date.now();
  }
}

export function errorProgress(analysisId: string, error: string): void {
  const entry = store.get(analysisId);
  if (entry) {
    entry.status = "error";
    entry.error = error;
    entry.updatedAt = Date.now();
  }
}

export function deleteProgress(analysisId: string): void {
  store.delete(analysisId);
}