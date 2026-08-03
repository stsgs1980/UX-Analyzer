'use client';

import { ConfidenceBadge, EmptyState } from './analysis-shared';
import type { AnalysisResult } from '@/store/analysis-store';

const scoreColor = (s: number) => {
  if (s >= 3.5) return 'text-emerald-600 dark:text-emerald-400';
  if (s >= 2.5) return 'text-amber-600 dark:text-amber-400';
  if (s >= 1.5) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const scoreBg = (s: number) => {
  if (s >= 3.5) return 'bg-emerald-500';
  if (s >= 2.5) return 'bg-amber-500';
  if (s >= 1.5) return 'bg-orange-500';
  return 'bg-red-500';
};

export function HeuristicTab({ data }: { data: AnalysisResult }) {
  const he = data.heuristicEvaluation;
  if (!he?.scores || he.scores.length === 0) {
    return <EmptyState message="Данные эвристической оценки недоступны" />;
  }

  const avg = he.averageScore ?? 0;

  return (
    <div className="space-y-6">
      <div className="border-l-2 border-l-primary/40 pl-4 py-3">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span
              className={`text-4xl font-bold ${scoreColor(avg)}`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {avg.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground">/4.0</span>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-semibold text-lg">Общий балл</p>
            <p className="text-sm text-muted-foreground mt-1">{he.verdict || 'Без вердикта'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {he.scores.map((item, i) => (
          <div key={i} className="border-b border-white/5 pb-3 pt-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{item.heuristic}</p>
                {item.observations && (
                  <p className="text-xs text-muted-foreground">{item.observations}</p>
                )}
                {item.recommendation && (
                  <p className="text-xs text-muted-foreground italic mt-1">{item.recommendation}</p>
                )}
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span
                  className={`text-lg font-bold ${scoreColor(item.score)}`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {item.score}
                </span>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3].map((dot) => (
                    <span
                      key={dot}
                      className={`inline-block h-1.5 w-5 ${dot < item.score ? scoreBg(item.score) : 'bg-muted'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
