// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const confetti = vi.fn();
vi.mock('canvas-confetti', () => ({ default: confetti }));

import { cheer, consumeAssessmentFinished, markAssessmentFinished, resetCelebrations, resultsCheer, stageCheer } from '@/lib/celebrate';
import { useToasts } from '@/lib/toast';
import { useWorkspace } from '@/lib/store/use-workspace';
import { emptyWorkspace } from '@/lib/store/workspace-store';

const reduced = (on: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && q === '(prefers-reduced-motion: reduce)' }));

beforeEach(() => {
  confetti.mockClear();
  resetCelebrations();
  useToasts.setState({ toasts: [] });
  useWorkspace.setState({ ws: emptyWorkspace(new Date('2026-10-27T00:00:00Z')) });
  reduced(false);
});

describe('cheer', () => {
  it('toasts and bursts once per key', async () => {
    await cheer('a1:submitted', { message: 'Submitted.', burst: 'submitted' });
    await cheer('a1:submitted', { message: 'Submitted.', burst: 'submitted' });
    expect(useToasts.getState().toasts).toHaveLength(1);
    expect(confetti).toHaveBeenCalledTimes(1);
  });

  it('fires two side bursts for an award, in the Liftoff colours', async () => {
    await cheer('a1:awarded', { message: 'Awarded.', burst: 'awarded' });
    expect(confetti).toHaveBeenCalledTimes(2);
    expect(confetti.mock.calls[0][0].colors).toHaveLength(6);
    expect(confetti.mock.calls[0][0].disableForReducedMotion).toBe(true);
  });

  it('still shows the message but no confetti when Celebrations is off or motion is reduced', async () => {
    useWorkspace.setState((s) => ({ ws: { ...s.ws, settings: { ...s.ws.settings, celebrations: false } } }));
    await cheer('k1', { message: 'One', burst: 'submitted' });
    useWorkspace.setState((s) => ({ ws: { ...s.ws, settings: { ...s.ws.settings, celebrations: true } } }));
    reduced(true);
    await cheer('k2', { message: 'Two', burst: 'submitted' });
    expect(useToasts.getState().toasts.map((t) => t.message)).toEqual(['One', 'Two']);
    expect(confetti).not.toHaveBeenCalled();
  });

  it('can toast without a burst (e.g. Declined)', async () => {
    await cheer('a1:declined', { message: 'Most funded startups applied more than once.' });
    expect(confetti).not.toHaveBeenCalled();
    expect(useToasts.getState().toasts).toHaveLength(1);
  });
});

describe('assessment finished flag', () => {
  it('is consumed once', () => {
    expect(consumeAssessmentFinished()).toBe(false);
    markAssessmentFinished();
    expect(consumeAssessmentFinished()).toBe(true);
    expect(consumeAssessmentFinished()).toBe(false);
  });
});

describe('stageCheer', () => {
  it('has nothing to say for moves that are not milestones', () => {
    expect(stageCheer('withdrawn')).toBeNull();
    expect(stageCheer('preparing')).toBeNull();
  });

  it('bursts for Submitted and Awarded, and points Awarded at the calendar', () => {
    expect(stageCheer('submitted')).toMatchObject({ burst: 'submitted' });
    expect(stageCheer('awarded')).toMatchObject({ burst: 'awarded', action: { label: 'Open calendar', href: '/plan/?tab=calendar' } });
  });

  it('is supportive for Declined, with no burst', () => {
    const declined = stageCheer('declined');
    expect(declined?.burst).toBeUndefined();
    expect(declined?.message).toMatch(/applied more than once/);
    expect(declined?.action?.href).toBe('/assess/results/');
  });
});

describe('resultsCheer', () => {
  it('counts what can be acted on now, in the singular for one', () => {
    expect(resultsCheer(1, 0)).toBe('1 program you can act on now. Start with the one closing first.');
    expect(resultsCheer(4, 2)).toBe('4 programs you can act on now. Start with the one closing first.');
  });

  it('falls back to what is worth preparing for, then to the next round', () => {
    expect(resultsCheer(0, 2)).toBe('2 programs are worth preparing for. Your plan starts here.');
    expect(resultsCheer(0, 1)).toBe('1 program is worth preparing for. Your plan starts here.');
    expect(resultsCheer(0, 0)).toBe('Nothing is open for you today. Watch the programs below for their next round.');
  });
});
