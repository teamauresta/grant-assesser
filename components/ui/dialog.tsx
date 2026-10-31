'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, type ButtonVariant } from './button';
import { focusRingInset } from './focus-ring';
import { WINDOW_BAR, WINDOW_FRAME } from './window';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type DialogProps = {
  open: boolean;
  /** Called on Escape, the close button and Cancel buttons the caller renders. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Focused when the dialog opens; defaults to the first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Buttons, right-aligned below the content. */
  footer?: ReactNode;
  children?: ReactNode;
  size?: 'sm' | 'md';
};

/**
 * Modal dialog (WAI-ARIA dialog pattern): focus moves in and is trapped, Escape closes, the rest of
 * the page is inert, and focus returns to the element that opened it. Clicking the backdrop does
 * nothing, so a half-filled form is never lost by a stray click.
 *
 * Drawn as a window (Billabong design doc section 4): the title in the window's neutral bar with a
 * real close button (no decorative glyphs), over a --surface body.
 *
 * The rest of the page, the toasts included, is inert while it is open, so a toast shown then is
 * neither announced nor reachable. Show a toast after closing: a flow that closes the dialog and
 * cheers should cheer on the next frame (the pipeline's outcome dialog does), by which time the
 * dialog's cleanup has made the page live again.
 */
export function Dialog({ open, onClose, title, description, initialFocusRef, footer, children, size = 'md' }: DialogProps) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <DialogPanel onClose={onClose} title={title} description={description} initialFocusRef={initialFocusRef} footer={footer} size={size}>
      {children}
    </DialogPanel>,
    document.body,
  );
}

function DialogPanel({ onClose, title, description, initialFocusRef, footer, children, size }: Omit<DialogProps, 'open'>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = rootRef.current!;
    // Make everything else inert so screen readers and Tab stay inside the dialog.
    const others = Array.from(document.body.children).filter((el): el is HTMLElement => el instanceof HTMLElement && !el.contains(root) && !el.inert);
    others.forEach((el) => { el.inert = true; });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = initialFocusRef?.current ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panelRef.current;
    first?.focus();
    return () => {
      others.forEach((el) => { el.inert = false; });
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
    // Runs once per opening; initialFocusRef is read on open only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // A menu inside the dialog handles its own Escape (and prevents the default).
    if (e.key === 'Escape' && !e.defaultPrevented) {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (!items.length) { e.preventDefault(); return; }
    const firstItem = items[0];
    const lastItem = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === firstItem || document.activeElement === panelRef.current)) {
      e.preventDefault(); lastItem.focus();
    } else if (!e.shiftKey && document.activeElement === lastItem) {
      e.preventDefault(); firstItem.focus();
    }
  };

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 flex items-end justify-center bg-scrim p-4 sm:items-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          WINDOW_FRAME,
          'flex max-h-[calc(100dvh-2rem)] w-full animate-dialog-in flex-col border-border focus:outline-none',
          size === 'sm' ? 'max-w-md' : 'max-w-lg',
        )}
      >
        <div className={WINDOW_BAR}>
          <h2 id={`${id}-title`} className="min-w-0 flex-1 break-words text-base font-semibold">{title}</h2>
          {/* 44px target in a bar sized for text: the negative margins keep the bar compact. The button
              then fills the bar's corner, so its focus outline is drawn inside it, not over the frame. */}
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close"
            className={cn('-my-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center self-start rounded-md text-muted-fg hover:bg-surface hover:text-fg', focusRingInset)}
          >
            <X aria-hidden="true" size={20} strokeWidth={1.5} />
          </button>
        </div>
        {(description || children) && (
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-5 py-5">
            {description && <div id={`${id}-desc`} className="text-sm text-muted-fg">{description}</div>}
            {children}
          </div>
        )}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: Extract<ButtonVariant, 'primary' | 'danger'>;
};

/** Asks before an action that cannot be undone. Cancel is focused first, so Enter never destroys anything. */
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel, variant = 'danger' }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      initialFocusRef={cancelRef}
      size="sm"
      footer={(
        <>
          <Button ref={cancelRef} onClick={onCancel}>Cancel</Button>
          <Button variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    />
  );
}
