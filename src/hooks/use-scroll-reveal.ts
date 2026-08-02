"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal hook using IntersectionObserver.
 * Observes all [data-reveal] elements within the document.
 */
export function useScrollReveal(options?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  useEffect(() => {
    const { threshold = 0.1, rootMargin = "0px 0px -40px 0px", once = true } = options ?? {};

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove("revealed");
          }
        });
      },
      { threshold, rootMargin }
    );

    const elements = document.querySelectorAll("[data-reveal]");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [options]);
}