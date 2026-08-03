"use client";

import type { AnalysisResult } from "@/store/analysis-store";
import { useAnalysisStore } from "@/store/analysis-store";
import { ColorPalette } from "./color-palette";
import { DesignMdViewer } from "./design-md-viewer";
import { TypographySection } from "./design-typography";
import { LayoutSection, ComponentsSection } from "./design-layout-components";
import { EffectsSection, MoodSection, A11ySection, PatternsSection } from "./design-mood-sections";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Palette,
  Type,
  LayoutGrid,
  Box,
  Sparkles,
  Heart,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

export function DesignSystemTab({ data }: { data: AnalysisResult }) {
  const designMdContent = useAnalysisStore((s) => s.designMdContent) || data.designMd;
  const imageBase64 = useAnalysisStore((s) => s.imageBase64);
  const vlm = data.vlmAnalysis;

  if (!vlm && !designMdContent) {
    return (
      <div className="py-12 text-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          Визуальный анализ доступен при анализе любого URL (автоматический скриншот), Pinterest, прямой ссылки на изображение или загрузки файла.
        </p>
      </div>
    );
  }

  const imagePreview = data.extractedImageUrl || imageBase64;

  return (
    <div className="space-y-6">
      {imagePreview && (
        <div className="border-l-2 border-l-primary/40 pl-4">
          <img
            src={imagePreview}
            alt="Анализируемое изображение"
            width={512}
            height={256}
            className="max-h-64 object-contain border border-white/8"
          />
        </div>
      )}

      {data.pinterestData && (
        <div className="border-l-2 border-l-primary/30 pl-4 py-2 space-y-1">
          <p className="text-sm font-medium">{data.pinterestData.title}</p>
          <p className="text-xs text-muted-foreground">by {data.pinterestData.authorName}</p>
        </div>
      )}

      {vlm && (
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 border-b border-white/5 pb-0">
            <TabsTrigger value="colors" className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2">
              <Palette className="h-3.5 w-3.5" /> Палитра
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2">
              <Type className="h-3.5 w-3.5" /> Типографика
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2">
              <LayoutGrid className="h-3.5 w-3.5" /> Layout
            </TabsTrigger>
            <TabsTrigger value="components" className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2">
              <Box className="h-3.5 w-3.5" /> Компоненты
            </TabsTrigger>
            <TabsTrigger value="effects" className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2">
              <Sparkles className="h-3.5 w-3.5" /> Эффекты
            </TabsTrigger>
            <TabsTrigger value="mood" className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2">
              <Heart className="h-3.5 w-3.5" /> Настроение
            </TabsTrigger>
            <TabsTrigger value="designmd" className="flex items-center gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2">
              <FileText className="h-3.5 w-3.5" /> DESIGN.md
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

      {!vlm && designMdContent && (
        <DesignMdViewer content={designMdContent} />
      )}
    </div>
  );
}
