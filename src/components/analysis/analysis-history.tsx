"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAnalysisStore } from "@/store/analysis-store";
import { CheckCircle, XCircle, Clock, Globe, X } from "lucide-react";
import { toast } from "sonner";

export function AnalysisHistory() {
  const { history, loadAnalysis, setUrlsFromHistory, deleteHistoryItem, clearAllHistory } = useAnalysisStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll-reveal for history items
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
    );

    const items = container.querySelectorAll("[data-reveal]");
    items.forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = `${i * 0.05}s`;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [history]);

  const handleDelete = useCallback(
    (e: { stopPropagation: () => void }, id: string) => {
      e.stopPropagation();
      deleteHistoryItem(id);
      toast.success("Анализ удалён");
    },
    [deleteHistoryItem]
  );

  const handleClearAll = useCallback(() => {
    clearAllHistory();
    toast.success("История очищена");
  }, [clearAllHistory]);

  if (history.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return "только что";
    if (diffMin < 60) return `${diffMin} мин назад`;
    if (diffHr < 24) return `${diffHr} ч назад`;
    return date.toLocaleDateString("ru-RU");
  };

  const domainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover-underline cursor-default">
          История анализов
        </h3>
        <span className="h-px flex-1 bg-white/5" />
        <span className="text-xs text-muted-foreground/40 tabular-nums">
          {history.length}
        </span>
        <button
          onClick={handleClearAll}
          className="text-[10px] uppercase tracking-widest text-muted-foreground/30 hover:text-red-400/70 transition-colors duration-300 cursor-default"
          aria-label="Очистить всю историю"
        >
          Очистить
        </button>
      </div>

      <div ref={containerRef} className="divide-y divide-white/5">
        {history.map((item, i) => {
          const domain = domainFromUrl(item.urls[0] || "");
          const isCompleted = item.status === "completed";
          const isError = item.status === "error";
          const accentColor = isCompleted
            ? "border-l-emerald-500/50 hover:border-l-emerald-400"
            : isError
            ? "border-l-red-500/50 hover:border-l-red-400"
            : "border-l-muted-foreground/30 hover:border-l-muted-foreground/60";

          return (
            <motion.button
              key={item.id}
              data-reveal="left"
              onClick={() => {
                if (item.hasResult) loadAnalysis(item.id);
                else setUrlsFromHistory(item.urls);
              }}
              className={`group w-full text-left flex items-center gap-4 py-3.5 px-1 border-l-2 ${accentColor} hover:bg-white/[0.03] hover:pl-2 transition-all duration-300 ease-out relative`}
            >
              {/* Status icon */}
              <div className="shrink-0 transition-transform duration-300 group-hover:scale-110">
                {isCompleted ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                ) : isError ? (
                  <XCircle className="h-3.5 w-3.5 text-red-400/60 group-hover:text-red-400 transition-colors" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
              </div>

              {/* Domain */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Globe className="h-3 w-3 text-muted-foreground/30 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-sm font-medium truncate text-foreground/70 group-hover:text-foreground transition-colors duration-300">
                  {domain || "—"}
                </span>
                {item.urls.length > 1 && (
                  <span className="text-[11px] text-emerald-400/50 font-medium shrink-0 group-hover:text-emerald-400/80 transition-colors">
                    +{item.urls.length - 1}
                  </span>
                )}
              </div>

              {/* Time */}
              <span className="text-[11px] text-muted-foreground/40 shrink-0 tabular-nums group-hover:text-muted-foreground/60 transition-colors">
                {formatDate(item.createdAt)}
              </span>

              {/* Delete — visible on hover */}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => handleDelete(e, item.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleDelete(e, item.id); } }}
                className="shrink-0 p-1 text-transparent group-hover:text-muted-foreground/30 hover:!text-red-400 transition-colors duration-200 cursor-pointer"
                aria-label={`Удалить ${domain}`}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}