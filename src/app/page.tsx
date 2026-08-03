'use client';

import { useEffect, useRef, use } from 'react';
import { useAnalysisStore } from '@/store/analysis-store';
import { AnalysisHistory } from '@/components/analysis/analysis-history';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { PageHeader } from '@/app/sections/page-header';
import { HeroSection } from '@/app/sections/hero-section';
import { BentoGrid } from '@/app/sections/bento-grid';
import { PageFooter } from '@/app/sections/page-footer';

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; rerun?: string }>;
}) {
  const params = use(searchParams);
  const { isAnalyzing, loadHistory, restoreSession, loadAnalysis, rerunAnalysis } =
    useAnalysisStore();
  const mainRef = useRef<HTMLDivElement>(null);

  // Expose store for debugging
  useEffect(() => {
    (window as any).__store = useAnalysisStore;
  }, []);

  useScrollReveal({ rootMargin: '0px 0px -30px 0px' });

  // Warn before navigation with unsaved state
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnalyzing) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAnalyzing]);

  // Restore session and load history on mount
  useEffect(() => {
    restoreSession();
    loadHistory();
  }, [restoreSession, loadHistory]);

  // Handle ?id= (load saved result) or ?rerun= (re-run analysis)
  useEffect(() => {
    if (params.rerun) {
      rerunAnalysis(params.rerun);
      window.history.replaceState({}, '', '/');
    } else if (params.id) {
      loadAnalysis(params.id);
    }
  }, [params.id, params.rerun]);

  return (
    <div className="min-h-screen flex flex-col organic-bg">
      <PageHeader />

      <main ref={mainRef} className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6">
        <HeroSection />
        <BentoGrid />

        <section className="pt-10">
          <AnalysisHistory />
        </section>
      </main>

      <PageFooter />
    </div>
  );
}
