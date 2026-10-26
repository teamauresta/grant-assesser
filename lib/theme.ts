import type { Workspace } from '@/lib/schema';

export type ThemePreference = Workspace['settings']['theme'];
/** Read by the pre-paint script in app/layout.tsx, so it must stay in step with it. */
export const THEME_KEY = 'gn-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';
// Used when localStorage is blocked, so the choice still holds for this page load.
let memory: ThemePreference | undefined;

function isPreference(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'light' || v === 'dark';
}

/** The theme preference this browser applies, or undefined if none has been chosen. Client only. */
export function getStoredTheme(): ThemePreference | undefined {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    if (isPreference(v)) return v;
  } catch { /* blocked storage: fall back to memory */ }
  return memory;
}

export function systemTheme(): 'light' | 'dark' {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function paint(pref: ThemePreference | undefined) {
  document.documentElement.dataset.theme = pref === 'light' || pref === 'dark' ? pref : systemTheme();
}

/** Stores the preference for the pre-paint script and applies it now. Client only. */
export function applyTheme(pref: ThemePreference) {
  memory = pref;
  try { window.localStorage.setItem(THEME_KEY, pref); } catch { /* blocked storage: memory only */ }
  paint(pref);
}

/** Follows the device's light or dark setting while the preference is 'system'. Returns a cleanup. */
export function watchSystemTheme(): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(DARK_QUERY);
  const onChange = () => {
    const pref = getStoredTheme();
    if (pref !== 'light' && pref !== 'dark') paint(pref);
  };
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
