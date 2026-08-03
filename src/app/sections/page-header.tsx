import Link from 'next/link';
import { Eye } from 'lucide-react';

export function PageHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-md">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          <span className="text-sm font-medium tracking-tight">UX Analyzer</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Анализ
          </Link>
          <Link
            href="/history"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            История
          </Link>
        </nav>
      </div>
    </header>
  );
}
