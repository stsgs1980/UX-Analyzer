'use client';

import type { AnalysisResult } from '@/store/analysis-store';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Heart, Accessibility, Grid3X3 } from 'lucide-react';
import { SectionLabel } from './analysis-shared';

type VlmEffects = NonNullable<AnalysisResult['vlmAnalysis']>['visualEffects'];
type VlmMood = NonNullable<AnalysisResult['vlmAnalysis']>['moodAndTone'];
type VlmPatterns = NonNullable<AnalysisResult['vlmAnalysis']>['uiPatterns'];

export function EffectsSection({ effects }: { effects?: VlmEffects }) {
  if (!effects || effects.length === 0) return null;
  return (
    <div>
      <SectionLabel icon={Sparkles}>Визуальные эффекты</SectionLabel>
      <div className="space-y-2">
        {effects.map((e, i) => (
          <div key={i} className="border-l border-l-primary/30 pl-3 py-1.5">
            <span className="text-sm font-medium">{e.type}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MoodSection({ mood }: { mood?: VlmMood }) {
  if (!mood) return null;
  return (
    <div>
      <SectionLabel icon={Heart}>Настроение и тон</SectionLabel>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {mood.keywords?.map((kw) => (
          <Badge key={kw} variant="secondary" className="text-xs">
            {kw}
          </Badge>
        ))}
      </div>
      {mood.description && <p className="text-sm text-muted-foreground">{mood.description}</p>}
    </div>
  );
}

export function A11ySection({ notes }: { notes: string[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div>
      <SectionLabel icon={Accessibility}>Доступность</SectionLabel>
      <ul className="space-y-1.5">
        {notes.map((n, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">!</span>
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PatternsSection({ patterns }: { patterns?: VlmPatterns }) {
  if (!patterns || patterns.length === 0) return null;
  return (
    <div>
      <SectionLabel icon={Grid3X3}>UI-паттерны</SectionLabel>
      <div className="space-y-2">
        {patterns.map((p, i) => (
          <div key={i} className="border-b border-white/5 pb-2">
            <p className="text-sm font-medium">{p.pattern}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
