'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TOAST_MS, useToasts, type Toast } from '@/lib/toast';
import { focusRing } from './focus-ring';

/**
 * Short milestone messages at the bottom of the screen (above the mobile bottom nav). The polite
 * live region is always rendered, even when empty, so screen readers reliably announce new
 * messages; nothing here ever takes focus. Mount once, in the root layout.
 */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div
      // data-toaster: the hook tests use to find this region (the page has other status regions).
      data-toaster
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[calc(var(--bottom-bar-h)+0.875rem)] z-50 flex flex-col gap-2 md:bottom-6 md:left-auto md:right-6 md:w-96"
    >
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}

/**
 * One message. It dismisses itself after TOAST_MS, paused while hovered or while focus is inside
 * (WCAG 2.2.1). If it holds focus when it goes, focus moves to the main landmark, not the body.
 */
function ToastItem({ toast: { id, message, action } }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => dismiss(id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [paused, id, dismiss]);

  const close = () => {
    if (ref.current?.contains(document.activeElement)) document.getElementById('main')?.focus();
    dismiss(id);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
      // A small window-style card: --surface in a --border outline with the menus' popover shadow.
      className="flex animate-toast-in items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm text-fg shadow-popover"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
        <p>{message}</p>
        {action && (
          <Link
            href={action.href}
            onClick={close}
            className={cn('inline-flex min-h-11 items-center self-start rounded-sm font-medium text-accent underline underline-offset-2', focusRing)}
          >
            {action.label}
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss"
        className={cn('-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-fg hover:bg-neutral-bg hover:text-fg', focusRing)}
      >
        <X aria-hidden="true" size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}
