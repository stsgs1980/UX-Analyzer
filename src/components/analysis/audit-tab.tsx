'use client';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle } from 'lucide-react';
import { SeverityBadge, SectionLabel, EmptyState } from './analysis-shared';
import type { AnalysisResult } from '@/store/analysis-store';

const severityBorder = (severity: string) => {
  if (severity === 'critical') return 'border-l-red-500';
  if (severity === 'major') return 'border-l-orange-500';
  return 'border-l-white/10';
};

export function AuditTab({ data }: { data: AnalysisResult }) {
  const a = data.audit;
  if (!a?.problems || a.problems.length === 0)
    return <EmptyState message="Данные аудита недоступны" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Всего проблем: <strong>{a.problems.length}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 bg-red-500" /> Critical:{' '}
          <strong>{a.problems.filter((p) => p.severity === 'critical').length}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 bg-orange-500" /> Major:{' '}
          <strong>{a.problems.filter((p) => p.severity === 'major').length}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 bg-yellow-500" /> Minor:{' '}
          <strong>{a.problems.filter((p) => p.severity === 'minor').length}</strong>
        </span>
      </div>

      <ScrollArea className="max-h-[600px]">
        <div className="space-y-3 pr-4">
          {a.problems.map((problem, i) => (
            <div key={i} className={`border-l-2 pl-4 py-3 ${severityBorder(problem.severity)}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <Badge variant="outline" className="text-xs">
                    {problem.area}
                  </Badge>
                </h4>
                <SeverityBadge severity={problem.severity} />
              </div>
              <div className="space-y-2">
                <p className="text-sm">{problem.description}</p>
                <div className="border-l border-l-white/10 pl-3 py-2 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Рекомендация
                  </p>
                  <p className="text-sm text-muted-foreground">{problem.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
