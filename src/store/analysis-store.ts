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
}

interface HistoryItem {
  id: string;
  urls: string[];
  status: string;
  error?: string | null;
  createdAt: string;
  hasResult: boolean;
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

  // Analysis state
  isAnalyzing: boolean;
  progress: AnalysisProgress | null;
  result: AnalysisResult | null;
  error: string | null;
  currentAnalysisId: string | null;
  designMdContent: string | null;

  // History
  history: HistoryItem[];
  loadHistory: () => Promise<void>;
  loadAnalysis: (id: string) => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;

  // Actions
  startAnalysis: () => Promise<void>;
  restoreSession: () => void;
  reset: () => void;
  setUrlsFromHistory: (urls: string[]) => void;
  setDesignMd: (md: string) => void;
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

  // Start analysis
  startAnalysis: async () => {
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
        body: JSON.stringify({ urls, imageBase64: imageBase64 || undefined, imageFileName: imageFileName || undefined }),
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

      const reader = response.body?.getReader();
      if (!reader) {
        set({ isAnalyzing: false, error: "Не удалось получить поток данных" });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "progress") {
                set({
                  progress: {
                    step: event.step,
                    message: event.message,
                    progress: event.progress,
                  },
                  currentAnalysisId: event.analysisId,
                });
              } else if (event.type === "result") {
                const newResult = event.data as AnalysisResult;
                const newId = event.analysisId as string;
                const newDesignMd = (event.data?.designMd as string) || null;
                set({
                  isAnalyzing: false,
                  result: newResult,
                  currentAnalysisId: newId,
                  designMdContent: newDesignMd,
                });
                persistResult(newResult, newId, newDesignMd);
              } else if (event.type === "design_md") {
                set({
                  designMdContent: event.content,
                  result: get().result
                    ? { ...get().result!, designMd: event.content }
                    : get().result,
                });
              } else if (event.type === "error") {
                set({ isAnalyzing: false, error: event.message });
              } else if (event.type === "warn") {
                toast.warning(event.message, { duration: 6000 });
              }
            } catch {
              // Ignore malformed events
            }
          }
        }
      }

      // If still analyzing (stream ended without result), try to recover from DB
      if (get().isAnalyzing) {
        const pendingId = get().currentAnalysisId;
        set({ isAnalyzing: false });
        if (pendingId) {
          // Stream broke — try loading the result from DB (it might have been saved)
          const res = await fetch(`/api/analyses/${pendingId}`).catch(() => null);
          if (res?.ok) {
            const data = await res.json();
            if (data.result) {
              set({ result: data.result, currentAnalysisId: data.id });
              persistResult(data.result, data.id, data.result?.designMd || null);
            }
          }
        }
      }

      // Reload history
      get().loadHistory();
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
}));