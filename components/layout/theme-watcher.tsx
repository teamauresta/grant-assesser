'use client';

import { useEffect } from 'react';
import { watchSystemTheme } from '@/lib/theme';

/** Keeps the page in step with the device's light or dark setting while the theme is 'system'. */
export function ThemeWatcher() {
  useEffect(() => watchSystemTheme(), []);
  return null;
}
