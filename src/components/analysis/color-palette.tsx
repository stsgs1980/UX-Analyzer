"use client";

import { Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ColorSwatchProps {
  hex: string;
  name?: string;
  usage?: string;
  percentage?: number;
}

function ColorSwatch({ hex, name, usage, percentage }: ColorSwatchProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(hex);
    setCopied(true);
    toast.success(`${hex} скопирован`);
    setTimeout(() => setCopied(false), 1500);
  }, [hex]);

  // Determine if the color is light or dark for text contrast
  const isLight = isLightColor(hex);

  return (
    <div className="group flex items-center gap-3 border-b border-white/5 py-2.5">
      <button
        onClick={handleCopy}
        className="shrink-0 w-10 h-10 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-105 hover:border-white/20"
        style={{ backgroundColor: hex }}
        title={`Копировать ${hex}`}
      >
        {copied ? (
          <Check className={`h-3.5 w-3.5 ${isLight ? "text-black/60" : "text-white/60"}`} />
        ) : (
          <span className={`text-[10px] font-mono ${isLight ? "text-black/50" : "text-white/50"}`}>{" "}</span>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground">{hex}</span>
          {name && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              {name}
            </Badge>
          )}
        </div>
        {usage && <p className="text-xs text-muted-foreground mt-0.5 truncate">{usage}</p>}
      </div>
      {percentage !== undefined && (
        <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0">
          {percentage}%
        </span>
      )}
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

interface ColorPaletteProps {
  colors?: {
    primary?: string[];
    secondary?: string[];
    accent?: string[];
    background?: string[];
    text?: string[];
    dominantColors?: Array<{
      hex: string;
      name: string;
      usage: string;
      percentage: number;
    }>;
  };
}

export function ColorPalette({ colors }: ColorPaletteProps) {
  const [activeTab, setActiveTab] = useState<"dominant" | "groups">("dominant");

  if (!colors) return null;

  const handleExportCss = () => {
    const lines = [":root {"];
    const addVar = (name: string, hex?: string) => {
      if (hex) lines.push(`  --color-${name}: ${hex};`);
    };
    addVar("primary", colors.primary?.[0]);
    addVar("primary-foreground", colors.primary?.[1]);
    addVar("secondary", colors.secondary?.[0]);
    addVar("secondary-foreground", colors.secondary?.[1]);
    addVar("accent", colors.accent?.[0]);
    addVar("background", colors.background?.[0]);
    addVar("foreground", colors.text?.[0]);
    addVar("muted-foreground", colors.text?.[1]);
    lines.push("}");
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("CSS Variables скопированы");
  };

  const handleExportTailwind = () => {
    const entries: string[] = [];
    if (colors.primary?.[0]) entries.push(`"primary": "${colors.primary[0]}"`);
    if (colors.secondary?.[0]) entries.push(`"secondary": "${colors.secondary[0]}"`);
    if (colors.accent?.[0]) entries.push(`"accent": "${colors.accent[0]}"`);
    if (colors.background?.[0]) entries.push(`"background": "${colors.background[0]}"`);
    if (colors.text?.[0]) entries.push(`"foreground": "${colors.text[0]}"`);
    const config = `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        ${entries.join(",\n        ")}
      }
    }
  }
};`;
    navigator.clipboard.writeText(config);
    toast.success("Tailwind config скопирован");
  };

  const allGroupColors = [
    ...(colors.primary?.map((c) => ({ hex: c, group: "Primary" })) || []),
    ...(colors.secondary?.map((c) => ({ hex: c, group: "Secondary" })) || []),
    ...(colors.accent?.map((c) => ({ hex: c, group: "Accent" })) || []),
    ...(colors.background?.map((c) => ({ hex: c, group: "Background" })) || []),
    ...(colors.text?.map((c) => ({ hex: c, group: "Text" })) || []),
  ];

  return (
    <div className="space-y-4">
      {/* Tab switcher + export buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("dominant")}
            className={`text-xs px-3 py-1.5 border transition-all duration-200 ${
              activeTab === "dominant"
                ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5"
                : "border-white/8 text-muted-foreground hover:text-foreground"
            }`}
          >
            Dominant
          </button>
          {allGroupColors.length > 0 && (
            <button
              onClick={() => setActiveTab("groups")}
              className={`text-xs px-3 py-1.5 border transition-all duration-200 ${
                activeTab === "groups"
                  ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5"
                  : "border-white/8 text-muted-foreground hover:text-foreground"
              }`}
            >
              Groups
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={handleExportCss} className="text-xs h-7">
            <Copy className="h-3 w-3 mr-1" />
            CSS
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportTailwind} className="text-xs h-7">
            <Copy className="h-3 w-3 mr-1" />
            Tailwind
          </Button>
        </div>
      </div>

      {/* Color swatches */}
      {activeTab === "dominant" && colors.dominantColors && (
        <div>
          {colors.dominantColors.map((c, i) => (
            <ColorSwatch key={i} hex={c.hex} name={c.name} usage={c.usage} percentage={c.percentage} />
          ))}
        </div>
      )}

      {activeTab === "groups" && (
        <div>
          {allGroupColors.map((c, i) => (
            <ColorSwatch key={i} hex={c.hex} name={c.group} />
          ))}
        </div>
      )}
    </div>
  );
}
