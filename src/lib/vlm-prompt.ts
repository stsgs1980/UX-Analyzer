/**
 * VLM (Vision Language Model) prompt for visual design analysis.
 * Used with z-ai-web-dev-sdk's image_understanding.
 */

export const VLM_ANALYSIS_PROMPT = `Ты — старший визуальный дизайнер и UI-аудитор. Изучи изображение и верни СТРОГО валидный JSON (без markdown-обёрток, без комментариев) со следующим содержимым:

{
  "colorPalette": {
    "primary": ["#hex1", "#hex2"],
    "secondary": ["#hex1", "#hex2"],
    "accent": ["#hex1"],
    "background": ["#hex1"],
    "text": ["#hex1", "#hex2"],
    "dominantColors": [
      { "hex": "#hex", "name": "название цвета", "usage": "описание где используется", "percentage": 35 }
    ]
  },
  "typography": {
    "headings": {
      "style": "sans-serif|serif|mono|other",
      "weight": "bold|semibold|light",
      "characteristics": "описание 1-2 предложения"
    },
    "body": {
      "style": "sans-serif|serif|mono|other",
      "weight": "regular|medium|light",
      "characteristics": "описание"
    },
    "sizeScale": ["12px", "14px", "16px", "20px", "24px", "32px"]
  },
  "layout": {
    "gridType": "12-col|8-col|flexbox|custom",
    "spacing": "описание间距 системы",
    "alignment": "left|center|mixed",
    "density": "compact|normal|spacious",
    "maxContentWidth": "1200px|1440px|full"
  },
  "components": [
    {
      "type": "button|card|input|nav|modal|...",
      "characteristics": "описание внешнего вида",
      "states": ["default", "hover", "active"],
      "borderRadius": "none|small|medium|large|pill",
      "shadows": "описание теней"
    }
  ],
  "visualEffects": [
    {
      "type": "blur|gradient|glassmorphism|neumorphism|...",
      "description": "где и как используется"
    }
  ],
  "moodAndTone": {
    "keywords": ["минимализм", "премиальность", ...],
    "description": "1-2 предложения об общем настроении"
  },
  "accessibilityNotes": [
    "замечание 1",
    "замечание 2"
  ],
  "uiPatterns": [
    {
      "pattern": "название паттерна",
      "description": "описание реализации"
    }
  ]
}

Правила:
1. Верни ТОЛЬКО JSON без markdown-обёрток.
2. Все hex-коды цветов в формате #RRGGBB.
3. dominantColors — 5-8 самых частых цветов с примерным процентом использования.
4. Если не можешь определить — ставь null, не выдумывай.
5. components — минимум 3-5 основных компонентов, максимум 10.
6. Тексты на русском языке, технические термины на английском.`;

export interface VlmAnalysisResult {
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
    }>
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
}
