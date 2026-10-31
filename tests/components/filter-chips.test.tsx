// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChips } from '@/components/programs/filter-chips';

const OPTIONS = [{ value: 'grant', label: 'Grant' }, { value: 'tax', label: 'Tax incentive' }] as const;

function renderChips(pressed: string[], onToggle = vi.fn()) {
  render(<FilterChips label="Type" options={OPTIONS} isPressed={(v) => pressed.includes(v)} onToggle={onToggle} />);
  return onToggle;
}

// Filter chips (Billabong plan, Task 5; design doc section 11): rounded-full outline chips; pressed
// is filled with --fg and --bg text, the clearest state in both themes (tests/lib/tokens.test.ts
// checks its contrast). The state is aria-pressed, and a check icon, so it never rests on colour alone.
describe('FilterChips', () => {
  it('is a group of toggle buttons named by its label', async () => {
    const onToggle = renderChips(['grant']);
    const group = screen.getByRole('group', { name: 'Type' });
    expect(within(group).getByRole('button', { name: 'Grant' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Tax incentive' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Tax incentive' }));
    expect(onToggle).toHaveBeenCalledWith('tax');
  });

  it('draws unpressed chips as outlines on the surface', () => {
    renderChips([]);
    const chip = screen.getByRole('button', { name: 'Grant' });
    expect(chip).toHaveClass('rounded-full', 'border', 'border-border-strong', 'bg-surface', 'text-fg');
    expect(chip.querySelector('svg')).toBeNull();
  });

  it('fills a pressed chip with --fg, with --bg text and a check icon', () => {
    renderChips(['grant']);
    const chip = screen.getByRole('button', { name: 'Grant' });
    expect(chip).toHaveClass('rounded-full', 'border-fg', 'bg-fg', 'text-bg');
    // Hover feedback that keeps the fill (tests/lib/tokens.test.ts checks it at 90%).
    expect(chip).toHaveClass('hover:opacity-90');
    expect(chip).not.toHaveClass('bg-surface');
    const icon = chip.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    // The icon takes the chip's text colour (an accent icon on --fg is too faint).
    expect(icon!.getAttribute('class')).not.toMatch(/\btext-/);
  });
});
