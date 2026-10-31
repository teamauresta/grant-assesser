'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Keeps the CSS custom property `name` on <html> equal to the element's border-box height in px, so
 * layout that must clear the element (scroll padding, bottom padding) follows it when enlarged text
 * makes it taller. Removed on unmount, which leaves the stylesheet's default; without ResizeObserver
 * the default stays.
 */
export function useHeightVar(ref: RefObject<HTMLElement | null>, name: `--${string}`) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty(name, `${el.getBoundingClientRect().height}px`);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty(name);
    };
  }, [ref, name]);
}
