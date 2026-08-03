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
    routeTree: Array<{
      segment: string;
      page: string;
      layout: string;
      loading: string;
      error: string;
    }>;
    summary: string;
    metadata: Record<string, string> | null;
    fontPreloads: string[];
    scriptPreloads: string[];
  } | null;
}

export interface HistoryItem {
  id: string;
  urls: string[];
  status: string;
  error?: string | null;
  createdAt: string;
  hasResult: boolean;
  sourceType?: string;
}

export interface AnalysisStore {
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
