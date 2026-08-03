'use client';

import type { AnalysisResult } from '@/store/analysis-store';
import { useAnalysisStore } from '@/store/analysis-store';
import {
  Palette,
  Layers,
  FileText,
  GitCompare,
  Cpu,
  AlertTriangle,
  ClipboardCheck,
  Wrench,
  ScanSearch,
  Server,
} from 'lucide-react';

import { TeardownTab } from './teardown-tab';
import { DeconstructionTab } from './deconstruction-tab';
import { SpecTab } from './spec-tab';
import { PatternMiningTab } from './pattern-mining-tab';
import { ReverseEngineeringTab } from './reverse-engineering-tab';
import { AuditTab } from './audit-tab';
import { HeuristicTab } from './heuristic-tab';
import { DesignSystemTab } from './design-system-tab';
import { ReferenceCodeTab } from './reference-code-tab';
import { RscPayloadTab } from './rsc-payload-tab';

export type CardConfig = {
  id: string;
  label: string;
  icon: React.ElementType;
  colSpan: number;
  summary: string;
  tab: React.ComponentType<{ data: AnalysisResult }>;
  condition?: boolean;
};

export function buildCardConfigs(result: AnalysisResult): CardConfig[] {
  const isBatch = result.type === 'batch';

  return [
    {
      id: 'teardown',
      label: 'Teardown',
      icon: Palette,
      colSpan: 1,
      summary: result.teardown?.title || 'Визуальный разбор продукта',
      tab: TeardownTab,
    },
    {
      id: 'deconstruction',
      label: 'Deconstruction',
      icon: Layers,
      colSpan: 1,
      summary: result.deconstruction?.layers
        ? `${result.deconstruction.layers.length} смысловых слоёв`
        : 'Смысловые слои продукта',
      tab: DeconstructionTab,
    },
    {
      id: 'spec',
      label: 'Spec',
      icon: FileText,
      colSpan: 1,
      summary: result.spec?.functionalRequirements
        ? `${result.spec.functionalRequirements.length} FR`
        : 'Спецификация',
      tab: SpecTab,
    },
    ...(isBatch
      ? [
          {
            id: 'patterns',
            label: 'Patterns',
            icon: GitCompare,
            colSpan: 1,
            summary: result.patternMining?.summary || 'Паттерны между URL',
            tab: PatternMiningTab,
            condition: isBatch,
          },
        ]
      : []),
    {
      id: 'reverse',
      label: 'Reverse Eng.',
      icon: Cpu,
      colSpan: 1,
      summary: 'Реконструкция архитектуры',
      tab: ReverseEngineeringTab,
    },
    {
      id: 'audit',
      label: 'Audit',
      icon: AlertTriangle,
      colSpan: 2,
      summary: result.audit?.problems ? `${result.audit.problems.length} проблем` : 'Аудит UI/UX',
      tab: AuditTab,
    },
    {
      id: 'heuristic',
      label: 'Heuristics',
      icon: ClipboardCheck,
      colSpan: 1,
      summary: result.heuristicEvaluation?.averageScore
        ? `Балл ${result.heuristicEvaluation.averageScore.toFixed(1)}`
        : 'Эвристическая оценка',
      tab: HeuristicTab,
    },
    {
      id: 'design-system',
      label: 'Design System',
      icon: ScanSearch,
      colSpan: 3,
      summary: 'Цвета, типографика, компоненты',
      tab: DesignSystemTab,
    },
    {
      id: 'reference-code',
      label: 'Reference Pipeline',
      icon: Wrench,
      colSpan: 3,
      summary: 'Пошаговый pipeline с кодом',
      tab: ReferenceCodeTab,
      condition: !!result.referenceCode || !!useAnalysisStore.getState().referenceCodeContent,
    },
    {
      id: 'rsc-payload',
      label: 'RSC Payload',
      icon: Server,
      colSpan: 2,
      summary: result.rscPayload?.isNextJs
        ? `Next.js: ${result.rscPayload.serverComponents?.length || 0} SC, ${result.rscPayload.clientComponents?.length || 0} CC`
        : 'RSC payload extraction',
      tab: RscPayloadTab,
      condition: !!result.rscPayload || !!useAnalysisStore.getState().rscPayloadContent,
    },
  ];
}
