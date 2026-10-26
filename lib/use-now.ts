'use client';

import { useSyncExternalStore } from 'react';

export const NOW_REFRESH_MS = 60_000;

// One shared clock so every component on the page agrees on "now".
let current: Date | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function tick() {
  current = new Date();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    current = new Date();
    timer = setInterval(tick, NOW_REFRESH_MS);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot(): Date {
  return (current ??= new Date());
}

function getServerSnapshot(): null {
  return null;
}

/**
 * The current instant, refreshed every 60 seconds.
 * Returns `null` on the server and while hydrating, so server HTML and the first client render match;
 * callers show the declared (static) status until a date arrives.
 */
export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
