import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export type PaletteTab = 'dominant' | 'groups';

/**
 * Manages the dominant / groups tab switcher for ColorPalette.
 */
export function usePaletteTabs() {
  const [activeTab, setActiveTab] = useState<PaletteTab>('dominant');

  return { activeTab, setActiveTab };
}

/**
 * Manages a copy-to-clipboard interaction with a brief "copied" indicator.
 * Extracts the `copied` useState from ColorSwatch.
 */
export function useColorCopy(hex: string, resetDelay = 1500) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(hex);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), resetDelay);
    toast.success(`${hex} скопирован`);
  }, [hex, resetDelay]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { copied, handleCopy };
}
