"use client";

import { useAnalysisStore } from "@/store/analysis-store";
import { motion } from "framer-motion";
import { Globe, Search, Brain, FileJson, CheckCircle, Pin, ImageDown, Eye, FileText } from "lucide-react";

const STEPS = [
  { key: "pinterest", icon: Pin, label: "Pinterest" },
  { key: "fetching", icon: Globe, label: "Сбор данных" },
  { key: "searching", icon: Search, label: "Контекст" },
  { key: "downloading_image", icon: ImageDown, label: "VLM" },
  { key: "analyzing", icon: Brain, label: "AI-анализ" },
  { key: "parsing", icon: FileJson, label: "Обработка" },
  { key: "vlm_analysis", icon: Eye, label: "DESIGN.md" },
  { key: "done", icon: CheckCircle, label: "Готово" },
];

export function AnalysisProgress() {
  const { isAnalyzing, progress, error } = useAnalysisStore();

  if (!isAnalyzing && !progress && !error) return null;

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-l-2 border-l-red-500/60 py-4 pl-4 space-y-1"
      >
        <p className="text-red-400 font-medium text-sm">Ошибка анализа</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </motion.div>
    );
  }

  const currentStep = progress?.step || "fetching";
  const progressValue = progress?.progress || 0;
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  // Only show relevant steps (filter based on progress to avoid showing all 8)
  const visibleSteps = STEPS.filter((s, i) => {
    if (currentIdx >= 0) {
      // Show steps that are either done, active, or the next one
      return i <= currentIdx + 1;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center gap-0 overflow-x-auto">
        {visibleSteps.map((step) => {
          const globalIdx = STEPS.findIndex((s) => s.key === step.key);
          const isActive = globalIdx === currentIdx;
          const isDone = globalIdx < currentIdx;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: globalIdx * 0.05 }}
                className={`flex items-center gap-2 px-2 sm:px-3 py-2 transition-all duration-500 text-xs sm:text-sm ${
                  isActive
                    ? "text-emerald-300 font-medium"
                    : isDone
                    ? "text-emerald-500/50"
                    : "text-muted-foreground/25"
                }`}
              >
                <motion.div
                  animate={isActive ? { opacity: [0.5, 1, 0.5] } : {}}
                  transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}
                  className={isActive ? "text-emerald-400" : isDone ? "text-emerald-500/70" : "text-muted-foreground/25"}
                >
                  {isDone ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <StepIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </motion.div>
                <span className="hidden sm:inline truncate">{step.label}</span>
              </motion.div>
              {globalIdx < STEPS.length - 1 && globalIdx <= currentIdx && (
                <div className="flex-1 h-px min-w-[8px] sm:min-w-[16px]">
                  <motion.div
                    className={`h-full ${isDone ? "bg-emerald-500/40" : "bg-white/5"}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isDone ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ transformOrigin: 'left' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-0.5 bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressValue * 100}%` }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
        {/* Shimmer line overlay */}
        <motion.div
          className="absolute inset-0 h-0.5 animate-shimmer overflow-hidden"
          style={{
            background: "linear-gradient(90deg, transparent, oklch(0.72 0.17 155 / 20%), transparent)",
          }}
        />
      </div>

      {/* Status Message */}
      <motion.div
        key={progress?.message}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="h-1 w-1 bg-emerald-400"
        />
        <span>{progress?.message || "Подготовка..."}</span>
      </motion.div>

      {/* Percentage */}
      <div className="text-center">
        <motion.span
          key={Math.round(progressValue * 100)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-bold text-emerald-400 tabular-nums tracking-tighter"
        >
          {Math.round(progressValue * 100)}
          <span className="text-lg text-emerald-400/40 ml-0.5">%</span>
        </motion.span>
      </div>
    </div>
  );
}