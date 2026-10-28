'use client';

import { useEffect, useRef } from 'react';

/**
 * One pointer listener for a list of `[data-spotlight]` cards: writes the pointer's position on the
 * hovered card as --spot-x/--spot-y, read by the `spotlight` utility in app/globals.css. Mouse and
 * pen only; the CSS hides the highlight on touch and under reduced motion.
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const card = (e.target as Element | null)?.closest<HTMLElement>('[data-spotlight]');
      if (!card || !root.contains(card)) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
      card.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
    };
    root.addEventListener('pointermove', move);
    return () => root.removeEventListener('pointermove', move);
  }, []);
  return ref;
}
