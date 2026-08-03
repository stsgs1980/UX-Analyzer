'use client';

import { useAnalysisStore } from '@/store/analysis-store';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  Globe,
  Search,
  Brain,
  FileJson,
  CheckCircle,
  Pin,
  ImageDown,
  Eye,
  Loader2,
  Save,
  Sparkles,
  Zap,
} from 'lucide-react';

interface StepDef {
  key: string;
  icon: typeof Globe;
  label: string;
  description: string;
}

const STEPS: StepDef[] = [
  { key: 'init', icon: Sparkles, label: 'Инициализация', description: 'Подключение к AI-движку' },
  { key: 'pinterest', icon: Pin, label: 'Pinterest', description: 'Извлечение данных пина' },
  {
    key: 'upload',
    icon: ImageDown,
    label: 'Загрузка',
    description: 'Обработка загруженного изображения',
  },
  {
    key: 'downloading_image',
    icon: ImageDown,
    label: 'Скачивание',
    description: 'Загрузка изображения по URL',
  },
  {
    key: 'fetching',
    icon: Globe,
    label: 'Сбор данных',
    description: 'Чтение страниц и поиск контекста',
  },
  {
    key: 'vlm',
    icon: Eye,
    label: 'Визуальный AI',
    description: 'Распознавание цветов, типографики, компоновки',
  },
  {
    key: 'preparing',
    icon: Zap,
    label: 'Подготовка',
    description: 'Компоновка данных для анализа',
  },
  {
    key: 'analyzing',
    icon: Brain,
    label: 'AI-анализ',
    description: 'Обработка 8 методологий UX-анализа',
  },
  {
    key: 'parsing',
    icon: FileJson,
    label: 'Обработка',
    description: 'Разбор структуры результатов',
  },
  {
    key: 'design_md',
    icon: FileJson,
    label: 'DESIGN.md',
    description: 'Генерация дизайн-документации',
  },
  { key: 'saving', icon: Save, label: 'Сохранение', description: 'Запись в базу данных' },
  { key: 'done', icon: CheckCircle, label: 'Готово', description: '' },
];

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m} мин ${s} сек` : `${m} мин`;
}

function formatEta(progress: number, elapsed: number): string | null {
  if (progress <= 0.05 || progress >= 0.98) return null;
  const totalEstimate = elapsed / progress;
  const remaining = Math.max(0, Math.round(totalEstimate - elapsed));
  if (remaining < 3) return null;
  return `≈ ${formatElapsed(remaining)}`;
}

export function AnalysisProgress() {
  const { isAnalyzing, progress, error } = useAnalysisStore();
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const prevStepRef = useRef<string>('');

  // Track elapsed time
  useEffect(() => {
    if (isAnalyzing && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
    if (!isAnalyzing) {
      startTimeRef.current = 0;
      prevStepRef.current = '';
      return;
    }
    const tick = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [isAnalyzing]);

  // Reset elapsed when step changes (keep counting)
  useEffect(() => {
    if (progress?.step && progress.step !== prevStepRef.current) {
      prevStepRef.current = progress.step;
    }
  }, [progress?.step]);

  if (!isAnalyzing && !progress && !error) return null;

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-l-2 border-l-red-500/60 py-4 pl-4 space-y-1"
      >
        <p className="text-red-400 font-medium text-sm">Ошибка анализа</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </motion.div>
    );
  }

  const currentStep = progress?.step || 'init';
  const progressValue = progress?.progress || 0;
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);
  const currentStepDef = STEPS[currentIdx] || STEPS[0];
  const eta = formatEta(progressValue, elapsed);
  const isDone = currentStep === 'done';
  const pct = Math.round(progressValue * 100);

  // Determine which steps are "in the path" (done + active + next)
  const visibleSteps = STEPS.filter((s, i) => {
    if (currentIdx < 0) return true;
    return i <= currentIdx + 1;
  });

  return (
    <div className="space-y-5">
      {/* Step track */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-none">
        {visibleSteps.map((step) => {
          const globalIdx = STEPS.findIndex((s) => s.key === step.key);
          const isActive = globalIdx === currentIdx;
          const isStepDone = globalIdx < currentIdx;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: globalIdx * 0.03, duration: 0.3 }}
                className={`flex items-center gap-1.5 px-1.5 sm:px-2 py-1.5 transition-all duration-300 text-xs sm:text-sm rounded-md ${
                  isActive
                    ? 'text-emerald-300 font-medium bg-emerald-500/8'
                    : isStepDone
                      ? 'text-emerald-500/50'
                      : 'text-muted-foreground/20'
                }`}
              >
                <motion.div
                  animate={isActive ? { opacity: [0.5, 1, 0.5] } : {}}
                  transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}
                  className={
                    isActive
                      ? 'text-emerald-400'
                      : isStepDone
                        ? 'text-emerald-500/60'
                        : 'text-muted-foreground/20'
                  }
                >
                  {isStepDone ? (
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : isActive && isDone ? (
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </motion.div>
                <span className="hidden sm:inline truncate max-w-[80px]">{step.label}</span>
              </motion.div>
              {globalIdx < STEPS.length - 1 && globalIdx <= currentIdx && (
                <div className="flex-1 h-px min-w-[6px] sm:min-w-[12px]">
                  <motion.div
                    className={`h-full ${isStepDone ? 'bg-emerald-500/30' : 'bg-white/5'}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isStepDone ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ transformOrigin: 'left' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-1 bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-400"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
        <motion.div
          className="absolute inset-0 h-1 animate-shimmer overflow-hidden"
          style={{
            background:
              'linear-gradient(90deg, transparent, oklch(0.72 0.17 155 / 20%), transparent)',
          }}
        />
      </div>

      {/* Current step info card */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-start gap-3 px-3 py-2.5 bg-white/[0.02] border border-white/[0.04] sm:px-4 sm:py-3"
      >
        {/* Spinning icon */}
        <div className="mt-0.5">
          {isDone ? (
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          ) : (
            <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Step label + message */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-foreground truncate">
              {currentStepDef.label}
            </span>
            {!isDone && (
              <span className="text-xs text-muted-foreground/60 hidden sm:inline">
                {currentStepDef.description}
              </span>
            )}
          </div>

          {/* Server message (what's happening now) */}
          <motion.p
            key={progress?.message}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs sm:text-sm text-muted-foreground truncate"
          >
            {progress?.message || 'Подготовка...'}
          </motion.p>
        </div>

        {/* Time + percentage */}
        <div className="text-right shrink-0 pl-2">
          <span
            className="text-lg font-bold text-emerald-400 tabular-nums tracking-[-0.04em]"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {pct}
            <span className="text-xs text-emerald-400/40 ml-0.5">%</span>
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 justify-end mt-0.5">
            <span>{formatElapsed(elapsed)}</span>
            {eta && (
              <>
                <span className="text-white/10">·</span>
                <span>осталось {eta}</span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
