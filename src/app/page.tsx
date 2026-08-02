"use client";

import { useEffect, useRef, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalysisStore } from "@/store/analysis-store";
import { UrlInput } from "@/components/analysis/url-input";
import { AnalysisProgress } from "@/components/analysis/analysis-progress";
import { AnalysisResults } from "@/components/analysis/analysis-results";
import { AnalysisHistory } from "@/components/analysis/analysis-history";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { Eye, Leaf } from "lucide-react";
import Link from "next/link";

const METHODOLOGIES = [
  {
    num: "01",
    label: "Design Teardown",
    desc: "Визуальный стиль, стек, фичи",
    detail:
      "Полный визуальный разбор продукта: цветовая палитра, типографика, композиция, используемые CSS/JS-фреймворки, ключевые фичи и UI-паттерны. В конце — подборка элементов, которые стоит адаптировать.",
  },
  {
    num: "02",
    label: "Deconstruction",
    desc: "Информационная архитектура",
    detail:
      "Разбивка продукта на смысловые слои — от навигационной структуры до контентной иерархии. Выявление связей между слоями, скрытых паттернов организации информации и логической архитектуры.",
  },
  {
    num: "03",
    label: "Spec Extraction",
    desc: "FR, NFR, User Stories",
    detail:
      "Автоматическая генерация формальной спецификации: функциональные (FR) и нефункциональные (NFR) требования, User Stories в формате «Как... хочу... чтобы...» с Acceptance Criteria.",
  },
  {
    num: "04",
    label: "Pattern Mining",
    desc: "Повторяющиеся паттерны (batch)",
    detail:
      "Доступен при анализе 2+ URL. Сравнение продуктов, выявление общих паттернов в UX/UI, типовых решений и различий. Группировка по категориям с процентом совпадения и практическими выводами.",
  },
  {
    num: "05",
    label: "Reverse Engineering",
    desc: "Вероятный технологический стек",
    detail:
      "Поведенческий reverse engineering — реконструкция вероятной архитектуры по визуальным признакам: фронтенд-стек, библиотеки анимаций, state-менеджмент, бэкенд и инфраструктура. Каждая оценка сопровождается уровнем уверенности и доказательствами.",
  },
  {
    num: "06",
    label: "UX Audit",
    desc: "Проблемы и рекомендации",
    detail:
      "Поиск UX-проблем с классификацией по severity (critical / major / minor): навигация, доступность, информационная архитектура, когнитивная нагрузка. Каждая проблема — с конкретной рекомендацией по исправлению.",
  },
  {
    num: "07",
    label: "Heuristics",
    desc: "10 эвристик Nielsen",
    detail:
      "Оценка по 10 классическим эвристикам Якоба Нильсена (от 1 до 4 баллов каждая): видимость статуса, соответствие стандартам, контроль над действиями, консистентность, предотвращение ошибок и др. Итоговый балл с вердиктом.",
  },
  {
    num: "08",
    label: "Visual Design System",
    desc: "VLM-анализ, палитра, DESIGN.md",
    detail:
      "Визуальный анализ через VLM: извлечение цветовой палитры с CSS/Tailwind экспортом, типографика, layout-параметры, компоненты, визуальные эффекты. Автоматическая генерация DESIGN.md документа. Доступно для Pinterest, прямых ссылок на изображения и загруженных файлов.",
  },
];

export default function Home({ searchParams }: { searchParams: Promise<{ id?: string; rerun?: string }> }) {
  const params = use(searchParams);
  const { loadHistory, restoreSession, loadAnalysis, rerunAnalysis, result, isAnalyzing, error } = useAnalysisStore();
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (window as any).__store = useAnalysisStore;
  }, []);
  const progressRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useScrollReveal({ rootMargin: "0px 0px -30px 0px" });

  // Warn before navigation with unsaved state
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnalyzing) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isAnalyzing]);

  useEffect(() => {
    restoreSession();
    loadHistory();
  }, [restoreSession, loadHistory]);

  // Handle ?id= (load saved result) or ?rerun= (re-run analysis)
  useEffect(() => {
    if (params.rerun) {
      rerunAnalysis(params.rerun);
      window.history.replaceState({}, "", "/");
    } else if (params.id) {
      loadAnalysis(params.id);
    }
  }, [params.id, params.rerun]);

  // Auto-scroll to progress when analysis starts
  useEffect(() => {
    if (isAnalyzing && progressRef.current) {
      const timer = setTimeout(() => {
        progressRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isAnalyzing]);

  // Auto-scroll to results when they appear
  useEffect(() => {
    if (result && resultsRef.current) {
      const timer = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [!!result]);

  return (
    <div className="min-h-screen flex flex-col organic-bg">
      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <span className="text-sm font-medium tracking-tight">UX Analyzer</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Анализ
            </Link>
            <Link href="/history" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              История
            </Link>
            <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Настройки
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6">

        {/* ═══════════════════════════════════════════
            MACRO-TYPOGRAPHY HERO — ARCHITECTURAL BLOCK
            W 1280 — each line fills width, text IS layout
        ═══════════════════════════════════════════ */}
        <section className="pt-10 sm:pt-16 lg:pt-24 pb-14 sm:pb-18">
          {/* Overline — whisper before the shout */}
          <div className="mb-4 sm:mb-8">
            <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground/20">
              8-разрезный анализ продукта
            </span>
          </div>

          {/* Three-line architectural stack — width-filling macro type */}
          <div>
            {/* Line 1 — foundation, fills ~90% at W1280 */}
            <p
              className="font-bold leading-[0.88] tracking-[-0.03em] text-foreground/[0.18] text-[clamp(2.6rem,12vw,9.6rem)]"
              aria-hidden="true"
            >
              Инженерно-
            </p>

            {/* Line 2 — builds weight, fills ~93% at W1280 */}
            <p
              className="font-bold leading-[0.88] tracking-[-0.03em] text-foreground/[0.35] text-[clamp(2.4rem,11.5vw,9.2rem)]"
              aria-hidden="true"
            >
              дизайнерский
            </p>

            {/* Line 3 — MONUMENTAL, fills ~97% at W1280, 2.5× the size */}
            <h1
              className="font-black leading-[1] tracking-[-0.04em] text-[clamp(5rem,24vw,19.2rem)] text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300/80"
              aria-label="Инженерно-дизайнерский разбор"
            >
              разбор
            </h1>
          </div>

          {/* Descriptor — typographic continuation */}
          <p className="mt-12 sm:mt-20 text-sm text-muted-foreground/40 leading-relaxed font-light max-w-lg">
            Вставьте ссылку или загрузите изображение — получите полный AI-анализ
            <br className="hidden sm:block" /> по 8 профессиональным методологиям + VLM.
          </p>
        </section>

        {/* ═══════════════════════════════════════════
            BENTO GRID — Analysis Area
        ═══════════════════════════════════════════ */}
        <div className="bento-grid mb-16 sm:mb-24">
          {/* URL Input — span 5 */}
          <div className="bento-card p-4" style={{ gridColumn: "span 5" }}>
            <UrlInput />
          </div>

          {/* Methods — span 3 */}
          <div className="bento-card p-4" style={{ gridColumn: "span 3" }}>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground/40">
                Методологии
              </span>
              <span className="text-[11px] sm:text-xs font-medium tabular-nums text-muted-foreground/30" style={{ fontVariantNumeric: "tabular-nums" }}>
                08
              </span>
            </div>
            <div className="space-y-2" data-reveal-stagger>
              {METHODOLOGIES.map((m, i) => (
                <div
                  key={i}
                  data-reveal="left"
                  className="group py-2 hover:pl-1 transition-[padding] duration-300 cursor-default"
                >
                  <div className="flex items-baseline gap-2 sm:gap-3">
                    <span className="text-[10px] sm:text-xs font-mono text-muted-foreground/20 tabular-nums shrink-0 w-5">
                      {m.num}
                    </span>
                    <span className="text-xs sm:text-sm font-bold tracking-[-0.03em] text-foreground/70 group-hover:text-foreground transition-colors duration-300 shrink-0">
                      {m.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress — visible only when analyzing */}
          <AnimatePresence>
            {(isAnalyzing || error) && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="bento-card p-4 bento-card-expanded"
                style={{ gridColumn: "span 8" }}
              >
                <div ref={progressRef}>
                  <AnalysisProgress />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results — visible when analysis complete */}
          <AnimatePresence>
            {!!result && (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="bento-card p-0 bento-card-expanded"
                style={{ gridColumn: "span 8" }}
              >
                <div ref={resultsRef}>
                  <AnalysisResults />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>



        {/* ═══════════════════════════════════════════
            HISTORY
        ═══════════════════════════════════════════ */}
        <section className="pt-10">
          <AnalysisHistory />
        </section>
      </main>

      {/* Footer — minimal typographic */}
      <footer className="border-t border-white/5 mt-auto">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground/40">
            <p className="flex items-center gap-1.5">
              <Leaf className="h-3 w-3 text-emerald-500/30" aria-hidden="true" />
              UX Analyzer
            </p>
            <p className="hidden sm:block">
              Teardown · Deconstruction · Spec · Patterns · Reverse · Audit · Heuristics · Design System
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}