"use client";

import { useAnalysisStore, type AnalysisResult } from "@/store/analysis-store";
import { Badge } from "@/components/ui/badge";
import { Server, FileCode, Layout, Loader, FolderTree, ALargeSmall } from "lucide-react";

interface RscPayloadData {
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
}

export function RscPayloadTab() {
  const rscPayloadContent = useAnalysisStore((s) => s.rscPayloadContent);

  if (!rscPayloadContent) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        RSC payload не был извлечён. Включите галочку &laquo;RSC Extract&raquo; перед запуском анализа URL.
      </div>
    );
  }

  const data = rscPayloadContent as unknown as RscPayloadData;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {data.summary && (
        <div className="flex items-start gap-2 text-sm">
          <Server className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-muted-foreground leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* Next.js detection badge */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={
            data.isNextJs
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }
        >
          {data.isNextJs ? "Next.js Detected" : "Not Next.js"}
        </Badge>
        {data.isNextJs && (
          <>
            <Badge variant="outline" className="text-xs">
              <FileCode className="h-3 w-3 mr-1" />
              {data.serverComponents.length} Server
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Loader className="h-3 w-3 mr-1" />
              {data.clientComponents.length} Client
            </Badge>
          </>
        )}
      </div>

      {/* Server Components */}
      {data.serverComponents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <FileCode className="h-3.5 w-3.5" />
            Server Components
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {data.serverComponents.map((comp, i) => (
              <Badge key={i} variant="outline" className="text-xs font-mono bg-emerald-500/5">
                {comp}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Client Components */}
      {data.clientComponents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
            <Loader className="h-3.5 w-3.5" />
            Client Components
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {data.clientComponents.map((comp, i) => (
              <Badge key={i} variant="outline" className="text-xs font-mono bg-amber-500/5 border-amber-500/20">
                {comp}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Route Tree */}
      {data.routeTree.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
            <FolderTree className="h-3.5 w-3.5" />
            Route Tree ({data.routeTree.length})
          </h4>
          <div className="bg-black/20 rounded-lg border border-white/5 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">Segment</th>
                  <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">Page</th>
                  <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">Layout</th>
                  <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">Loading</th>
                  <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {data.routeTree.map((route, i) => (
                  <tr key={i} className="border-b border-white/3 last:border-0">
                    <td className="py-1.5 px-3 font-mono text-emerald-400">{route.segment}</td>
                    <td className="py-1.5 px-3 font-mono text-muted-foreground">{route.page || "—"}</td>
                    <td className="py-1.5 px-3 font-mono text-muted-foreground">{route.layout || "—"}</td>
                    <td className="py-1.5 px-3 font-mono text-muted-foreground">{route.loading || "—"}</td>
                    <td className="py-1.5 px-3 font-mono text-muted-foreground">{route.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Metadata */}
      {data.metadata && Object.keys(data.metadata).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
            <Layout className="h-3.5 w-3.5" />
            Page Metadata
          </h4>
          <div className="bg-black/20 rounded-lg border border-white/5 p-3 space-y-1">
            {Object.entries(data.metadata).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-mono shrink-0">{key}:</span>
                <span className="text-foreground/80 truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Font Preloads */}
      {data.fontPreloads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-pink-400 flex items-center gap-1.5">
            <ALargeSmall className="h-3.5 w-3.5" />
            Font Assets ({data.fontPreloads.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {data.fontPreloads.map((font, i) => (
              <Badge key={i} variant="outline" className="text-xs font-mono bg-pink-500/5 border-pink-500/20">
                {font.length > 40 ? font.substring(0, 40) + "..." : font}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Script Preloads count */}
      {data.scriptPreloads.length > 0 && (
        <div className="text-xs text-muted-foreground">
          JS chunks: {data.scriptPreloads.length} preload(s) detected
        </div>
      )}
    </div>
  );
}
