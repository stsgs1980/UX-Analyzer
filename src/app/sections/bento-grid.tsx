"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalysisStore } from "@/store/analysis-store";
import { UrlInput } from "@/components/analysis/url-input";
import { AnalysisProgress } from "@/components/analysis/analysis-progress";
import { AnalysisResults } from "@/components/analysis/analysis-results";

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

export function BentoGrid() {
  const { isAnalyzing, error, result } = useAnalysisStore();
  const progressRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

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
  );
}
