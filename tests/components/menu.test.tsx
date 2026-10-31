// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu } from '@/components/ui/menu';
import { buttonClasses } from '@/components/ui/button';

const items = [
  { id: 'a', label: 'Preparing', onSelect: vi.fn() },
  { id: 'b', label: 'Submitted', onSelect: vi.fn() },
];

// Menus (Billabong design doc section 11, Task 8): a --surface popover with a neutral outline and an
// 8px radius, lifted by the window's shadow; the menu button pattern is unchanged.
describe('Menu', () => {
  it('opens a --surface popover with a neutral border', async () => {
    const user = userEvent.setup();
    render(<Menu label="Move to…" items={items} />);
    const trigger = screen.getByRole('button', { name: 'Move to…' });
    expect(trigger).toHaveAttribute('class', buttonClasses());
    await user.click(trigger);
    const popover = screen.getByRole('menu').parentElement!;
    // shadow-popover, not shadow-window: the window shadow's 1px line doubled the popover's bottom
    // border (design doc section 11, Task 9).
    expect(popover).toHaveClass('bg-surface', 'border', 'border-border', 'rounded-lg', 'shadow-popover');
    expect(popover).not.toHaveClass('shadow-window');
    expect(popover).not.toHaveClass('bg-bg');
    expect(popover.className).not.toMatch(/\b(bg|border)-(primary|accent|brand|spark|ok|warn|danger|hl)/);
  });

  // An item's hover and focus fill must differ from the popover's own --surface.
  it('fills a hovered or focused item with --neutral-bg', async () => {
    const user = userEvent.setup();
    render(<Menu label="Move to…" items={items} />);
    await user.click(screen.getByRole('button', { name: 'Move to…' }));
    const item = screen.getByRole('menuitem', { name: 'Preparing' });
    expect(item).toHaveFocus();
    expect(item).toHaveClass('hover:bg-neutral-bg', 'focus:bg-neutral-bg');
    expect(item.className).not.toMatch(/\b(hover|focus):bg-surface\b/);
  });

  it('keeps the keyboard pattern: arrows move, Escape closes and returns focus', async () => {
    const user = userEvent.setup();
    render(<Menu label="Move to…" items={items} />);
    const trigger = screen.getByRole('button', { name: 'Move to…' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Preparing' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Submitted' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
