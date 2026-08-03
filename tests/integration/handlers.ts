import { mock } from "bun:test";

export const FAKE_HTML = `<html><head><title>Test Page</title></head><body><h1>Hello World</h1><p>Test content</p></body></html>`;

export const FAKE_VLM_RESULT = {
  colorPalette: {
    primary: ["#1a73e8"],
    secondary: ["#5f6368"],
    accent: ["#ea4335"],
    background: ["#ffffff"],
    text: ["#202124"],
    dominantColors: [
      { hex: "#ffffff", name: "White", usage: "Background", percentage: 60 },
      { hex: "#1a73e8", name: "Blue", usage: "Primary buttons", percentage: 15 },
    ],
  },
  typography: {
    headings: { style: "sans-serif", weight: "bold", characteristics: "Clean modern" },
    body: { style: "sans-serif", weight: "regular", characteristics: "Readable" },
    sizeScale: ["12px", "14px", "16px", "20px", "24px"],
  },
  layout: {
    gridType: "12-col",
    spacing: "8px base",
    alignment: "left",
    density: "normal",
    maxContentWidth: "1200px",
  },
  components: [
    { type: "button", characteristics: "Rounded", states: ["default", "hover"], borderRadius: "medium", shadows: "none" },
  ],
  visualEffects: [],
  moodAndTone: { keywords: ["professional"], description: "Clean interface" },
  accessibilityNotes: [],
  uiPatterns: [],
};

export const FAKE_VLM_RESPONSE = JSON.stringify(FAKE_VLM_RESULT);

export const FAKE_LLM_RESULT = {
  type: "single",
  url: "https://example.com",
  teardown: { title: "Test", author: "Test", source: "web", type: "website", visualStyle: "Modern", techStack: [], features: [], interactions: [], inspiration: [] },
  deconstruction: { layers: [], connections: "" },
  spec: { functionalRequirements: [], nonFunctionalRequirements: [], userStories: [] },
  patternMining: null,
  reverseEngineering: { frontend: { stack: "", confidence: "low", evidence: "" }, animationLib: { stack: "", confidence: "low", evidence: "" }, dataLayer: { stack: "", confidence: "low", evidence: "" }, backend: { stack: "", confidence: "low", evidence: "" }, infra: { stack: "", confidence: "low", evidence: "" } },
  audit: { problems: [] },
  heuristicEvaluation: { scores: [], averageScore: 0, verdict: "" },
  vlmAnalysis: null,
};

export const FAKE_LLM_RESPONSE_TEXT = JSON.stringify(FAKE_LLM_RESULT);

export const FAKE_BATCH_LLM_RESULT = {
  type: "batch",
  totalUrls: 2,
  perUrl: [
    { url: "https://example.com", teardown: {}, deconstruction: {}, spec: {}, patternMining: null, reverseEngineering: {}, audit: {}, heuristicEvaluation: {} },
    { url: "https://example2.com", teardown: {}, deconstruction: {}, spec: {}, patternMining: null, reverseEngineering: {}, audit: {}, heuristicEvaluation: {} },
  ],
  patternMining: { groups: [], summary: "" },
  crossCuttingThemes: [],
};

export const FAKE_BATCH_LLM_RESPONSE_TEXT = JSON.stringify(FAKE_BATCH_LLM_RESULT);

export const FAKE_DESIGN_MD = "# Design System\n\nAuto-generated.";

export function createMockZai() {
  const mockCreate = mock(() =>
    Promise.resolve({
      functions: {
        invoke: mock((name: string, _opts?: unknown) => {
          if (name === "page_reader") {
            return Promise.resolve({ data: { html: FAKE_HTML, title: "Test Page" } });
          }
          if (name === "web_search") {
            return Promise.resolve([
              { url: "https://example.com/review", name: "Review", snippet: "Good site" },
            ]);
          }
          return Promise.resolve([]);
        }),
      },
      chat: {
        completions: {
          createVision: mock(() =>
            Promise.resolve({
              choices: [{ message: { content: FAKE_VLM_RESPONSE } }],
            })
          ),
          create: mock((opts?: Record<string, unknown>) => {
            const msgs = (opts?.messages as Array<{ content: string }>) || [];
            const prompt = msgs[0]?.content || "";
            if (prompt.includes("DESIGN.md") || prompt.includes("DESIGN-документ")) {
              return Promise.resolve({ choices: [{ message: { content: FAKE_DESIGN_MD } }] });
            }
            return Promise.resolve({ choices: [{ message: { content: FAKE_LLM_RESPONSE_TEXT } }] });
          }),
        },
      },
    })
  );

  return { create: mockCreate };
}

export function createMockDb() {
  const store = new Map<string, Record<string, unknown>>();
  let nextId = 1;

  return {
    analysis: {
      create: mock(async ({ data }: { data: Record<string, unknown> }) => {
        const id = String(nextId++);
        const record = { id, ...data, createdAt: new Date() };
        store.set(id, record);
        return record;
      }),
      update: mock(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = store.get(where.id);
        if (existing) Object.assign(existing, data);
        return existing || { id: where.id, ...data };
      }),
      findMany: mock(() => Promise.resolve([])),
    },
  };
}

export function parseSSEStream(stream: ReadableStream<Uint8Array>): Promise<Record<string, unknown>[]> {
  return new Promise(async (resolve) => {
    const events: Record<string, unknown>[] = [];
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              events.push(JSON.parse(line.slice(6)));
            } catch {}
          }
        }
      }
      if (buffer.startsWith("data: ")) {
        try { events.push(JSON.parse(buffer.slice(6))); } catch {}
      }
    } catch {}
    resolve(events);
  });
}

export function createPostRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
