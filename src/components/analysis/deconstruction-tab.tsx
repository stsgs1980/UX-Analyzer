"use client";

import { Separator } from "@/components/ui/separator";
import { Layers, ArrowRight } from "lucide-react";
import { SectionLabel, EmptyState } from "./analysis-shared";
import type { AnalysisResult } from "@/store/analysis-store";

export function DeconstructionTab({ data }: { data: AnalysisResult }) {
  const d = data.deconstruction;
  if (!d?.layers) return <EmptyState message="Данные deconstruction недоступны" />;

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel icon={Layers}>Смысловые слои продукта</SectionLabel>
        <div className="space-y-4">
          {d.layers.map((layer, i) => (
            <div key={i} className="border-l-2 border-l-primary/40 pl-4 py-3">
              <h4 className="text-base font-semibold flex items-center gap-2 mb-2">
                <span className="text-primary text-xs font-bold">{i + 1}.</span>
                {layer.name}
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-line">{layer.analysis}</p>
            </div>
          ))}
        </div>
      </div>

      {d.connections && (
        <>
          <Separator />
          <div>
            <SectionLabel icon={ArrowRight}>Связи между слоями</SectionLabel>
            <div className="border-l-2 border-l-white/10 pl-4 py-3">
              <p className="text-sm leading-relaxed">{d.connections}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
