"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalysisStore } from "@/store/analysis-store";
import { UrlInput } from "@/components/analysis/url-input";
import { AnalysisProgress } from "@/components/analysis/analysis-progress";
import { AnalysisResults } from "@/components/analysis/analysis-results";
import { AnalysisHistory } from "@/components/analysis/analysis-history";
import { Separator } from "@/components/ui/separator";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { Eye, Leaf, Zap, ScanSearch } from "lucide-react";

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

export default function Home() {
  const { loadHistory, result, isAnalyzing } = useAnalysisStore();
  const mainRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useScrollReveal({ rootMargin: "0px 0px -30px 0px" });

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
      {/* Header — minimal, line bottom */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold tracking-tight">UX Analyzer</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-[10px] text-emerald-400/50 font-medium uppercase tracking-widest flex items-center gap-1.5">
              <Leaf className="h-3 w-3" />
              Sustainable
            </span>
            <span className="hidden sm:inline text-[10px] text-amber-400/50 font-medium uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="h-3 w-3" />
              AI + VLM
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6">

        {/* ═══════════════════════════════════════════
            MACRO-TYPOGRAPHY HERO — STATIC
        ═══════════════════════════════════════════ */}
        <section className="pt-16 sm:pt-24 lg:pt-32 pb-16 sm:pb-20">
          {/* Overline label */}
          <div className="mb-8 sm:mb-12">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground/60">
              8-разрезный анализ продукта
            </span>
          </div>

          {/* Main headline — macro typography */}
          <div className="space-y-0">
            <h1 className="text-[clamp(2.5rem,8vw,7rem)] font-bold leading-[0.9] tracking-tighter text-foreground">
              Инженерно-
            </h1>
            <h1 className="text-[clamp(2.5rem,8vw,7rem)] font-bold leading-[0.9] tracking-tighter text-foreground">
              дизайнерский
            </h1>
            <h1 className="text-[clamp(2.5rem,8vw,7rem)] font-bold leading-[0.9] tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400">
              разбор
            </h1>
          </div>

          {/* Descriptor line */}
          <div className="mt-10 sm:mt-14 border-t border-white/8 pt-6 max-w-xl">
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Вставьте ссылку или загрузите изображение — получите полный AI-анализ
              <br className="hidden sm:block" /> по 8 профессиональным методологиям + VLM.
            </p>
          </div>

          {/* URL Input — integrated into typographic layout */}
          <div className="mt-10 sm:mt-14 border-t border-b border-emerald-500/12 py-8 sm:py-10">
            <UrlInput />
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            METHODOLOGY INDEX — typographic grid
            hidden when results are present
        ═══════════════════════════════════════════ */}
        <AnimatePresence>
          {!result && (
            <motion.section
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              transition={{ duration: 0.3 }}
              className="pb-16 sm:pb-24"
            >
              {/* Section label */}
              <div className="mb-10 sm:mb-14 flex items-center gap-4">
                <span className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground/40">
                  Методологии
                </span>
                <span className="flex-1 h-px bg-white/5" />
                <span className="text-[11px] sm:text-xs font-medium tabular-nums text-muted-foreground/30">
                  08
                </span>
              </div>

              {/* Typographic grid — each method is a line */}
              <div className="divide-y divide-white/5" data-reveal-stagger>
                {METHODOLOGIES.map((m, i) => (
                  <div
                    key={i}
                    data-reveal="left"
                    className={`group py-5 sm:py-6 hover:pl-2 transition-all duration-300 cursor-default ${i === 7 ? "broken-line-top" : ""}`}
                  >
                    {/* Main line */}
                    <div className="flex items-baseline gap-4 sm:gap-8">
                      <span className="text-xs sm:text-sm font-mono text-muted-foreground/20 tabular-nums shrink-0 w-6 sm:w-8">
                        {m.num}
                      </span>
                      <span className={`text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground/70 group-hover:text-foreground transition-colors duration-300 shrink-0 ${i === 7 ? "text-transparent bg-clip-text bg-gradient-to-r from-emerald-400/80 to-amber-400/60" : ""}`}>{m.label}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors duration-300 hidden sm:block">
                        {m.desc}
                      </span>
                      <span className="flex-1 h-px bg-white/3 group-hover:bg-white/8 transition-colors duration-300 hidden sm:block" />
                      {i === 7 && (
                        <ScanSearch className="h-4 w-4 text-emerald-400/40 group-hover:text-emerald-400 transition-colors shrink-0 hidden sm:block" />
                      )}
                    </div>
                    {/* Detail — expands on hover */}
                    <div className="grid transition-all duration-500 ease-out group-hover:grid-rows-[1fr] grid-rows-[0fr]">
                      <div className="overflow-hidden">
                        <p className="pl-10 sm:pl-16 pt-3 text-sm text-muted-foreground/50 group-hover:text-muted-foreground/80 leading-relaxed transition-colors duration-500 max-w-2xl">
                          {m.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════
            PROGRESS — reveals DOWN
        ═══════════════════════════════════════════ */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.section
              key="progress"
              initial={{ opacity: 0, height: 0, overflow: "hidden" }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div ref={progressRef} className="pt-10 space-y-6 max-w-2xl mx-auto">
                <AnalysisProgress />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <Separator className="bg-white/5 mt-10" />

        {/* ═══════════════════════════════════════════
            HISTORY
        ═══════════════════════════════════════════ */}
        <section className="pt-10">
          <AnalysisHistory />
        </section>

        {/* ═══════════════════════════════════════════
            RESULTS — BELOW history, full 1280px
        ═══════════════════════════════════════════ */}
        <AnimatePresence>
          {!!result && (
            <motion.section
              key="results"
              initial={{ opacity: 0, height: 0, overflow: "hidden" }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div ref={resultsRef} className="pt-10">
                <AnalysisResults />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer — minimal typographic */}
      <footer className="border-t border-white/5 mt-auto">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground/40">
            <p className="flex items-center gap-1.5">
              <Leaf className="h-3 w-3 text-emerald-500/30" />
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