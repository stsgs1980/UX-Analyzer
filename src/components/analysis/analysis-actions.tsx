"use client";

import { Button } from "@/components/ui/button";
import { Copy, Download, FileDown } from "lucide-react";
import { toast } from "sonner";
import { buildMarkdownExport } from "@/lib/export-markdown";
import type { AnalysisResult } from "@/store/analysis-store";

export function CopyButton({ text }: { text: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success("JSON скопирован в буфер обмена");
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      <Copy className="h-3.5 w-3.5 mr-1.5" />
      Копировать JSON
    </Button>
  );
}

export function ExportMarkdownButton({ result, designMd }: { result: AnalysisResult; designMd: string | null }) {
  const handleExport = () => {
    const md = buildMarkdownExport(result, designMd);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = result.teardown?.title
      ? `${result.teardown.title.replace(/[^a-zA-Z0-9а-яА-Я]/g, "-").toLowerCase()}.md`
      : `analysis-${Date.now()}.md`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown отчёт скачан");
  };
  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <FileDown className="h-3.5 w-3.5 mr-1.5" />
      Экспорт Markdown
    </Button>
  );
}

export function DownloadButton({ data }: { data: unknown }) {
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      Скачать JSON
    </Button>
  );
}
