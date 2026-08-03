"use client";

import { useState } from "react";
import { useAnalysisStore, type AnalysisResult } from "@/store/analysis-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Palette, Layers, FileText, GitCompare, Cpu,
  AlertTriangle, ClipboardCheck, Sparkles, Wrench,
  ScanSearch, ChevronDown, ChevronUp, Server,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { CopyButton, ExportMarkdownButton, DownloadButton } from "./analysis-actions";
import { ConfidenceBadge } from "./analysis-shared";
import { TeardownTab } from "./teardown-tab";
import { DeconstructionTab } from "./deconstruction-tab";
import { SpecTab } from "./spec-tab";
import { PatternMiningTab } from "./pattern-mining-tab";
import { ReverseEngineeringTab } from "./reverse-engineering-tab";
import { AuditTab } from "./audit-tab";
import { HeuristicTab } from "./heuristic-tab";
import { DesignSystemTab } from "./design-system-tab";
import { ReferenceCodeTab } from "./reference-code-tab";
import { RscPayloadTab } from "./rsc-payload-tab";

// ── Card config ──
type CardConfig = {
  id: string;
  label: string;
  icon: React.ElementType;
  colSpan: number;
  summary: string;
  tab: React.ComponentType<{ data: AnalysisResult }>;
  condition?: boolean;
};

function buildCards(result: AnalysisResult): CardConfig[] {
  const isBatch = result.type === "batch";
  return [
    { id: "teardown", label: "Teardown", icon: Palette, colSpan: 1, summary: result.teardown?.title || "Визуальный разбор продукта", tab: TeardownTab },
    { id: "deconstruction", label: "Deconstruction", icon: Layers, colSpan: 1, summary: result.deconstruction?.layers ? `${result.deconstruction.layers.length} смысловых слоёв` : "Смысловые слои продукта", tab: DeconstructionTab },
    { id: "spec", label: "Spec", icon: FileText, colSpan: 1, summary: result.spec?.functionalRequirements ? `${result.spec.functionalRequirements.length} FR` : "Спецификация", tab: SpecTab },
    ...(isBatch ? [{ id: "patterns", label: "Patterns", icon: GitCompare, colSpan: 1, summary: result.patternMining?.summary || "Паттерны между URL", tab: PatternMiningTab, condition: true } as CardConfig] : []),
    { id: "reverse", label: "Reverse Eng.", icon: Cpu, colSpan: 1, summary: "Реконструкция архитектуры", tab: ReverseEngineeringTab },
    { id: "audit", label: "Audit", icon: AlertTriangle, colSpan: 2, summary: result.audit?.problems ? `${result.audit.problems.length} проблем` : "Аудит UI/UX", tab: AuditTab },
    { id: "heuristic", label: "Heuristics", icon: ClipboardCheck, colSpan: 1, summary: result.heuristicEvaluation?.averageScore ? `Балл ${result.heuristicEvaluation.averageScore.toFixed(1)}` : "Эвристическая оценка", tab: HeuristicTab },
    { id: "design-system", label: "Design System", icon: ScanSearch, colSpan: 3, summary: "Цвета, типографика, компоненты", tab: DesignSystemTab },
    { id: "reference-code", label: "Reference Pipeline", icon: Wrench, colSpan: 3, summary: "Пошаговый pipeline с кодом", tab: ReferenceCodeTab, condition: !!result.referenceCode || !!useAnalysisStore.getState().referenceCodeContent },
    { id: "rsc-payload", label: "RSC Payload", icon: Server, colSpan: 2, summary: result.rscPayload?.isNextJs ? `Next.js: ${result.rscPayload.serverComponents?.length || 0} SC, ${result.rscPayload.clientComponents?.length || 0} CC` : "RSC payload extraction", tab: RscPayloadTab, condition: !!result.rscPayload || !!useAnalysisStore.getState().rscPayloadContent },
  ];
}

// ── Meta info (small, kept inline) ──
function MetaInfo({ data }: { data: AnalysisResult }) {
  const m = data.meta;
  if (!m) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {m.dataSources?.map((ds) => <Badge key={ds} variant="outline" className="text-xs">{ds}</Badge>)}
      {m.confidence && <ConfidenceBadge confidence={m.confidence} />}
      {m.caveats?.map((c, i) => <span key={i} className="text-xs text-muted-foreground italic">{c}</span>)}
    </div>
  );
}

// ── Main composer ──
export function AnalysisResults() {
  const { result, reset, designMdContent } = useAnalysisStore();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  if (!result) return null;

  const isBatch = result.type === "batch";
  const jsonStr = JSON.stringify(result, null, 2);
  const cards = buildCards(result);

  const toggleCard = (id: string) => setExpandedCard((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Результат анализа
            <Badge variant="secondary">
              {result.sourceType === "upload" ? "Upload" : result.sourceType === "pinterest" ? "Pinterest" : isBatch ? "Batch" : "Single"}
            </Badge>
          </h2>
          <MetaInfo data={result} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyButton text={jsonStr} />
          <DownloadButton data={result} />
          <ExportMarkdownButton result={result} designMd={designMdContent} />
          <Button variant="ghost" size="sm" onClick={reset}>Новый анализ</Button>
        </div>
      </div>

      <div className="bento-grid">
        <AnimatePresence mode="wait">
          {cards.filter((c) => c.condition !== false).map((card) => {
            const isExpanded = expandedCard === card.id;
            const Icon = card.icon;
            const TabComponent = card.tab;
            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className={`bento-card p-4 cursor-pointer ${isExpanded ? "bento-card-expanded" : ""}`}
                style={isExpanded ? undefined : { gridColumn: `span ${card.colSpan}` }}
                onClick={() => toggleCard(card.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium">{card.label}</span>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
                {isExpanded ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                    <TabComponent data={result} />
                  </motion.div>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">{card.summary}</p>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
