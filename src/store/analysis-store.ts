import { create } from "zustand";
import { toast } from "sonner";

const STORAGE_KEY = "ux-analyzer:last-result";

function persistResult(result: AnalysisResult | null, analysisId: string | null, designMd: string | null) {
  if (typeof window === "undefined" || !result) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ result, analysisId, designMd, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

function restoreResult(): { result: AnalysisResult; analysisId: string; designMd: string | null } | null {
  if (typeof window === "undefined") return null;
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

function clearPersistedResult() {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

export interface AnalysisProgress {
  step: string;
  message: string;
  progress: number;
}

export interface AnalysisResult {
  type?: string;
  url?: string;
  teardown?: {
    title?: string;
    author?: string | null;
    source?: string;
    type?: string;
    visualStyle?: string;
    techStack?: string | string[];
    features?: string[];
    interactions?: string[];
    inspiration?: string[];
  };
  deconstruction?: {
    layers?: Array<{ name: string; analysis: string }>;
    connections?: string;
  };
  spec?: {
    functionalRequirements?: Array<{ id: string; statement: string }>;
    nonFunctionalRequirements?: Array<{ id: string; category: string; statement: string }>;
    userStories?: Array<{
      id: string;
      asRole: string;
      iWant: string;
      soThat: string;
      acceptanceCriteria: string[];
    }>;
  };
  patternMining?: {
    groups?: Array<{
      category: string;
      patterns: Array<{
        name: string;
        count: number;
        percentage: number;
        examples: string[];
        takeaway: string;
      }>;
    }>;
    summary?: string;
  } | null;
  reverseEngineering?: {
    frontend?: { stack: string; confidence: string; evidence: string };
    animationLib?: { stack: string; confidence: string; evidence: string };
    dataLayer?: { stack: string; confidence: string; evidence: string };
    backend?: { stack: string; confidence: string; evidence: string };
    infra?: { stack: string; confidence: string; evidence: string };
  };
  audit?: {
    problems?: Array<{
      area: string;
      severity: string;
      description: string;
      recommendation: string;
    }>;
  };
  heuristicEvaluation?: {
    scores?: Array<{
      heuristic: string;
      score: number;
      observations: string;
      recommendation: string;
    }>;
    averageScore?: number;
    verdict?: string;
  };
  meta?: {
    dataSources?: string[];
    confidence?: string;
    caveats?: string[];
  };
  // VLM & Design System fields
  vlmAnalysis?: {
    colorPalette?: {
      primary?: string[];
      secondary?: string[];
      accent?: string[];
      background?: string[];
      text?: string[];
      dominantColors?: Array<{
        hex: string;
        name: string;
        usage: string;
        percentage: number;
      }>;
    };
    typography?: {
      headings?: { style: string; weight: string; characteristics: string };
      body?: { style: string; weight: string; characteristics: string };
      sizeScale?: string[];
    };
    layout?: {
      gridType: string;
      spacing: string;
      alignment: string;
      density: string;
      maxContentWidth: string;
    };
    components?: Array<{
      type: string;
      characteristics: string;
      states: string[];
      borderRadius: string;
      shadows: string;
    }>;
    visualEffects?: Array<{
      type: string;
      description: string;
    }>;
    moodAndTone?: {
      keywords: string[];
      description: string;
    };
    accessibilityNotes?: string[];
    uiPatterns?: Array<{
      pattern: string;
      description: string;
    }>;
  } | null;
  designMd?: string | null;
  extractedImageUrl?: string | null;
  sourceType?: 'url' | 'pinterest' | 'upload' | null;
  pinterestData?: {
    title: string;
    authorName: string;
    thumbnailUrl: string;
  } | null;
  referenceCode?: Record<string, unknown> | null;
  rscPayload?: {
    isNextJs: boolean;
    serverComponents: string[];
    clientComponents: string[];
    routeTree: Array<{ segment: string; page: string; layout: string; loading: string; error: string }>;
    summary: string;
    metadata: Record<string, string> | null;
    fontPreloads: string[];
    scriptPreloads: string[];
  } | null;
}

interface HistoryItem {
  id: string;
  urls: string[];
  status: string;
  error?: string | null;
  createdAt: string;
  hasResult: boolean;
  sourceType?: string;
}

interface AnalysisStore {
  // Input state
  urls: string[];
  inputUrl: string;
  addUrl: (url: string) => void;
  removeUrl: (index: number) => void;
  clearUrls: () => void;
  setInputUrl: (url: string) => void;

  // Image upload state
  imageBase64: string | null;
  imageFileName: string | null;
  addImage: (base64: string, fileName: string) => void;
  removeImage: () => void;

  // Reference code option
  generateReferenceCode: boolean;
  setGenerateReferenceCode: (v: boolean) => void;

  // RSC extraction option
  extractRscPayload: boolean;
  setExtractRscPayload: (v: boolean) => void;

  // Analysis state
  isAnalyzing: boolean;
  progress: AnalysisProgress | null;
  result: AnalysisResult | null;
  error: string | null;
  currentAnalysisId: string | null;
  designMdContent: string | null;
  referenceCodeContent: string | null;
  codePreviewHtml: string | null;
  rscPayloadContent: Record<string, unknown> | null;

  // History
  history: HistoryItem[];
  loadHistory: () => Promise<void>;
  loadAnalysis: (id: string) => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;

  // Actions
  startAnalysis: (forceRerun?: boolean) => Promise<void>;
  rerunAnalysis: (id: string) => Promise<void>;
  restoreSession: () => void;
  reset: () => void;
  setUrlsFromHistory: (urls: string[]) => void;
  setDesignMd: (md: string) => void;
  setReferenceCode: (code: string) => void;
  setCodePreviewHtml: (html: string) => void;
  setRscPayloadContent: (payload: Record<string, unknown>) => void;
}

/** Polling interval ref — allows cleanup */
let pollTimer: ReturnType<typeof setInterval> | null = null;

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

// ════════════════════════════════════════════════════════
//  Polling logic
// ════════════════════════════════════════════════════════

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling(
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
          result: get().result ? { ...get().result!, referenceCode: data.referenceCode } : get().result,
        });
      }
      if (data.codePreviewHtml) {
        set({ codePreviewHtml: data.codePreviewHtml });
      }
      if (data.rscPayload) {
        set({
          rscPayloadContent: data.rscPayload,
          result: get().result ? { ...get().result!, rscPayload: data.rscPayload } : get().result,
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
