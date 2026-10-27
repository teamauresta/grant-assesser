// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), useSearchParams: () => new URLSearchParams('step=6') }));
vi.mock('@/lib/use-now', () => ({ useNow: () => new Date('2026-10-27T00:00:00Z') }));

import { Wizard } from '@/components/assess/wizard';
import { consumeAssessmentFinished, resetCelebrations } from '@/lib/celebrate';
import { useWorkspace } from '@/lib/store/use-workspace';
import { emptyWorkspace } from '@/lib/store/workspace-store';

const now = new Date('2026-10-27T00:00:00Z');

beforeAll(async () => { await useWorkspace.getState().init(); });
beforeEach(() => {
  push.mockClear();
  resetCelebrations();
});

describe('Wizard last step', () => {
  it('marks the assessment finished when there are answers', async () => {
    useWorkspace.setState({ ws: { ...emptyWorkspace(now), profile: { persona: 'bootstrapped' } } });
    render(<Wizard />);
    await userEvent.setup().click(await screen.findByRole('button', { name: /See results/ }));
    expect(push).toHaveBeenCalledWith('/assess/results/');
    expect(consumeAssessmentFinished()).toBe(true);
  });

  it('does not mark it finished without answers (Results shows the empty state, with nothing to celebrate)', async () => {
    useWorkspace.setState({ ws: emptyWorkspace(now) });
    render(<Wizard />);
    await userEvent.setup().click(await screen.findByRole('button', { name: /See results/ }));
    expect(push).toHaveBeenCalledWith('/assess/results/');
    expect(consumeAssessmentFinished()).toBe(false);
  });
});
