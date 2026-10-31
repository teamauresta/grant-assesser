// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChoiceGroup } from '@/components/ui/choice-group';

const OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No', description: 'Not yet' },
] as const;

/** The card (label) around a radio's or a checkbox's input. */
const card = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}`) }).closest('label')!;
const box =(name: string) => screen.getByRole('checkbox', { name: new RegExp(`^${name}`) }).closest('label')!;
const checkIcon = (label: HTMLElement) => label.querySelector('svg.lucide-check');

// Choice cards (Billabong plan, Task 6; design doc section 11): --surface cards outlined in
// --border-strong; the checked card has an --accent border, a 2px inset ring and a check icon, so the
// state never rests on colour alone. 44px targets.
describe('ChoiceGroup cards', () => {
  it('outlines unchecked cards in --border-strong on --surface, 44px tall, with no check icon', () => {
    render(<ChoiceGroup type="radio" name="q" legend="Question" options={OPTIONS} value={undefined} onChange={vi.fn()} />);
    for (const name of ['Yes', 'No']) {
      const label = card(name);
      expect(label).toHaveClass('min-h-11', 'rounded-lg', 'border', 'border-border-strong', 'bg-surface');
      expect(label).not.toHaveClass('border-accent');
      expect(checkIcon(label)).toBeNull();
    }
  });

  it('marks the checked radio card with an accent border, a 2px ring and a check icon', () => {
    render(<ChoiceGroup type="radio" name="q" legend="Question" options={OPTIONS} value="no" onChange={vi.fn()} />);
    const checked = card('No');
    expect(checked).toHaveClass('border-accent', 'ring-2', 'ring-inset', 'ring-accent');
    expect(checked).not.toHaveClass('border-border-strong');
    const icon = checkIcon(checked)!;
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(checkIcon(card('Yes'))).toBeNull();
    // The native input still carries the state for assistive tech.
    expect(screen.getByRole('radio', { name: /^No/ })).toBeChecked();
  });

  it('marks every checked checkbox card, and follows the value as it changes', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<ChoiceGroup type="checkbox" name="q" legend="Question" options={OPTIONS} value={['yes']} onChange={onChange} />);
    expect(checkIcon(box('Yes'))).not.toBeNull();
    expect(checkIcon(box('No'))).toBeNull();
    await userEvent.setup().click(screen.getByRole('checkbox', { name: /^No/ }));
    expect(onChange).toHaveBeenCalledWith(['yes', 'no']);
    rerender(<ChoiceGroup type="checkbox" name="q" legend="Question" options={OPTIONS} value={['yes', 'no']} onChange={onChange} />);
    expect(box('No')).toHaveClass('border-accent', 'ring-2');
    expect(checkIcon(box('No'))).not.toBeNull();
  });

  // Keyboard focus is an outline 2px outside the card (focus-ring offset), the checked ring sits
  // inside it, so the two never merge into one edge.
  it('shows keyboard focus as an offset outline, apart from the inset checked ring', () => {
    render(<ChoiceGroup type="radio" name="q" legend="Question" options={OPTIONS} value="yes" onChange={vi.fn()} />);
    const label = card('Yes');
    expect(label).toHaveClass('has-focus-visible:outline-2', 'has-focus-visible:outline-offset-2', 'has-focus-visible:outline-accent');
  });
});
