// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PERSONA_NOW as now, bootstrappedVic } from '@/tests/fixtures/personas';

const { confetti, create } = vi.hoisted(() => {
  const confetti = vi.fn();
  return { confetti, create: vi.fn(() => confetti) };
});
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { create }) }));
vi.mock('@/lib/use-now', () => ({ useNow: () => new Date('2026-10-27T00:00:00Z') }));
// No real profile puts nothing in Act now and Prepare, so move every program to Watch.
vi.mock('@/lib/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/assess')>();
  return {
    ...actual,
    assessAll: (...args: Parameters<typeof actual.assessAll>) =>
      actual.assessAll(...args).map((a) => (a.group === 'act-now' || a.group === 'prepare' ? { ...a, group: 'watch' as const } : a)),
  };
});

import { Results } from '@/components/results/results';
import { Toaster } from '@/components/ui/toast';
import { markAssessmentFinished, resultsCheer } from '@/lib/celebrate';
import { useToasts } from '@/lib/toast';
import { useWorkspace } from '@/lib/store/use-workspace';
import { emptyWorkspace } from '@/lib/store/workspace-store';

beforeAll(async () => { await useWorkspace.getState().init(); });

describe('Results finish-line cheer with nothing to act on or prepare for', () => {
  it('shows the message but fires no confetti', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    useWorkspace.setState({ ws: { ...emptyWorkspace(now), profile: bootstrappedVic } });
    markAssessmentFinished('2026-10-27T01:00:00.000Z');
    render(<><Results /><Toaster /></>);
    expect(await screen.findByText(resultsCheer(0, 0))).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(useToasts.getState().toasts).toHaveLength(1);
    expect(create).not.toHaveBeenCalled();
    expect(confetti).not.toHaveBeenCalled();
  });
});
