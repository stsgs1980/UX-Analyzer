import type { AnalysisResult, AnalysisStore } from "./types";
import { persistResult } from "./persistence";

/** Polling interval ref — allows cleanup */
let pollTimer: ReturnType<typeof setInterval> | null = null;

export function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function startPolling(
  analysisId: string,
  set: (partial: Partial<AnalysisStore> | ((state: AnalysisStore) => Partial<AnalysisStore>)) => void,
  get: () => AnalysisStore
) {
  stopPolling();

  const POLL_INTERVAL = 2000; // 2 seconds
  let consecutiveErrors = 0;

  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/analyze/progress/${analysisId}`);

      if (!res.ok) {
        consecutiveErrors++;
        if (consecutiveErrors >= 3) {
          stopPolling();
          set({ isAnalyzing: false, error: "Не удалось получить статус анализа" });
        }
        return;
      }

      consecutiveErrors = 0;
      const data = await res.json() as {
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
      };

      // Update progress bar
      if (data.status === "running") {
        set({
          progress: {
            step: data.step,
            message: data.message,
            progress: data.progress,
          },
        });
      }

      // Handle design_md / reference_code / code_preview as they arrive
      if (data.designMd) {
        set({
          designMdContent: data.designMd,
          result: get().result ? { ...get().result!, designMd: data.designMd } : get().result,
        });
      }
      if (data.referenceCode) {
        set({
          referenceCodeContent: data.referenceCode,
          result: get().result ? { ...get().result!, referenceCode: data.referenceCode as unknown as Record<string, unknown> } : get().result,
        });
      }
      if (data.codePreviewHtml) {
        set({ codePreviewHtml: data.codePreviewHtml });
      }
      if (data.rscPayload) {
        set({
          rscPayloadContent: data.rscPayload,
          result: get().result ? { ...get().result!, rscPayload: data.rscPayload as AnalysisResult['rscPayload'] } : get().result,
        });
      }

      // Completed
      if (data.status === "completed" && data.result) {
        stopPolling();
        const newResult = data.result as AnalysisResult;
        const newDesignMd = (data.designMd as string) || (newResult?.designMd as string) || null;
        set({
          isAnalyzing: false,
          result: newResult,
          progress: { step: "done", message: "Анализ завершён!", progress: 1 },
          designMdContent: newDesignMd,
        });
        persistResult(newResult, analysisId, newDesignMd);
        get().loadHistory();
      }

      // Error
      if (data.status === "error") {
        stopPolling();
        set({
          isAnalyzing: false,
          error: data.error || data.message || "Ошибка анализа",
        });
        get().loadHistory();
      }
    } catch (err) {
      consecutiveErrors++;
      if (consecutiveErrors >= 3) {
        stopPolling();
        const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
        set({ isAnalyzing: false, error: msg });
      }
    }
  }, POLL_INTERVAL);
}
