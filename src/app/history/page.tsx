"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, CheckCircle, XCircle, Clock, Trash2, RotateCcw } from "lucide-react";

interface Analysis {
  id: string;
  urls: string[];
  status: string;
  createdAt: string;
  sourceType?: string;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default function HistoryPage() {
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analyses")
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    await fetch(`/api/analyses?id=${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleClearAll = async () => {
    if (!confirm("Очистить всю историю?")) return;
    await fetch("/api/analyses?confirm=true", { method: "DELETE" });
    setItems([]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <span className="text-sm font-medium tracking-tight">UX Analyzer</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Анализ</Link>
            <Link href="/history" className="text-sm text-foreground font-medium">История</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight">История анализов</h1>
          {items.length > 0 && (
          <button onClick={handleClearAll} className="text-xs text-muted-foreground hover:text-red-400 transition-colors" aria-label="Очистить всю историю">
            Очистить всё
          </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">Загрузка...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет анализов. Начните с главной страницы.</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="group flex items-center gap-3 py-3 px-4 border-l-2 border-l-emerald-500/50 hover:border-l-emerald-400 transition-colors">
                {item.status === "completed" ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" /> :
                 item.status === "error" ? <XCircle className="h-4 w-4 text-red-400 shrink-0" /> :
                 <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.urls.map(getDomain).join(", ")}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                </div>
                <Link href={`/?id=${item.id}`} className="text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Открыть
                </Link>
                {item.sourceType === "url" || item.sourceType === "pinterest" ? (
                  <Link href={`/?rerun=${item.id}`} className="flex items-center gap-1 text-xs text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <RotateCcw className="h-3 w-3" />
                    Переанализировать
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed" title="Переанализ доступен только для URL">
                    <RotateCcw className="h-3 w-3 inline" />
                    <span className="align-middle"> Переанализировать</span>
                  </span>
                )}
                <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Удалить ${getDomain(item.urls[0])}`}>
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
