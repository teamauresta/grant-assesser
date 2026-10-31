'use client';

import { useState } from 'react';
import { Download, HardDriveDownload, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useNow } from '@/lib/use-now';
import { needsBackup } from '@/lib/store/backup';
import { exportWorkspaceFile } from '@/lib/store/transfer';
import { useWorkspace } from '@/lib/store/use-workspace';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'gn-backup-dismissed';

function dismissedThisSession(): boolean {
  try { return window.sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

/**
 * A quiet inline reminder to export the workspace when it has gone more than 14 days without a
 * backup. Dismissing hides it for the rest of the browser session. Never a modal.
 */
export function BackupPrompt({ className }: { className?: string }) {
  const now = useNow();
  const ready = useWorkspace((s) => s.ready);
  const ws = useWorkspace((s) => s.ws);
  const markExported = useWorkspace((s) => s.markExported);
  // Read lazily on the client only; useNow() is null during hydration, so nothing renders until then.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  if (!ready || !now) return null;
  const isDismissed = dismissed ?? dismissedThisSession();
  if (isDismissed || !needsBackup(ws, now)) return null;

  const dismiss = () => {
    try { window.sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* hidden for this page view only */ }
    setDismissed(true);
  };
  const exportNow = () => {
    exportWorkspaceFile(ws, new Date());
    markExported();
  };

  return (
    <aside aria-label="Backup reminder" className={cn('flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm', className)}>
      <HardDriveDownload aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0 text-muted-fg" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
        <p>
          <span className="font-medium">Back up your workspace.</span>{' '}
          <span className="text-muted-fg">
            It has been more than two weeks without an export, and your plan is stored only in this browser.
          </span>
        </p>
        <div>
          <Button onClick={exportNow}>
            <Download aria-hidden="true" size={16} strokeWidth={1.5} />
            Export workspace
          </Button>
        </div>
      </div>
      <Button variant="ghost" iconOnly aria-label="Dismiss backup reminder" onClick={dismiss} className="-my-1.5 -mr-1.5 shrink-0">
        <X aria-hidden="true" size={20} strokeWidth={1.5} className="text-muted-fg" />
      </Button>
    </aside>
  );
}
