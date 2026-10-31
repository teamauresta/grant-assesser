// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from '@/components/ui/tabs';

const tabs = [
  { value: 'a', label: 'Alpha', content: <p>Alpha panel</p> },
  { value: 'b', label: 'Beta', content: <p>Beta panel</p> },
] as const;

const indicators = () => document.querySelectorAll('[data-tab-indicator]');

describe('Tabs', () => {
  it('marks only the selected tab, which holds the one indicator', async () => {
    render(<Tabs label="Views" tabs={tabs} />);
    const alpha = screen.getByRole('tab', { name: 'Alpha' });
    const beta = screen.getByRole('tab', { name: 'Beta' });
    expect(alpha).toHaveAttribute('aria-selected', 'true');
    expect(beta).toHaveAttribute('aria-selected', 'false');
    expect(indicators()).toHaveLength(1);
    expect(alpha.querySelector('[data-tab-indicator]')).toHaveAttribute('aria-hidden', 'true');

    await userEvent.setup().click(beta);
    expect(beta).toHaveAttribute('aria-selected', 'true');
    expect(alpha).toHaveAttribute('aria-selected', 'false');
    expect(indicators()).toHaveLength(1);
    expect(beta.querySelector('[data-tab-indicator]')).not.toBeNull();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Beta panel');
  });
});

// Billabong tabs (design doc section 4): a 3px --accent underline on the active tab, which is --fg and
// semibold; the others are muted until hovered.
describe('Tabs style', () => {
  it('underlines the active tab in the accent, 3px', () => {
    render(<Tabs label="Views" tabs={tabs} />);
    const alpha = screen.getByRole('tab', { name: 'Alpha' });
    const beta = screen.getByRole('tab', { name: 'Beta' });
    expect(alpha).toHaveClass('text-fg', 'font-semibold');
    expect(beta).toHaveClass('text-muted-fg', 'hover:text-fg');
    expect(beta).not.toHaveClass('font-semibold');
    expect(alpha.querySelector('[data-tab-indicator]')).toHaveClass('h-[3px]', 'bg-accent');
  });
});
