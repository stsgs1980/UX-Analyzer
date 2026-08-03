"use client";

import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

// ── Color maps ──
export const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  low: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

export const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  major: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  minor: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-600",
};

// ── Shared UI primitives ──
export function ConfidenceBadge({ confidence }: { confidence: string }) {
  return (
    <Badge variant="outline" className={CONFIDENCE_COLORS[confidence] || ""}>
      {confidence}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
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

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" aria-hidden="true" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
