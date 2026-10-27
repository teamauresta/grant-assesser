// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionProvider, useMotionFeaturesLoaded, useMotionReady } from '@/components/motion/motion-provider';
import { Directory } from '@/components/programs/directory';
import { ReportPreview } from '@/components/report/report-preview';
import { PROGRAMS } from '@/content/programs';
import { buildReportData, REPORT_SECTIONS, type ReportSections } from '@/lib/pdf/report-data';
import { emptyWorkspace } from '@/lib/store/workspace-store';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

// Motion reads "(prefers-reduced-motion)" once and listens for changes; this file runs reduced throughout.
beforeAll(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('prefers-reduced-motion'), addEventListener: () => {}, removeEventListener: () => {} }));
});

function Probe() {
  return <p data-testid="probe">{`${useMotionFeaturesLoaded()} ${useMotionReady()}`}</p>;
}

// Hidden or part-way through a fade: anything short of fully opaque.
const hidden = (els: HTMLElement[]) => els.filter((el) => el.style.opacity !== '' && Number(el.style.opacity) < 1);

describe('with reduced motion', () => {
  it('directory cards and report sections never start hidden, even with features loaded', async () => {
    const now = new Date('2026-10-27T00:00:00Z');
    const sections = (cover: boolean) => ({ ...Object.fromEntries(REPORT_SECTIONS.map((s) => [s, false])), cover }) as ReportSections;
    const data = (cover: boolean) => buildReportData(emptyWorkspace(now), PROGRAMS, now, sections(cover));
    const ui = (cover: boolean) => <MotionProvider><Probe /><Directory /><ReportPreview data={data(cover)} /></MotionProvider>;
    const { rerender } = render(ui(false));
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('true false'));

    // Narrow the list with a search, then clear it: the cards that come back mount anew.
    const user = userEvent.setup();
    const search = screen.getByRole('searchbox', { name: 'Search programs' });
    await user.type(search, 'csiro');
    await user.clear(search);
    const cards = screen.getAllByRole('listitem').filter((li) => li.querySelector('article'));
    expect(cards).toHaveLength(27);
    expect(hidden(cards)).toEqual([]);

    rerender(ui(true));
    expect(hidden([screen.getByText('Funding report').closest('header')!.parentElement!])).toEqual([]);
  });
});
