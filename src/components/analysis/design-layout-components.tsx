"use client";

import type { AnalysisResult } from "@/store/analysis-store";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutGrid, Box } from "lucide-react";
import { SectionLabel } from "./analysis-shared";

type VlmLayout = NonNullable<AnalysisResult['vlmAnalysis']>['layout'];
type VlmComponents = NonNullable<AnalysisResult['vlmAnalysis']>['components'];

export function LayoutSection({ layout }: { layout?: VlmLayout }) {
  if (!layout) return null;
  const items = [
    { label: "Сетка", value: layout.gridType },
    { label: "Плотность", value: layout.density },
    { label: "Выравнивание", value: layout.alignment },
    { label: "Макс. ширина", value: layout.maxContentWidth },
  ];
  return (
    <div>
      <SectionLabel icon={LayoutGrid}>Layout</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(({ label, value }) => (
          <div key={label} className="border-b border-white/5 py-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-sm font-medium mt-1">{value}</p>
          </div>
        ))}
      </div>
      {layout.spacing && (
        <div className="mt-3 border-l border-l-white/10 pl-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Spacing</p>
          <p className="text-sm">{layout.spacing}</p>
        </div>
      )}
    </div>
  );
}

export function ComponentsSection({ components }: { components?: VlmComponents }) {
  if (!components || components.length === 0) return null;
  return (
    <div>
      <SectionLabel icon={Box}>Компоненты</SectionLabel>
      <ScrollArea className="max-h-96">
        <div className="space-y-3 pr-4">
          {components.map((comp, i) => (
            <div key={i} className="border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="text-xs">{comp.type}</Badge>
                <div className="flex gap-1">
                  {comp.states?.map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{comp.characteristics}</p>
              <div className="flex gap-3 text-xs text-muted-foreground/60">
                {comp.borderRadius && <span>radius: {comp.borderRadius}</span>}
                {comp.shadows && <span>shadow: {comp.shadows}</span>}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
