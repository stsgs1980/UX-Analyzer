import { Leaf } from "lucide-react";

export function PageFooter() {
  return (
    <footer className="border-t border-white/5 mt-auto">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground/40">
          <p className="flex items-center gap-1.5">
            <Leaf className="h-3 w-3 text-emerald-500/30" aria-hidden="true" />
            UX Analyzer
          </p>
          <p className="hidden sm:block">
            Teardown · Deconstruction · Spec · Patterns · Reverse · Audit · Heuristics · Design System
          </p>
        </div>
      </div>
    </footer>
  );
}
