import { create } from "zustand";
import { toast } from "sonner";
import type { AnalysisStore } from "./types";
// Re-export for backward compatibility — consumers import `type AnalysisResult` from here
export type { AnalysisResult, AnalysisProgress } from "./types";
import { persistResult, restoreResult, clearPersistedResult } from "./persistence";
import { startPolling, stopPolling } from "./polling";

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  // Input
  urls: [],
  inputUrl: "",

  // Image upload
  imageBase64: null,
  imageFileName: null,
  addImage: (base64: string, fileName: string) => {
    set({ imageBase64: base64, imageFileName: fileName, urls: [], inputUrl: "" });
  },
  removeImage: () => {
    set({ imageBase64: null, imageFileName: null });
  },

  // Reference code option
  generateReferenceCode: false,
  setGenerateReferenceCode: (v: boolean) => set({ generateReferenceCode: v }),

  // RSC extraction option
  extractRscPayload: false,
  setExtractRscPayload: (v: boolean) => set({ extractRscPayload: v }),

  addUrl: (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    let finalUrl = trimmed;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      finalUrl = "https://" + trimmed;
    }
    if (get().urls.includes(finalUrl)) return;
    if (get().urls.length >= 10) return;
    set({ urls: [...get().urls, finalUrl], inputUrl: "" });
  },
  removeUrl: (index: number) => {
    set({ urls: get().urls.filter((_, i) => i !== index) });
  },
  clearUrls: () => set({ urls: [], inputUrl: "" }),
  setInputUrl: (url: string) => set({ inputUrl: url }),

  // Analysis — restored from sessionStorage after hydration via restoreSession()
  isAnalyzing: false,
  progress: null,
  result: null,
  currentAnalysisId: null,
  designMdContent: null,
  referenceCodeContent: null,
  codePreviewHtml: null,
  rscPayloadContent: null,
  error: null,

  // History
  history: [],
  loadHistory: async () => {
    try {
      const res = await fetch("/api/analyses");
      if (res.ok) {
        const data = await res.json();
        set({ history: data });
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  },
  loadAnalysis: async (id: string) => {
    try {
      set({ isAnalyzing: false, progress: null, error: null });
      const res = await fetch(`/api/analyses/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          set({
            result: data.result,
            currentAnalysisId: data.id,
            urls: data.urls,
          });
          persistResult(data.result, data.id, data.result?.designMd || null);
        }
      }
    } catch (err) {
      console.error("Failed to load analysis:", err);
    }
  },
  deleteHistoryItem: async (id: string) => {
    try {
      await fetch(`/api/analyses?id=${id}`, { method: "DELETE" });
      const { currentAnalysisId, result } = get();
      if (currentAnalysisId === id && result) {
        set({ result: null, currentAnalysisId: null });
      }
      await get().loadHistory();
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  },
  clearAllHistory: async () => {
    try {
      await fetch("/api/analyses?confirm=true", { method: "DELETE" });
      set({ history: [], result: null, currentAnalysisId: null });
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  },

  // Restore result from sessionStorage (call from useEffect after hydration)
  restoreSession: () => {
    const restored = restoreResult();
    if (restored) {
      set({
        result: restored.result,
        currentAnalysisId: restored.analysisId,
        designMdContent: restored.designMd,
      });
    }
  },

  // Re-run analysis from history by ID (bypasses dedup cache via forceRerun)
  rerunAnalysis: async (id: string) => {
    try {
      const res = await fetch(`/api/analyses/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const urls: string[] = typeof data.urls === "string" ? JSON.parse(data.urls) : data.urls || [];
      if (urls.length === 0) {
        toast.error("Переанализ возможен только для URL-запросов, не для загруженных изображений");
        return;
      }
      set({
        urls,
        inputUrl: "",
        result: null,
        error: null,
        progress: null,
        imageBase64: null,
        imageFileName: null,
      });
      await get().startAnalysis(true);
    } catch (err) {
      console.error("Failed to rerun analysis:", err);
    }
  },

  // Start analysis — POST to start, then POLL for progress
  startAnalysis: async (forceRerun?: boolean) => {
    const { urls, imageBase64, imageFileName, generateReferenceCode, extractRscPayload } = get();
    if (urls.length === 0 && !imageBase64) return;
    if (get().isAnalyzing) return;

    set({
      isAnalyzing: true,
      progress: null,
      result: null,
      error: null,
      currentAnalysisId: null,
    });
    clearPersistedResult();

    try {
      // 1. Start analysis — returns immediately with { analysisId }
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls,
          imageBase64: imageBase64 || undefined,
          imageFileName: imageFileName || undefined,
          generateReferenceCode: generateReferenceCode || undefined,
          extractRscPayload: extractRscPayload || undefined,
          forceRerun: forceRerun || undefined,
        }),
      });

      if (!response.ok) {
        let errMsg = "Ошибка запроса";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch {
          errMsg = `HTTP ${response.status} — сервер вернул некорректный ответ`;
        }
        set({ isAnalyzing: false, error: errMsg });
        return;
      }

      const { analysisId } = await response.json() as { analysisId: string };
      set({ currentAnalysisId: analysisId });

      // 2. Start polling
      startPolling(analysisId, set, get);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      set({ isAnalyzing: false, error: msg });
    }
  },

  reset: () => {
    stopPolling();
    clearPersistedResult();
    set({
      isAnalyzing: false,
      progress: null,
      result: null,
      error: null,
      currentAnalysisId: null,
      designMdContent: null,
      imageBase64: null,
      imageFileName: null,
    });
  },

  setUrlsFromHistory: (urls: string[]) => {
    set({ urls, inputUrl: "", result: null, error: null, progress: null, imageBase64: null, imageFileName: null });
  },

  setDesignMd: (md: string) => {
    set({ designMdContent: md });
  },
  setReferenceCode: (code: string) => {
    set({ referenceCodeContent: code });
  },
  setCodePreviewHtml: (html: string) => {
    set({ codePreviewHtml: html });
  },
  setRscPayloadContent: (payload: Record<string, unknown>) => {
    set({ rscPayloadContent: payload });
  },
}));
