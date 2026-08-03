"use client";

import { Code, Server } from "lucide-react";

interface AnalysisOptionsProps {
  isAnalyzing: boolean;
  generateReferenceCode: boolean;
  onSetGenerateReferenceCode: (value: boolean) => void;
  extractRscPayload: boolean;
  onSetExtractRscPayload: (value: boolean) => void;
}

export function AnalysisOptions({
  isAnalyzing,
  generateReferenceCode,
  onSetGenerateReferenceCode,
  extractRscPayload,
  onSetExtractRscPayload,
}: AnalysisOptionsProps) {
  return (
    <>
      <label
        className="flex items-center gap-1.5 text-xs text-muted-foreground/60 cursor-pointer select-none hover:text-muted-foreground transition-colors"
        title="Generate step-by-step implementation pipeline with code"
      >
        <input
          type="checkbox"
          checked={generateReferenceCode}
          onChange={(e) => onSetGenerateReferenceCode(e.target.checked)}
          disabled={isAnalyzing}
          className="rounded border-white/10 accent-emerald-500"
        />
        <Code className="h-3 w-3" />
        <span className="hidden sm:inline">Reference Pipeline</span>
      </label>
      <label
        className="flex items-center gap-1.5 text-xs text-muted-foreground/60 cursor-pointer select-none hover:text-muted-foreground transition-colors"
        title="Extract RSC payload from Next.js App Router pages"
      >
        <input
          type="checkbox"
          checked={extractRscPayload}
          onChange={(e) => onSetExtractRscPayload(e.target.checked)}
          disabled={isAnalyzing}
          className="rounded border-white/10 accent-emerald-500"
        />
        <Server className="h-3 w-3" />
        <span className="hidden sm:inline">RSC Extract</span>
      </label>
    </>
  );
}
