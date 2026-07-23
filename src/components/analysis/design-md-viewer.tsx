"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileText } from "lucide-react";
import { toast } from "sonner";

interface DesignMdViewerProps {
  content: string;
}

export function DesignMdViewer({ content }: DesignMdViewerProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("DESIGN.md скопирован в буфер");
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DESIGN.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Extract code blocks and apply syntax highlighting
  const processedContent = useMemo(() => {
    return content;
  }, [content]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">DESIGN.md</span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs h-7">
          <Copy className="h-3 w-3 mr-1" />
          Копировать
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload} className="text-xs h-7">
          <Download className="h-3 w-3 mr-1" />
          .md
        </Button>
      </div>

      {/* Markdown content */}
      <div className="prose prose-invert prose-sm max-w-none
        prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
        prose-p:text-muted-foreground prose-p:leading-relaxed
        prose-li:text-muted-foreground
        prose-strong:text-foreground
        prose-code:text-emerald-400 prose-code:bg-emerald-500/10 prose-code:px-1 prose-code:py-0.5
        prose-pre:bg-white/3 prose-pre:border prose-pre:border-white/8
        prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
        prose-hr:border-white/8
        prose-blockquote:border-l-emerald-500/40 prose-blockquote:text-muted-foreground
        prose-table:text-sm
        prose-th:text-foreground prose-th:border-white/10
        prose-td:text-muted-foreground prose-td:border-white/5
      ">
        <ReactMarkdown>{processedContent}</ReactMarkdown>
      </div>
    </div>
  );
}
