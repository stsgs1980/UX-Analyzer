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
  sourceType?: string | null;
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
  generatedProjectContent: { files: Record<string, string>; projectName: string; installCommand: string } | null;
  _pollController: AbortController | null;

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
  setGeneratedProjectContent: (project: { files: Record<string, string>; projectName: string; installCommand: string }) => void;
}

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
    // Add protocol if missing
    let finalUrl = trimmed;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      finalUrl = "https://" + trimmed;
    }
    // Check for duplicates
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
  generatedProjectContent: null,
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
      // If the deleted item is currently displayed, clear it
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
      // Only URL-based analyses can be re-run (image uploads have no refetchable source)
      if (urls.length === 0) {
        toast.error("Переанализ возможен только для URL-запросов, не для загруженных изображений");
        return;
      }
      // Populate URLs and clear previous state
      set({
        urls,
        inputUrl: "",
        result: null,
        error: null,
        progress: null,
        imageBase64: null,
        imageFileName: null,
      });
      // Start analysis with forceRerun to bypass dedup cache
      await get().startAnalysis(true);
    } catch (err) {
      console.error("Failed to rerun analysis:", err);
    }
  },

  // Polling abort controller (for cleanup on unmount)
  _pollController: null as AbortController | null,

  // Start analysis (POST returns immediately, polling for progress)
  startAnalysis: async (forceRerun?: boolean) => {
    const { urls, imageBase64, imageFileName } = get();
    if (urls.length === 0 && !imageBase64) return;

    // M3: Prevent double-submission race condition
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
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, imageBase64: imageBase64 || undefined, imageFileName: imageFileName || undefined, generateReferenceCode: get().generateReferenceCode || undefined, extractRscPayload: get().extractRscPayload || undefined, forceRerun: forceRerun || undefined }),
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

      // Response is JSON with { analysisId, status } — no long-lived connection
      const { analysisId } = await response.json() as { analysisId: string; status: string };
      set({ currentAnalysisId: analysisId });

      // Start polling for progress
      const controller = new AbortController();
      set({ _pollController: controller });

      const pollInterval = setInterval(async () => {
        if (controller.signal.aborted) {
          clearInterval(pollInterval);
          return;
        }

        try {
          const pollRes = await fetch(`/api/analyze/progress/${analysisId}`, {
            signal: controller.signal,
          });
          if (!pollRes.ok) {
            clearInterval(pollInterval);
            return;
          }

          const poll = await pollRes.json() as {
            status: string;
            progress: number;
            step: string;
            message: string;
            result?: Record<string, unknown> | null;
            designMd?: string | null;
            referenceCode?: string | null;
            codePreviewHtml?: string | null;
            rscPayload?: Record<string, unknown> | null;
            generatedProject?: { files: Record<string, string>; projectName: string; installCommand: string } | null;
            error?: string | null;
          };

          // Update progress display
          set({
            progress: {
              step: poll.step,
              message: poll.message,
              progress: poll.progress,
            },
          });

          if (poll.status === "completed" && poll.result) {
            clearInterval(pollInterval);
            const newResult = poll.result as AnalysisResult;
            const newDesignMd = poll.designMd || null;
            set({
              isAnalyzing: false,
              result: newResult,
              designMdContent: newDesignMd,
              referenceCodeContent: poll.referenceCode || null,
              codePreviewHtml: poll.codePreviewHtml || null,
              rscPayloadContent: poll.rscPayload || null,
              generatedProjectContent: poll.generatedProject || null,
            });
            persistResult(newResult, analysisId, newDesignMd);
            get().loadHistory();
          } else if (poll.status === "error") {
            clearInterval(pollInterval);
            set({ isAnalyzing: false, error: poll.error || "Ошибка анализа" });
            get().loadHistory();
          }
        } catch (err) {
          // Network error on poll — ignore, next poll will retry
          console.warn("[poll] failed:", err);
        }
      }, 2000);

      // Safety timeout: 5 minutes max
      setTimeout(() => {
        clearInterval(pollInterval);
        if (get().isAnalyzing) {
          set({ isAnalyzing: false, error: "Таймаут анализа (5 минут)" });
        }
      }, 5 * 60 * 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      set({ isAnalyzing: false, error: msg });
    }
  },

  reset: () => {
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
  setGeneratedProjectContent: (project: { files: Record<string, string>; projectName: string; installCommand: string }) => {
    set({ generatedProjectContent: project });
  },
}));