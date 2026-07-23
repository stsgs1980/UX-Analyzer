"use client";

import { useAnalysisStore, type AnalysisResult } from "@/store/analysis-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Palette,
  Layers,
  FileText,
  GitCompare,
  Cpu,
  AlertTriangle,
  ClipboardCheck,
  Copy,
  Download,
  Lightbulb,
  Wrench,
  Eye,
  Sparkles,
  BarChart3,
  ArrowRight,
  User,
  Target,
  CheckSquare,
  ScanSearch,
} from "lucide-react";
import { DesignSystemTab } from "./design-system-tab";
import { toast } from "sonner";

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  low: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  major: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  minor: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-600",
};

function ConfidenceBadge({ confidence }: { confidence: string }) {
  return (
    <Badge variant="outline" className={CONFIDENCE_COLORS[confidence] || ""}>
      {confidence}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge variant="outline" className={SEVERITY_COLORS[severity] || ""}>
      {severity}
    </Badge>
  );
}

export function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </h3>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success("JSON скопирован в буфер обмена");
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      <Copy className="h-3.5 w-3.5 mr-1.5" />
      Копировать JSON
    </Button>
  );
}

function DownloadButton({ data }: { data: unknown }) {
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      Скачать JSON
    </Button>
  );
}

/* ─── TEARDOWN TAB ─── */
function TeardownTab({ data }: { data: AnalysisResult }) {
  const t = data.teardown;
  if (!t) return <EmptyState message="Данные teardown недоступны" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{t.title || "Без названия"}</h2>
          <div className="flex items-center gap-2 mt-1">
            {t.source && <Badge variant="secondary">{t.source}</Badge>}
            {t.type && <Badge variant="outline">{t.type}</Badge>}
            {t.author && (
              <span className="text-sm text-muted-foreground">by {t.author}</span>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Visual Style */}
      {t.visualStyle && (
        <div>
          <SectionLabel icon={Palette}>Визуальный стиль</SectionLabel>
          <div className="border-l-2 border-l-primary/40 pl-4 py-3">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {t.visualStyle}
            </p>
          </div>
        </div>
      )}

      {/* Tech Stack */}
      {t.techStack && (
        <div>
          <SectionLabel icon={Cpu}>Технологический стек</SectionLabel>
          <div className="border-l-2 border-l-primary/40 pl-4 py-3">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {t.techStack}
            </p>
          </div>
        </div>
      )}

      {/* Features */}
      {t.features && t.features.length > 0 && (
        <div>
          <SectionLabel icon={Sparkles}>Ключевые фичи</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {t.features.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-2 border-l border-l-white/10 pl-3 py-2"
              >
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactions */}
      {t.interactions && t.interactions.length > 0 && (
        <div>
          <SectionLabel icon={Eye}>Взаимодействия и анимации</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {t.interactions.map((item, i) => (
              <Badge key={i} variant="secondary" className="text-sm">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Inspiration — "What to steal" */}
      {t.inspiration && t.inspiration.length > 0 && (
        <div>
          <SectionLabel icon={Lightbulb}>Что стоит украсть</SectionLabel>
          <div className="space-y-2">
            {t.inspiration.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 border-l-2 border-l-primary/40 pl-4 py-2"
              >
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

/* ─── DECONSTRUCTION TAB ─── */
function DeconstructionTab({ data }: { data: AnalysisResult }) {
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
                <span className="text-primary text-xs font-bold">
                  {i + 1}.
                </span>
                {layer.name}
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {layer.analysis}
              </p>
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

/* ─── SPEC TAB ─── */
function SpecTab({ data }: { data: AnalysisResult }) {
  const s = data.spec;
  if (!s) return <EmptyState message="Данные спецификации недоступны" />;

  const hasFR = s.functionalRequirements && s.functionalRequirements.length > 0;
  const hasNFR = s.nonFunctionalRequirements && s.nonFunctionalRequirements.length > 0;
  const hasUS = s.userStories && s.userStories.length > 0;

  if (!hasFR && !hasNFR && !hasUS) {
    return <EmptyState message="Спецификация пуста" />;
  }

  return (
    <div className="space-y-6">
      {/* Functional Requirements */}
      {hasFR && (
        <div>
          <SectionLabel icon={CheckSquare}>Функциональные требования (FR)</SectionLabel>
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-4">
              {s.functionalRequirements!.map((fr) => (
                <div
                  key={fr.id}
                  className="flex items-start gap-3 border-b border-white/5 pb-3"
                >
                  <Badge variant="outline" className="shrink-0 font-mono text-xs">
                    {fr.id}
                  </Badge>
                  <p className="text-sm">{fr.statement}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Non-Functional Requirements */}
      {hasNFR && (
        <div>
          <SectionLabel icon={BarChart3}>Нефункциональные требования (NFR)</SectionLabel>
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-4">
              {s.nonFunctionalRequirements!.map((nfr) => (
                <div
                  key={nfr.id}
                  className="flex items-start gap-3 border-b border-white/5 pb-3"
                >
                  <Badge variant="outline" className="shrink-0 font-mono text-xs">
                    {nfr.id}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{nfr.statement}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {nfr.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* User Stories */}
      {hasUS && (
        <div>
          <SectionLabel icon={User}>User Stories</SectionLabel>
          <div className="space-y-4">
            {s.userStories!.map((us) => (
              <div key={us.id} className="border-b border-white/5 pb-4">
                <h4 className="text-sm font-mono font-semibold mb-1">{us.id}</h4>
                <p className="text-sm italic text-muted-foreground mb-2">
                  Как <strong>{us.asRole}</strong>, я хочу{" "}
                  <strong>{us.iWant}</strong>, чтобы <strong>{us.soThat}</strong>.
                </p>
                {us.acceptanceCriteria && us.acceptanceCriteria.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Acceptance Criteria
                    </p>
                    <ul className="space-y-1">
                      {us.acceptanceCriteria.map((ac, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <Target className="h-3 w-3 mt-1 shrink-0" />
                          {ac}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PATTERN MINING TAB (batch only) ─── */
function PatternMiningTab({ data }: { data: AnalysisResult }) {
  const pm = data.patternMining;
  if (!pm || !pm.groups || pm.groups.length === 0) {
    return (
      <EmptyState message="Pattern Mining доступен только при анализе 2+ URL" />
    );
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
                      {pattern.count}/{data.type === "batch" ? String((data as Record<string, unknown>).totalUrls ?? "?") : "?"}
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

/* ─── REVERSE ENGINEERING TAB ─── */
function ReverseEngineeringTab({ data }: { data: AnalysisResult }) {
  const re = data.reverseEngineering;
  if (!re) return <EmptyState message="Данные reverse engineering недоступны" />;

  const categories = [
    { key: "frontend", label: "Фронтенд-стек", icon: Layers },
    { key: "animationLib", label: "Библиотеки анимаций", icon: Sparkles },
    { key: "dataLayer", label: "Слой данных / State", icon: FileText },
    { key: "backend", label: "Бэкенд-намёки", icon: Cpu },
    { key: "infra", label: "Инфраструктура", icon: Wrench },
  ] as const;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Поведенческий reverse engineering — реконструкция вероятной архитектуры
        по визуальным признакам без доступа к исходному коду.
      </p>
      <div className="space-y-4">
        {categories.map(({ key, label, icon: Icon }) => {
          const item = re[key];
          if (!item) return null;
          return (
            <div key={key} className="border-l-2 border-l-white/10 pl-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-base font-semibold flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </h4>
                <ConfidenceBadge confidence={item.confidence || "low"} />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">{item.stack}</p>
                <p className="text-sm text-muted-foreground">{item.evidence}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── AUDIT TAB ─── */
function AuditTab({ data }: { data: AnalysisResult }) {
  const a = data.audit;
  if (!a?.problems || a.problems.length === 0) {
    return <EmptyState message="Данные аудита недоступны" />;
  }

  const severityBorder = (severity: string) => {
    if (severity === "critical") return "border-l-red-500";
    if (severity === "major") return "border-l-orange-500";
    return "border-l-white/10";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Всего проблем: <strong>{a.problems.length}</strong></span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 bg-red-500" /> Critical:{" "}
          <strong>{a.problems.filter((p) => p.severity === "critical").length}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 bg-orange-500" /> Major:{" "}
          <strong>{a.problems.filter((p) => p.severity === "major").length}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 bg-yellow-500" /> Minor:{" "}
          <strong>{a.problems.filter((p) => p.severity === "minor").length}</strong>
        </span>
      </div>

      <ScrollArea className="max-h-[600px]">
        <div className="space-y-3 pr-4">
          {a.problems.map((problem, i) => (
            <div
              key={i}
              className={`border-l-2 pl-4 py-3 ${severityBorder(problem.severity)}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <Badge variant="outline" className="text-xs">
                    {problem.area}
                  </Badge>
                </h4>
                <SeverityBadge severity={problem.severity} />
              </div>
              <div className="space-y-2">
                <p className="text-sm">{problem.description}</p>
                <div className="border-l border-l-white/10 pl-3 py-2 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Рекомендация
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {problem.recommendation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── HEURISTIC EVALUATION TAB ─── */
function HeuristicTab({ data }: { data: AnalysisResult }) {
  const he = data.heuristicEvaluation;
  if (!he?.scores || he.scores.length === 0) {
    return <EmptyState message="Данные эвристической оценки недоступны" />;
  }

  const avg = he.averageScore ?? 0;

  const scoreColor = (s: number) => {
    if (s >= 3.5) return "text-emerald-600 dark:text-emerald-400";
    if (s >= 2.5) return "text-amber-600 dark:text-amber-400";
    if (s >= 1.5) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const scoreBg = (s: number) => {
    if (s >= 3.5) return "bg-emerald-500";
    if (s >= 2.5) return "bg-amber-500";
    if (s >= 1.5) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Average score */}
      <div className="border-l-2 border-l-primary/40 pl-4 py-3">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-bold tabular-nums ${scoreColor(avg)}`}>
              {avg.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground">/4.0</span>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-semibold text-lg">Общий балл</p>
            <p className="text-sm text-muted-foreground mt-1">
              {he.verdict || "Без вердикта"}
            </p>
          </div>
        </div>
      </div>

      {/* Individual scores */}
      <div className="space-y-3">
        {he.scores.map((item, i) => (
          <div key={i} className="border-b border-white/5 pb-3 pt-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{item.heuristic}</p>
                {item.observations && (
                  <p className="text-xs text-muted-foreground">{item.observations}</p>
                )}
                {item.recommendation && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    💡 {item.recommendation}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className={`text-lg font-bold ${scoreColor(item.score)}`}>
                  {item.score}
                </span>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3].map((dot) => (
                    <span
                      key={dot}
                      className={`inline-block h-1.5 w-5 ${
                        dot < item.score ? scoreBg(item.score) : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── EMPTY STATE ─── */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

/* ─── META INFO ─── */
function MetaInfo({ data }: { data: AnalysisResult }) {
  const m = data.meta;
  if (!m) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {m.dataSources?.map((ds) => (
        <Badge key={ds} variant="outline" className="text-xs">
          {ds}
        </Badge>
      ))}
      {m.confidence && <ConfidenceBadge confidence={m.confidence} />}
      {m.caveats?.map((c, i) => (
        <span key={i} className="text-xs text-muted-foreground italic">
          {c}
        </span>
      ))}
    </div>
  );
}

/* ─── MAIN RESULTS COMPONENT ─── */
export function AnalysisResults() {
  const { result, reset } = useAnalysisStore();

  if (!result) return null;

  const isBatch = result.type === "batch";
  const jsonStr = JSON.stringify(result, null, 2);

  const tabs = [
    { id: "teardown", label: "Teardown", icon: Palette },
    { id: "deconstruction", label: "Deconstruction", icon: Layers },
    { id: "spec", label: "Spec", icon: FileText },
    ...(isBatch ? [{ id: "patterns", label: "Patterns", icon: GitCompare }] : []),
    { id: "reverse", label: "Reverse Eng.", icon: Cpu },
    { id: "audit", label: "Audit", icon: AlertTriangle },
    { id: "heuristic", label: "Heuristics", icon: ClipboardCheck },
    { id: "design-system", label: "Design System", icon: ScanSearch },
  ];

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Результат анализа
            <Badge variant="secondary">
              {result.sourceType === "upload"
                ? "Upload"
                : result.sourceType === "pinterest"
                ? "Pinterest"
                : isBatch
                ? "Batch"
                : "Single"}
            </Badge>
          </h2>
          <MetaInfo data={result} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyButton text={jsonStr} />
          <DownloadButton data={result} />
          <Button variant="ghost" size="sm" onClick={reset}>
            Новый анализ
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="teardown" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 border-b border-white/5 pb-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-400 pb-2"
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="h-auto">
          <div className="pt-4 pb-2">
            <TabsContent value="teardown">
              <TeardownTab data={result} />
            </TabsContent>
            <TabsContent value="deconstruction">
              <DeconstructionTab data={result} />
            </TabsContent>
            <TabsContent value="spec">
              <SpecTab data={result} />
            </TabsContent>
            {isBatch && (
              <TabsContent value="patterns">
                <PatternMiningTab data={result} />
              </TabsContent>
            )}
            <TabsContent value="reverse">
              <ReverseEngineeringTab data={result} />
            </TabsContent>
            <TabsContent value="audit">
              <AuditTab data={result} />
            </TabsContent>
            <TabsContent value="heuristic">
              <HeuristicTab data={result} />
            </TabsContent>
            <TabsContent value="design-system">
              <DesignSystemTab data={result} />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}