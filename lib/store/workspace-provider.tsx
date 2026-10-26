'use client';

import { useEffect, type ReactNode } from 'react';
import { useWorkspace } from './use-workspace';

/**
 * Loads the browser workspace once on mount and saves any pending change when the page is hidden or
 * closed (the normal save waits 500ms after the last edit). Renders its children unchanged.
 */
export function WorkspaceProvider({ children }: { children?: ReactNode }) {
  useEffect(() => {
    const { init, flush } = useWorkspace.getState();
    void init();
    const onHide = () => { void flush(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') onHide(); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return children;
}
