// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// `confetti` is the fire function that confetti.create(canvas) returns.
const { confetti, create } = vi.hoisted(() => {
  const confetti = vi.fn();
  return { confetti, create: vi.fn(() => confetti) };
});
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { create }) }));

import { CONFETTI_COLOURS, cheer, consumeAssessmentFinish, consumeAssessmentFinished, markAssessmentFinished, resetCelebrations, resultsCelebration, resultsCheer, stageCheer } from '@/lib/celebrate';
import { useToasts } from '@/lib/toast';
import { useWorkspace } from '@/lib/store/use-workspace';
import { emptyWorkspace } from '@/lib/store/workspace-store';

const reduced = (on: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && q === '(prefers-reduced-motion: reduce)' }));

beforeEach(() => {
  confetti.mockClear();
  create.mockClear();
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

  // Amber, sage and sky (Billabong design doc section 8): every burst in CONFETTI_COLOURS, which
  // tests/lib/tokens.test.ts keeps equal to the highlight tones. (It was six brand colours.)
  it('fires two side bursts for an award, in amber, sage and sky', async () => {
    await cheer('a1:awarded', { message: 'Awarded.', burst: 'awarded' });
    expect(confetti).toHaveBeenCalledTimes(2);
    for (const [options] of confetti.mock.calls) expect(options.colors).toEqual(CONFETTI_COLOURS);
    expect(CONFETTI_COLOURS).toEqual(['#f2a93b', '#9cc5a1', '#7fb3d5']);
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

  it('draws on one decorative canvas that never takes clicks, created once', async () => {
    await cheer('c1', { message: 'One', burst: 'submitted' });
    await cheer('c2', { message: 'Two', burst: 'awarded' });
    const canvases = document.querySelectorAll('canvas');
    expect(canvases).toHaveLength(1);
    const canvas = canvases[0];
    expect(canvas.parentElement).toBe(document.body);
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas.style.position).toBe('fixed');
    expect(canvas.style.pointerEvents).toBe('none');
    expect(canvas.style.zIndex).toBe('60');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(canvas, { resize: true, disableForReducedMotion: true });
    expect(confetti).toHaveBeenCalledTimes(3);
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

  it('carries the stamp of the finish, so each new assessment has its own cheer key', () => {
    expect(consumeAssessmentFinish()).toBeNull();
    markAssessmentFinished('2026-10-27T01:00:00.000Z');
    expect(consumeAssessmentFinish()).toBe('2026-10-27T01:00:00.000Z');
    expect(consumeAssessmentFinish()).toBeNull();
  });
});

describe('resultsCelebration', () => {
  it('bursts when there is something to act on or prepare for', () => {
    expect(resultsCelebration(2, 0)).toEqual({ message: resultsCheer(2, 0), burst: 'results' });
    expect(resultsCelebration(0, 3)).toEqual({ message: resultsCheer(0, 3), burst: 'results' });
  });

  it('does not burst when nothing fits today: the message is not good news', () => {
    expect(resultsCelebration(0, 0)).toEqual({ message: resultsCheer(0, 0) });
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

describe('when the confetti code cannot load', () => {
  it('keeps the toast and does not throw', async () => {
    vi.resetModules();
    vi.doMock('canvas-confetti', () => { throw new Error('Failed to fetch dynamically imported module'); });
    const fresh = await import('@/lib/celebrate');
    const { useToasts: freshToasts } = await import('@/lib/toast');
    await expect(fresh.cheer('offline', { message: 'Submitted.', burst: 'submitted' })).resolves.toBeUndefined();
    expect(freshToasts.getState().toasts.map((t) => t.message)).toEqual(['Submitted.']);
    vi.doUnmock('canvas-confetti');
  });
});
