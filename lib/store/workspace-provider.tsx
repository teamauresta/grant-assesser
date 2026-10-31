'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useWorkspace } from './use-workspace';
import { STORAGE_KEY } from './workspace-store';

const NOTICE_MS = 5000;

/**
 * Loads the browser workspace once on mount and saves any pending change when the page is hidden or
 * closed (the normal save waits 500ms after the last edit). When another tab saves the workspace, it
 * reloads it here (that tab's write wins) and says so in a polite live region. Renders its children
 * unchanged.
 */
export function WorkspaceProvider({ children }: { children?: ReactNode }) {
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    const { init, flush, syncFromStorage } = useWorkspace.getState();
    void init();
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const onHide = () => { void flush(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') onHide(); };
    // Fires only for writes from other tabs; a null key means another tab cleared all storage.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      void syncFromStorage().then((changed) => {
        if (!changed) return;
        setNotice(true);
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => setNotice(false), NOTICE_MS);
      });
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <>
      {/* Always rendered so screen readers have the live region before a message arrives. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-bar-h)+1.375rem)] z-50 flex justify-center px-4 md:bottom-6"
      >
        {notice && <p className="rounded-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-fg">Updated from another tab</p>}
      </div>
      {children}
    </>
  );
}
