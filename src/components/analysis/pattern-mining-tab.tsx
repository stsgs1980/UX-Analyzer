'use client';

import { Badge } from '@/components/ui/badge';
import { GitCompare } from 'lucide-react';
import { SectionLabel, EmptyState } from './analysis-shared';
import type { AnalysisResult } from '@/store/analysis-store';

export function PatternMiningTab({ data }: { data: AnalysisResult }) {
  const pm = data.patternMining;
  if (!pm || !pm.groups || pm.groups.length === 0) {
    return <EmptyState message="Pattern Mining доступен только при анализе 2+ URL" />;
  }

  return (
    <div className="space-y-6">
      {pm.summary && (
        <div className="border-l-2 border-l-primary/40 pl-4 py-3">
          <p className="text-sm font-medium">{pm.summary}</p>
        </div>
      )}

      {pm.groups.map((group, gi) => (
        <div key={gi}>
          <SectionLabel icon={GitCompare}>{group.category}</SectionLabel>
          <div className="space-y-3">
            {group.patterns.map((pattern, pi) => (
              <div key={pi} className="border-b border-white/5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-semibold">{pattern.name}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {pattern.count}/
                      {data.type === 'batch'
                        ? String((data as Record<string, unknown>).totalUrls ?? '?')
                        : '?'}
                    </Badge>
                    <Badge>{pattern.percentage}%</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {pattern.examples && pattern.examples.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pattern.examples.map((ex, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {ex}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{pattern.takeaway}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
