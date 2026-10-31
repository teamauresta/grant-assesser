'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { todayISO } from '@/lib/dates';
import { downloadFile } from '@/lib/download';
import { useWorkspace } from '@/lib/store/use-workspace';
import { Button } from '@/components/ui/button';
import { WARN_CALLOUT } from '@/components/ui/callout';
import { focusRing } from '@/components/ui/focus-ring';

const CANNOT_SAVE = "This browser can't save your work. Export your workspace to keep it.";
const UNREADABLE = "We couldn't read your saved workspace, so we started a fresh one. A copy of the old data was kept in this browser.";

/**
 * Warnings about the browser's storage, shown below the site header once the workspace has loaded:
 * storage that cannot save, and stored data that could not be read (with a way to download it).
 *
 * The callouts are labelled asides, not live regions. One polite status, always mounted (empty on the
 * server and until the workspace loads), announces their messages when they appear, so the region
 * exists before its text does and no live region is nested in another (design doc section 11, Task 9
 * review). The download error is an alert inside its callout, outside any status.
 */
export function StorageBanner({ className }: { className?: string }) {
  const ready = useWorkspace((s) => s.ready);
  const storageAvailable = useWorkspace((s) => s.storageAvailable);
  const corruptBackupKey = useWorkspace((s) => s.corruptBackupKey);
  const [dismissed, setDismissed] = useState(false);
  const cannotSave = ready && !storageAvailable;
  const unreadable = ready && corruptBackupKey !== null && !dismissed;
  const announcement = [cannotSave && CANNOT_SAVE, unreadable && UNREADABLE].filter(Boolean).join(' ');
  return (
    <div className={cn('mx-auto flex max-w-[1120px] flex-col gap-3 px-4', (cannotSave || unreadable) && 'pt-4', className)}>
      <p role="status" className="sr-only">{announcement}</p>
      {cannotSave && (
        <aside aria-label="Storage warning" className={WARN_CALLOUT}>
          <TriangleAlert aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0" />
          <p className="pt-0.5">
            {CANNOT_SAVE}{' '}
            <Link href="/settings/#your-data" className={cn('font-medium underline underline-offset-2', focusRing)}>
              Go to Settings
            </Link>
          </p>
        </aside>
      )}
      {unreadable && <CorruptNotice storageKey={corruptBackupKey} onDismiss={() => setDismissed(true)} />}
    </div>
  );
}

function CorruptNotice({ storageKey, onDismiss }: { storageKey: string; onDismiss: () => void }) {
  const [error, setError] = useState<string>();

  const download = () => {
    let raw: string | null = null;
    try { raw = window.localStorage.getItem(storageKey); } catch { /* reported below */ }
    if (raw === null) {
      setError("The old data couldn't be read from this browser. It may have been cleared.");
      return;
    }
    setError(undefined);
    downloadFile(`grant-navigator-old-data-${todayISO(new Date())}.json`, raw, 'application/json');
  };

  return (
    <aside aria-label="Unreadable workspace" className={WARN_CALLOUT}>
      <TriangleAlert aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col pt-0.5">
        <p>{UNREADABLE}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={download}>
            <Download aria-hidden="true" size={16} strokeWidth={1.5} />
            Download the old data
          </Button>
        </div>
        {/* Always mounted (and empty, so no height), so the error is announced when it appears. */}
        <div role="alert">{error && <p className="mt-3">{error}</p>}</div>
      </div>
      <Button variant="ghost" iconOnly aria-label="Dismiss" onClick={onDismiss} className="-my-1.5 -mr-1.5 shrink-0">
        <X aria-hidden="true" size={20} strokeWidth={1.5} className="text-warn-fg" />
      </Button>
    </aside>
  );
}
