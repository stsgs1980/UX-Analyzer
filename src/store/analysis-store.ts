import { create } from "zustand";

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
    techStack?: string;
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
  imagePreviewUrl?: string | null;
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

  // Analysis
  isAnalyzing: false,
  progress: null,
  result: null,
  error: null,
  currentAnalysisId: null,
  designMdContent: null,

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
      await fetch("/api/analyses", { method: "DELETE" });
      set({ history: [], result: null, currentAnalysisId: null });
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  },

  // Start analysis
  startAnalysis: async () => {
    const { urls, imageBase64, imageFileName } = get();
    if (urls.length === 0 && !imageBase64) return;

    set({
      isAnalyzing: true,
      progress: null,
      result: null,
      error: null,
      currentAnalysisId: null,
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, imageBase64: imageBase64 || undefined, imageFileName: imageFileName || undefined }),
      });

      if (!response.ok) {
        const errData = await response.json();
        set({ isAnalyzing: false, error: errData.error || "Ошибка запроса" });
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
                set({
                  isAnalyzing: false,
                  result: event.data,
                  currentAnalysisId: event.analysisId,
                  designMdContent: event.data?.designMd || null,
                });
              } else if (event.type === "design_md") {
                set({
                  designMdContent: event.content,
                  result: get().result
                    ? { ...get().result!, designMd: event.content }
                    : get().result,
                });
              } else if (event.type === "error") {
                set({ isAnalyzing: false, error: event.message });
              }
            } catch {
              // Ignore malformed events
            }
          }
        }
      }

      // If still analyzing (stream ended without result), finalize
      if (get().isAnalyzing) {
        set({ isAnalyzing: false });
      }

      // Reload history
      get().loadHistory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      set({ isAnalyzing: false, error: msg });
    }
  },

  reset: () =>
    set({
      isAnalyzing: false,
      progress: null,
      result: null,
      error: null,
      currentAnalysisId: null,
      designMdContent: null,
      imageBase64: null,
      imageFileName: null,
    }),

  setUrlsFromHistory: (urls: string[]) => {
    set({ urls, inputUrl: "", result: null, error: null, progress: null, imageBase64: null, imageFileName: null });
  },

  setDesignMd: (md: string) => {
    set({ designMdContent: md });
  },
}));