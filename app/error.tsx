'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { STORAGE_KEY } from '@/lib/store/workspace-store';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { focusRing } from '@/components/ui/focus-ring';
import { PageNoticeWindow } from '@/components/layout/page-notice';

type Props = {
  error: unknown;
  /** Re-fetches and re-renders the segment. */
  retry: () => void;
  /** Re-renders the segment without re-fetching. */
  reset: () => void;
};

/**
 * Fallback for a render error anywhere below the root layout. Most such errors come from stored data
 * the app cannot handle, so besides Try again it offers a way to start over without opening devtools.
 */
export default function ErrorPage({ error, retry, reset }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { console.error(error); }, [error]);

  const resetWorkspace = async () => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* blocked storage: nothing stored to clear */ }
    const store = useWorkspace.getState();
    store.reset();
    await store.flush();
    setConfirming(false);
    setDone(true);
    reset();
  };

  // The 404's layout (Billabong design doc section 11, Task 9): a window whose title is the page's one
  // h1. The copy stays plain: this is about the visitor's data (design doc section 7).
  return (
    <PageNoticeWindow title="Something went wrong">
      <p className="text-muted-fg">
        This page couldn&apos;t be shown. Try again, or check your workspace in{' '}
        <Link href="/settings/" className={cn('font-medium text-accent underline underline-offset-2', focusRing)}>Settings</Link>.
      </p>
      <Button variant="primary" onClick={() => retry()}>Try again</Button>

      <div className="mt-2 flex flex-col items-start gap-3 self-stretch border-t border-border pt-6">
        <h2 className="text-base font-semibold">Still not working?</h2>
        <p className="text-sm text-muted-fg">
          Your saved workspace may contain data this version can&apos;t read. Resetting deletes your profile, pipeline,
          goals and settings from this browser. It can&apos;t be undone.
        </p>
        {confirming ? (
          <div role="group" aria-label="Confirm reset" className="flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => { void resetWorkspace(); }}>Yes, reset my workspace</Button>
            <Button onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        ) : (
          <Button onClick={() => setConfirming(true)}>
            <RotateCcw aria-hidden="true" size={16} />
            Reset workspace
          </Button>
        )}
      </div>
      <div role="status" className="text-sm font-medium">{done && <p>Your workspace was reset.</p>}</div>
    </PageNoticeWindow>
  );
}
