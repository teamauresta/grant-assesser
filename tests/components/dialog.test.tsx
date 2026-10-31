// @vitest-environment jsdom
import { useRef, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { WINDOW_BAR } from '@/components/ui/window';
import { buttonClasses } from '@/components/ui/button';

/** A page with a button that opens a dialog holding two fields. */
function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const close = () => { onClose?.(); setOpen(false); };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      <p>Behind the dialog</p>
      <Dialog
        open={open}
        onClose={close}
        title="Add goal"
        description="Saved in this browser only."
        initialFocusRef={firstRef}
        footer={<button type="button" onClick={close}>Cancel</button>}
      >
        <input ref={firstRef} aria-label="Title" />
        <input aria-label="Due date" />
      </Dialog>
    </>
  );
}

// Dialogs in the window bar's look (Billabong design doc sections 4 and 11, Task 8): the title in a
// neutral bar with a real close button, over a --surface body. The dialog pattern is unchanged.
describe('Dialog', () => {
  it('is a modal dialog named by its title in a window bar, described by its description', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog', { name: 'Add goal' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Saved in this browser only.');
    const title = within(dialog).getByRole('heading', { level: 2, name: 'Add goal' });
    expect(dialog).toHaveAttribute('aria-labelledby', title.id);
    const bar = title.parentElement!;
    expect(WINDOW_BAR.split(' ').every((c) => bar.classList.contains(c))).toBe(true);
    expect(dialog).toHaveClass('bg-surface', 'border-border', 'shadow-window', 'rounded-lg');
    // The description is body text, below the bar.
    expect(bar.contains(screen.getByText('Saved in this browser only.'))).toBe(false);
  });

  it('has a real close button in the bar and no decorative window glyphs', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog', { name: 'Add goal' });
    const close = within(dialog).getByRole('button', { name: 'Close' });
    const bar = within(dialog).getByRole('heading', { name: 'Add goal' }).parentElement!;
    expect(close.parentElement).toBe(bar);
    expect(close).toHaveClass('size-11');
    // Only the close button's own icon is hidden: no minimise and maximise glyphs.
    expect(bar.querySelectorAll('svg')).toHaveLength(1);
    await user.click(close);
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves focus in, traps Tab, closes on Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const open = screen.getByRole('button', { name: 'Open' });
    await user.click(open);
    const dialog = screen.getByRole('dialog', { name: 'Add goal' });
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus();
    // The rest of the page is inert while the dialog is open.
    expect(screen.getByText('Behind the dialog').closest('div')!.inert).toBe(true);

    await user.tab(); // Due date
    await user.tab(); // Cancel, the last
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.tab(); // wraps to the first: Close
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(open).toHaveFocus();
    expect(screen.getByText('Behind the dialog').closest('div')!.inert).toBe(false);
  });
});

describe('ConfirmDialog', () => {
  function Confirm({ onConfirm = () => {}, onCancel = () => {} }: { onConfirm?: () => void; onCancel?: () => void }) {
    return <ConfirmDialog open title="Remove goal?" description="This can't be undone." confirmLabel="Remove" onConfirm={onConfirm} onCancel={onCancel} />;
  }

  it('focuses Cancel first, so Enter never destroys anything', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<Confirm onConfirm={onConfirm} onCancel={onCancel} />);
    const dialog = screen.getByRole('dialog', { name: 'Remove goal?' });
    expect(dialog).toHaveAccessibleDescription("This can't be undone.");
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms with a danger button with a ledge, Cancel secondary', () => {
    render(<Confirm />);
    const dialog = screen.getByRole('dialog', { name: 'Remove goal?' });
    expect(within(dialog).getByRole('button', { name: 'Remove' })).toHaveAttribute('class', buttonClasses({ variant: 'danger' }));
    expect(within(dialog).getByRole('button', { name: 'Remove' })).toHaveClass('ledge', 'border-b-3');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveAttribute('class', buttonClasses());
  });

  it('closes on Escape as Cancel', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<Confirm onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
