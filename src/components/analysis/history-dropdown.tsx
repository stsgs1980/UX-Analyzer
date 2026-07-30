"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAnalysisStore } from "@/store/analysis-store";
import { History, CheckCircle, XCircle, Clock, Globe, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function HistoryDropdown() {
  const { history, loadAnalysis, setUrlsFromHistory, deleteHistoryItem, clearAllHistory } =
    useAnalysisStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  const handleItemClick = useCallback(
    (item: (typeof history)[0]) => {
      setOpen(false);
      if (item.hasResult) loadAnalysis(item.id);
      else setUrlsFromHistory(item.urls);
    },
    [loadAnalysis, setUrlsFromHistory]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      deleteHistoryItem(id);
      toast.success("Анализ удалён");
    },
    [deleteHistoryItem]
  );

  const handleClearAll = useCallback(() => {
    if (!history.length) return;
    clearAllHistory();
    toast.success("История очищена");
  }, [clearAllHistory, history.length]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return "только что";
    if (diffMin < 60) return diffMin + " мин назад";
    if (diffHr < 24) return diffHr + " ч назад";
    return date.toLocaleDateString("ru-RU");
  };

  const domainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    }
  };

  const count = history.length;

  return (
    <>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={"relative flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors duration-200 " + (open ? "bg-white/8 text-foreground" : "text-muted-foreground/60 hover:text-foreground hover:bg-white/5")}
        aria-label="История анализов"
        aria-expanded={open}
      >
        <History className="h-4 w-4" />
        <span className="hidden sm:inline text-xs font-medium">История</span>
        {count > 0 && (
          <span
            className={
              "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums leading-none px-1 " +
              (open
                ? "bg-emerald-400/20 text-emerald-400"
                : "bg-white/10 text-muted-foreground/70")
            }
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-4 sm:right-6 top-full mt-2 w-[min(420px,calc(100vw-2rem))] bg-background/95 backdrop-blur-xl border border-white/8 rounded-lg shadow-2xl shadow-black/30 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                История анализов
              </span>
              {count > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground/30 hover:text-red-400/80 transition-colors duration-200"
                  aria-label="Очистить всю историю"
                >
                  <Trash2 className="h-3 w-3" />
                  Очистить
                </button>
              )}
            </div>

            {/* Items */}
            <div className="max-h-[60vh] overflow-y-auto">
              {count === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Clock className="h-6 w-6 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground/40">Пока нет анализов</p>
                  <p className="text-xs text-muted-foreground/25 mt-1">
                    Запустите первый анализ, чтобы увидеть его здесь
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {history.map((item) => {
                    const domain = domainFromUrl(item.urls[0] || "");
                    const isCompleted = item.status === "completed";
                    const isError = item.status === "error";
                    const accentColor = isCompleted
                      ? "border-l-emerald-500/50"
                      : isError
                        ? "border-l-red-500/50"
                        : "border-l-muted-foreground/30";

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={
                          "group w-full text-left flex items-center gap-3 py-3 px-4 border-l-2 " +
                          accentColor +
                          " hover:bg-white/[0.03] transition-colors duration-200 relative"
                        }
                      >
                        {/* Status icon */}
                        <div className="shrink-0">
                          {isCompleted ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                          ) : isError ? (
                            <XCircle className="h-3.5 w-3.5 text-red-400/60 group-hover:text-red-400 transition-colors" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
                          )}
                        </div>

                        {/* Domain + info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                            <span className="text-sm font-medium truncate text-foreground/70 group-hover:text-foreground transition-colors">
                              {domain || "—"}
                            </span>
                            {item.urls.length > 1 && (
                              <span className="text-[10px] text-emerald-400/50 font-medium shrink-0">
                                +{item.urls.length - 1}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground/40 tabular-nums">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>

                        {/* Delete */}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => handleDelete(e, item.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleDelete(e, item.id);
                            }
                          }}
                          className="shrink-0 p-1 text-transparent group-hover:text-muted-foreground/30 hover:!text-red-400 transition-colors duration-200 cursor-pointer"
                          aria-label={"Удалить " + domain}
                        >
                          <X className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
