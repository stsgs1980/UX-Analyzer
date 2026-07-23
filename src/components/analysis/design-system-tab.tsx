"use client";

import type { AnalysisResult } from "@/store/analysis-store";
import { useAnalysisStore } from "@/store/analysis-store";
import { ColorPalette } from "./color-palette";
import { DesignMdViewer } from "./design-md-viewer";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Palette,
  Type,
  LayoutGrid,
  Box,
  Sparkles,
  Heart,
  Accessibility,
  Grid3X3,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { SectionLabel } from "./analysis-results";

type VlmData = NonNullable<AnalysisResult['vlmAnalysis']>;

type VlmTypography = VlmData['typography'];
type VlmLayout = VlmData['layout'];
type VlmComponents = VlmData['components'];
type VlmEffects = VlmData['visualEffects'];
type VlmMood = VlmData['moodAndTone'];
type VlmPatterns = VlmData['uiPatterns'];

function TypographySection({ typography }: { typography?: VlmTypography }) {
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

function LayoutSection({ layout }: { layout?: VlmLayout }) {
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

function ComponentsSection({ components }: { components?: VlmComponents }) {
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

function EffectsSection({ effects }: { effects?: VlmEffects }) {
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

function MoodSection({ mood }: { mood?: VlmMood }) {
  if (!mood) return null;
  return (
    <div>
      <SectionLabel icon={Heart}>Настроение и тон</SectionLabel>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {mood.keywords?.map((kw) => (
          <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
        ))}
      </div>
      {mood.description && (
        <p className="text-sm text-muted-foreground">{mood.description}</p>
      )}
    </div>
  );
}

function A11ySection({ notes }: { notes: string[] }) {
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

function PatternsSection({ patterns }: { patterns?: VlmPatterns }) {
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

export function DesignSystemTab({ data }: { data: AnalysisResult }) {
  const designMdContent = useAnalysisStore((s) => s.designMdContent) || data.designMd;
  const vlm = data.vlmAnalysis;

  if (!vlm && !designMdContent) {
    return (
      <div className="py-12 text-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          Визуальный анализ доступен при анализе Pinterest, прямых ссылок на изображения или загруженных файлах.
        </p>
      </div>
    );
  }

  // Image preview
  const imagePreview = data.imagePreviewUrl || data.extractedImageUrl;

  return (
    <div className="space-y-6">
      {/* Image preview */}
      {imagePreview && (
        <div className="border-l-2 border-l-primary/40 pl-4">
          <img
            src={imagePreview}
            alt="Анализируемое изображение"
            className="max-h-64 object-contain border border-white/8"
          />
        </div>
      )}

      {/* Pinterest data */}
      {data.pinterestData && (
        <div className="border-l-2 border-l-primary/30 pl-4 py-2 space-y-1">
          <p className="text-sm font-medium">{data.pinterestData.title}</p>
          <p className="text-xs text-muted-foreground">by {data.pinterestData.authorName}</p>
        </div>
      )}

      {/* Sub-tabs for VLM sections */}
      {vlm && (
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 border-b border-white/5 pb-0">
            <TabsTrigger
              value="colors"
              className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2"
            >
              <Palette className="h-3.5 w-3.5" />
              Палитра
            </TabsTrigger>
            <TabsTrigger
              value="typography"
              className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2"
            >
              <Type className="h-3.5 w-3.5" />
              Типографика
            </TabsTrigger>
            <TabsTrigger
              value="layout"
              className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Layout
            </TabsTrigger>
            <TabsTrigger
              value="components"
              className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2"
            >
              <Box className="h-3.5 w-3.5" />
              Компоненты
            </TabsTrigger>
            <TabsTrigger
              value="effects"
              className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Эффекты
            </TabsTrigger>
            <TabsTrigger
              value="mood"
              className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2"
            >
              <Heart className="h-3.5 w-3.5" />
              Настроение
            </TabsTrigger>
            <TabsTrigger
              value="designmd"
              className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2"
            >
              <FileText className="h-3.5 w-3.5" />
              DESIGN.md
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-auto">
            <div className="pt-4 pb-2">
              <TabsContent value="colors">
                <ColorPalette colors={vlm.colorPalette} />
              </TabsContent>
              <TabsContent value="typography">
                <TypographySection typography={vlm.typography} />
              </TabsContent>
              <TabsContent value="layout">
                <LayoutSection layout={vlm.layout} />
              </TabsContent>
              <TabsContent value="components">
                <ComponentsSection components={vlm.components} />
              </TabsContent>
              <TabsContent value="effects">
                <EffectsSection effects={vlm.visualEffects} />
              </TabsContent>
              <TabsContent value="mood">
                <div className="space-y-6">
                  <MoodSection mood={vlm.moodAndTone} />
                  <A11ySection notes={vlm.accessibilityNotes || []} />
                  <PatternsSection patterns={vlm.uiPatterns} />
                </div>
              </TabsContent>
              <TabsContent value="designmd">
                {designMdContent ? (
                  <DesignMdViewer content={designMdContent} />
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    DESIGN.md не был сгенерирован
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      )}

      {/* If only DESIGN.md is available (no VLM detail) */}
      {!vlm && designMdContent && (
        <DesignMdViewer content={designMdContent} />
      )}
    </div>
  );
}
