'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { todayISO } from '@/lib/dates';
import { downloadFile } from '@/lib/download';
import { useWorkspace } from '@/lib/store/use-workspace';
import { Button } from '@/components/ui/button';
import { focusRing } from '@/components/ui/focus-ring';

const bannerClasses = 'flex items-start gap-3 rounded-lg border border-border bg-warn-bg p-4 text-sm text-warn-fg';

/**
 * Warnings about the browser's storage, shown below the site header once the workspace has loaded:
 * storage that cannot save, and stored data that could not be read (with a way to download it).
 */
export function StorageBanner({ className }: { className?: string }) {
  const ready = useWorkspace((s) => s.ready);
  const storageAvailable = useWorkspace((s) => s.storageAvailable);
  const corruptBackupKey = useWorkspace((s) => s.corruptBackupKey);
  if (!ready || (storageAvailable && !corruptBackupKey)) return null;
  return (
    <div className={cn('mx-auto flex max-w-[1120px] flex-col gap-3 px-4 pt-4', className)}>
      {!storageAvailable && (
        <div role="status" className={bannerClasses}>
          <TriangleAlert aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0" />
          <p className="pt-0.5">
            This browser can&apos;t save your work. Export your workspace to keep it.{' '}
            <Link href="/settings/#your-data" className={cn('font-medium underline underline-offset-2', focusRing)}>
              Go to Settings
            </Link>
          </p>
        </div>
      )}
      {corruptBackupKey && <CorruptNotice storageKey={corruptBackupKey} />}
    </div>
  );
}

function CorruptNotice({ storageKey }: { storageKey: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string>();
  if (dismissed) return null;

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
    <div role="status" className={bannerClasses}>
      <TriangleAlert aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
        <p>
          We couldn&apos;t read your saved workspace, so we started a fresh one. A copy of the old data was kept in
          this browser.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={download}>
            <Download aria-hidden="true" size={16} strokeWidth={1.5} />
            Download the old data
          </Button>
        </div>
        {error && <p role="alert">{error}</p>}
      </div>
      <Button variant="ghost" iconOnly aria-label="Dismiss" onClick={() => setDismissed(true)} className="-my-1.5 -mr-1.5 shrink-0">
        <X aria-hidden="true" size={20} strokeWidth={1.5} className="text-warn-fg" />
      </Button>
    </div>
  );
}
