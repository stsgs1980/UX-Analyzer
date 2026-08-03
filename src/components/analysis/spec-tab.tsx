'use client';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckSquare, BarChart3, User, Target } from 'lucide-react';
import { SectionLabel, EmptyState } from './analysis-shared';
import type { AnalysisResult } from '@/store/analysis-store';

export function SpecTab({ data }: { data: AnalysisResult }) {
  const s = data.spec;
  if (!s) return <EmptyState message="Данные спецификации недоступны" />;

  const hasFR = s.functionalRequirements && s.functionalRequirements.length > 0;
  const hasNFR = s.nonFunctionalRequirements && s.nonFunctionalRequirements.length > 0;
  const hasUS = s.userStories && s.userStories.length > 0;

  if (!hasFR && !hasNFR && !hasUS) return <EmptyState message="Спецификация пуста" />;

  return (
    <div className="space-y-6">
      {hasFR && (
        <div>
          <SectionLabel icon={CheckSquare}>Функциональные требования (FR)</SectionLabel>
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-4">
              {s.functionalRequirements!.map((fr) => (
                <div key={fr.id} className="flex items-start gap-3 border-b border-white/5 pb-3">
                  <Badge variant="outline" className="shrink-0 font-mono text-xs">
                    {fr.id}
                  </Badge>
                  <p className="text-sm">{fr.statement}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {hasNFR && (
        <div>
          <SectionLabel icon={BarChart3}>Нефункциональные требования (NFR)</SectionLabel>
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-4">
              {s.nonFunctionalRequirements!.map((nfr) => (
                <div key={nfr.id} className="flex items-start gap-3 border-b border-white/5 pb-3">
                  <Badge variant="outline" className="shrink-0 font-mono text-xs">
                    {nfr.id}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{nfr.statement}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {nfr.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {hasUS && (
        <div>
          <SectionLabel icon={User}>User Stories</SectionLabel>
          <div className="space-y-4">
            {s.userStories!.map((us) => (
              <div key={us.id} className="border-b border-white/5 pb-4">
                <h4 className="text-sm font-mono font-semibold mb-1">{us.id}</h4>
                <p className="text-sm italic text-muted-foreground mb-2">
                  Как <strong>{us.asRole}</strong>, я хочу <strong>{us.iWant}</strong>, чтобы{' '}
                  <strong>{us.soThat}</strong>.
                </p>
                {us.acceptanceCriteria && us.acceptanceCriteria.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Acceptance Criteria
                    </p>
                    <ul className="space-y-1">
                      {us.acceptanceCriteria.map((ac, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <Target className="h-3 w-3 mt-1 shrink-0" />
                          {ac}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
