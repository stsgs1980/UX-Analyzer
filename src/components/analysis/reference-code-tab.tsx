"use client";

import { useState, useMemo } from "react";
import { useAnalysisStore } from "@/store/analysis-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Code, Eye, Code2, Maximize2, Download } from "lucide-react";

export function ReferenceCodeTab() {
  const referenceCodeContent = useAnalysisStore((s) => s.referenceCodeContent);
  const codePreviewHtml = useAnalysisStore((s) => s.codePreviewHtml);
  const [activeView, setActiveView] = useState<"code" | "preview">(
    codePreviewHtml ? "preview" : "code",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!referenceCodeContent && !codePreviewHtml) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Reference Pipeline не был сгенерирован. Включите галочку &laquo;Reference Pipeline&raquo; перед запуском анализа.
      </div>
    );
  }

  // Build srcdoc for iframe from HTML content
  const iframeSrcDoc = useMemo(() => codePreviewHtml || "", [codePreviewHtml]);

  const handleDownloadHtml = () => {
    if (!codePreviewHtml) return;
    const blob = new Blob([codePreviewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ux-analyzer-preview.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    if (!codePreviewHtml) return;
    const blob = new Blob([codePreviewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {codePreviewHtml && (
            <>
              <Button
                size="sm"
                variant={activeView === "preview" ? "default" : "ghost"}
                className={`h-7 text-xs px-2.5 ${activeView === "preview" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}`}
                onClick={() => setActiveView("preview")}
              >
                <Eye className="h-3 w-3 mr-1" />
                Live Preview
              </Button>
              <Button
                size="sm"
                variant={activeView === "code" ? "default" : "ghost"}
                className={`h-7 text-xs px-2.5 ${activeView === "code" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}`}
                onClick={() => setActiveView("code")}
              >
                <Code2 className="h-3 w-3 mr-1" />
                Pipeline
              </Button>
            </>
          )}
        </div>
        {codePreviewHtml && activeView === "preview" && (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 text-muted-foreground"
              onClick={handleDownloadHtml}
              title="Download HTML"
            >
              <Download className="h-3 w-3 mr-1" />
              .html
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 text-muted-foreground"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Toggle fullscreen"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {activeView === "preview"
            ? "Сгенерированный HTML preview"
            : "Пошаговый pipeline воспроизведения дизайна с готовым кодом"}
        </p>
      </div>

      {/* Preview mode: iframe */}
      {activeView === "preview" && codePreviewHtml && (
        <div className={`relative ${isFullscreen ? "fixed inset-0 z-50 bg-black" : ""}`}>
          {isFullscreen && (
            <div className="absolute top-3 right-3 z-10">
              <Button
                size="sm"
                variant="outline"
                className="bg-black/80 text-white border-white/20"
                onClick={() => setIsFullscreen(false)}
              >
                ✕ Close
              </Button>
            </div>
          )}
          <iframe
            srcDoc={iframeSrcDoc}
            title="Code Preview"
            sandbox="allow-scripts"
            className={`w-full bg-white rounded-lg border border-white/10 ${isFullscreen ? "h-full" : "h-[500px]"}`}
            style={{ pointerEvents: "auto" }}
          />
          {/* Open in new tab button overlay */}
          <div className="absolute bottom-3 right-3">
            <Badge
              variant="outline"
              className="cursor-pointer bg-black/80 text-white border-white/20 hover:bg-white/10 transition-colors"
              onClick={handleOpenInNewTab}
            >
              Open in new tab
            </Badge>
          </div>
        </div>
      )}

      {/* Code mode: markdown */}
      {activeView === "code" && referenceCodeContent && (
        <div className="prose prose-sm prose-invert max-w-none bg-black/20 rounded-lg p-4 overflow-auto max-h-[500px]">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground font-mono">
            {referenceCodeContent}
          </pre>
        </div>
      )}

      {/* Fallback: code only, no preview */}
      {!codePreviewHtml && referenceCodeContent && (
        <div className="prose prose-sm prose-invert max-w-none bg-black/20 rounded-lg p-4 overflow-auto max-h-[500px]">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground font-mono">
            {referenceCodeContent}
          </pre>
        </div>
      )}
    </div>
  );
}
