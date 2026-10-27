// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { PERSONA_NOW as now, bootstrappedVic } from '@/tests/fixtures/personas';

// `confetti` is the fire function that confetti.create(canvas) returns.
const { confetti, create } = vi.hoisted(() => {
  const confetti = vi.fn();
  return { confetti, create: vi.fn(() => confetti) };
});
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { create }) }));
vi.mock('@/lib/use-now', () => ({ useNow: () => new Date('2026-10-27T00:00:00Z') }));

import { Results } from '@/components/results/results';
import { Toaster } from '@/components/ui/toast';
import { PROGRAMS } from '@/content/programs';
import { assessAll } from '@/lib/assess';
import { markAssessmentFinished, resetCelebrations, resultsCheer } from '@/lib/celebrate';
import { useToasts } from '@/lib/toast';
import { useWorkspace } from '@/lib/store/use-workspace';
import { emptyWorkspace } from '@/lib/store/workspace-store';

const assessments = assessAll(PROGRAMS, bootstrappedVic, now);
const expected = resultsCheer(
  assessments.filter((a) => a.group === 'act-now').length,
  assessments.filter((a) => a.group === 'prepare').length,
);

const toastRegion = () => screen.getAllByRole('status').find((el) => el.getAttribute('aria-live') === 'polite')!;

beforeAll(async () => { await useWorkspace.getState().init(); });
beforeEach(() => {
  confetti.mockClear();
  create.mockClear();
  resetCelebrations();
  useToasts.setState({ toasts: [] });
  useWorkspace.setState({ ws: { ...emptyWorkspace(now), profile: bootstrappedVic } });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

describe('Results finish-line cheer', () => {
  it('cheers once, with a burst, right after the assessment', async () => {
    markAssessmentFinished();
    render(<><Results /><Toaster /></>);
    expect(await screen.findByText(expected)).toBeInTheDocument();
    await waitFor(() => expect(confetti).toHaveBeenCalledTimes(1));
    expect(useToasts.getState().toasts).toHaveLength(1);
    expect(toastRegion()).toHaveTextContent(expected);
  });

  it('stays quiet when Results opens without finishing the assessment', async () => {
    render(<><Results /><Toaster /></>);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(useToasts.getState().toasts).toHaveLength(0);
    expect(confetti).not.toHaveBeenCalled();
  });

  it('drops a finish flag left by the empty state, so a later visit does not cheer', async () => {
    // The wizard was left without answers: Results shows "Take the assessment first".
    useWorkspace.setState({ ws: emptyWorkspace(now) });
    markAssessmentFinished();
    render(<><Results /><Toaster /></>);
    expect(await screen.findByText('Take the assessment first')).toBeInTheDocument();
    // Answers arrive later (e.g. a persona picked, then the browser's Back button) without finishing.
    act(() => { useWorkspace.setState({ ws: { ...emptyWorkspace(now), profile: bootstrappedVic } }); });
    expect(await screen.findByText('Edit your answers')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(useToasts.getState().toasts).toHaveLength(0);
    expect(confetti).not.toHaveBeenCalled();
  });
});
