"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Palette, Cpu, Sparkles, Eye, Lightbulb, ArrowRight,
} from "lucide-react";
import { SectionLabel, EmptyState } from "./analysis-shared";
import type { AnalysisResult } from "@/store/analysis-store";

export function TeardownTab({ data }: { data: AnalysisResult }) {
  const t = data.teardown;
  if (!t) return <EmptyState message="Данные teardown недоступны" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{t.title || "Без названия"}</h2>
          <div className="flex items-center gap-2 mt-1">
            {t.source && <Badge variant="secondary">{t.source}</Badge>}
            {t.type && <Badge variant="outline">{t.type}</Badge>}
            {t.author && <span className="text-sm text-muted-foreground">by {t.author}</span>}
          </div>
        </div>
      </div>

      <Separator />

      {t.visualStyle && (
        <div>
          <SectionLabel icon={Palette}>Визуальный стиль</SectionLabel>
          <div className="border-l-2 border-l-primary/40 pl-4 py-3">
            <p className="text-sm leading-relaxed whitespace-pre-line">{t.visualStyle}</p>
          </div>
        </div>
      )}

      {t.techStack && (
        <div>
          <SectionLabel icon={Cpu}>Технологический стек</SectionLabel>
          <div className="border-l-2 border-l-primary/40 pl-4 py-3">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {Array.isArray(t.techStack) ? t.techStack.join(", ") : t.techStack}
            </p>
          </div>
        </div>
      )}

      {t.features && t.features.length > 0 && (
        <div>
          <SectionLabel icon={Sparkles}>Ключевые фичи</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {t.features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 border-l border-l-white/10 pl-3 py-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {t.interactions && t.interactions.length > 0 && (
        <div>
          <SectionLabel icon={Eye}>Взаимодействия и анимации</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {t.interactions.map((item, i) => (
              <Badge key={i} variant="secondary" className="text-sm">{item}</Badge>
            ))}
          </div>
        </div>
      )}

      {t.inspiration && t.inspiration.length > 0 && (
        <div>
          <SectionLabel icon={Lightbulb}>Что стоит украсть</SectionLabel>
          <div className="space-y-2">
            {t.inspiration.map((item, i) => (
              <div key={i} className="flex items-start gap-3 border-l-2 border-l-primary/40 pl-4 py-2">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
