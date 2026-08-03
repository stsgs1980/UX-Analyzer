"use client";

import { Layers, Sparkles, FileText, Cpu, Wrench } from "lucide-react";
import { ConfidenceBadge, EmptyState } from "./analysis-shared";
import type { AnalysisResult } from "@/store/analysis-store";

export function ReverseEngineeringTab({ data }: { data: AnalysisResult }) {
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
                  <Icon className="h-4 w-4" />{label}
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
