import { useState, useCallback } from 'react';

export type CodeViewMode = 'code' | 'preview';

/**
 * Encapsulates the view-mode and fullscreen state for the reference code tab.
 * Reduces 2 useState calls in the parent component to a single hook.
 */
export function useReferenceCodeView(hasPreview: boolean) {
  const [activeView, setActiveView] = useState<CodeViewMode>(hasPreview ? 'preview' : 'code');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  return {
    activeView,
    setActiveView,
    isFullscreen,
    toggleFullscreen,
    closeFullscreen,
  };
}
