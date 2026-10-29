// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Directory } from '@/components/programs/directory';
import { ReportPreview } from '@/components/report/report-preview';
import { PROGRAMS } from '@/content/programs';
import { buildReportData, REPORT_SECTIONS, type ReportSections } from '@/lib/pdf/report-data';
import { emptyWorkspace } from '@/lib/store/workspace-store';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

// No MotionProvider here, so motion's features never load: the state of a page whose features chunk
// is slow or fails. An m.* element cannot animate then, so it must never start hidden.
// Hidden or part-way through a fade: anything short of fully opaque.
const hidden = (els: HTMLElement[]) => els.filter((el) => el.style.opacity !== '' && Number(el.style.opacity) < 1);

describe('before motion features load', () => {
  // A fixed day, so a program closing never changes how many cards the directory lists.
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-27T00:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('directory cards that appear after a filter change are visible', async () => {
    render(<Directory />);
    // Narrow the list with a search, then clear it: the cards that come back mount anew.
    const user = userEvent.setup();
    const search = screen.getByRole('searchbox', { name: 'Search programs' });
    await user.type(search, 'csiro');
    await user.clear(search);
    const cards = screen.getAllByRole('listitem').filter((li) => li.querySelector('article'));
    expect(cards).toHaveLength(27);
    expect(hidden(cards)).toEqual([]);
  });

  it('a report section switched on is visible', () => {
    const now = new Date('2026-10-27T00:00:00Z');
    const sections = (cover: boolean) => ({ ...Object.fromEntries(REPORT_SECTIONS.map((s) => [s, false])), cover }) as ReportSections;
    const data = (cover: boolean) => buildReportData(emptyWorkspace(now), PROGRAMS, now, sections(cover));
    const { rerender } = render(<ReportPreview data={data(false)} />);
    rerender(<ReportPreview data={data(true)} />);
    const cover = screen.getByText('Funding report').closest('header')!.parentElement!;
    expect(hidden([cover])).toEqual([]);
  });
});
