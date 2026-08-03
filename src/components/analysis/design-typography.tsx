"use client";

import type { AnalysisResult } from "@/store/analysis-store";
import { Badge } from "@/components/ui/badge";
import { Type, LayoutGrid } from "lucide-react";
import { SectionLabel } from "./analysis-shared";

type VlmTypography = NonNullable<AnalysisResult['vlmAnalysis']>['typography'];

export function TypographySection({ typography }: { typography?: VlmTypography }) {
  if (!typography) return null;
  return (
    <div className="space-y-6">
      {typography.headings && (
        <div>
          <SectionLabel icon={Type}>Заголовки</SectionLabel>
          <div className="border-l-2 border-l-primary/40 pl-4 py-3 space-y-1">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">{typography.headings.style}</Badge>
              <Badge variant="secondary" className="text-xs">{typography.headings.weight}</Badge>
            </div>
            {typography.headings.characteristics && (
              <p className="text-sm text-muted-foreground mt-2">{typography.headings.characteristics}</p>
            )}
          </div>
        </div>
      )}
      {typography.body && (
        <div>
          <SectionLabel icon={Type}>Основной текст</SectionLabel>
          <div className="border-l-2 border-l-white/10 pl-4 py-3 space-y-1">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">{typography.body.style}</Badge>
              <Badge variant="secondary" className="text-xs">{typography.body.weight}</Badge>
            </div>
            {typography.body.characteristics && (
              <p className="text-sm text-muted-foreground mt-2">{typography.body.characteristics}</p>
            )}
          </div>
        </div>
      )}
      {typography.sizeScale && typography.sizeScale.length > 0 && (
        <div>
          <SectionLabel icon={LayoutGrid}>Шкала размеров</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {typography.sizeScale.map((s, i) => (
              <Badge key={i} variant="outline" className="font-mono text-xs">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
