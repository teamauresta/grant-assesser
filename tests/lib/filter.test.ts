import { describe, it, expect } from 'vitest';
import { closingSoon, filterPrograms, parseFilters, serializeFilters, DEFAULT_FILTERS } from '@/lib/programs/filter';
import { deriveStatus, type StatusInfo } from '@/lib/status';
import { makeProgram } from '../helpers/program';
import type { Program } from '@/lib/schema';

const now = new Date('2026-10-27T00:00:00Z'); // 11:00 on 27 Oct in Melbourne

const close = (date: string) => [{ label: 'Applications close', kind: 'close' as const, date }];

const programs: Program[] = [
  makeProgram({ slug: 'zeta', name: 'Zeta Grant', status: { state: 'open' } }),
  makeProgram({ slug: 'alpha', name: 'Alpha Grant', status: { state: 'rolling' } }),
  makeProgram({ slug: 'soon-b', name: 'Bravo', status: { state: 'open' }, deadlines: close('2026-11-05') }),
  makeProgram({ slug: 'soon-a', name: 'Charlie', status: { state: 'open' }, deadlines: close('2026-10-30') }),
  makeProgram({ slug: 'later', name: 'Later', status: { state: 'upcoming' }, type: 'credits', level: 'industry' }),
  makeProgram({ slug: 'unv', name: 'Maybe', provider: 'Acme Labs', status: { state: 'unverified' } }),
  makeProgram({ slug: 'paused', name: 'Paused Fund', status: { state: 'paused' }, level: 'vic' }),
  makeProgram({ slug: 'closed', name: 'Closed Fund', status: { state: 'closed' }, type: 'accelerator' }),
  makeProgram({ slug: 'past', name: 'Expired', status: { state: 'open' }, deadlines: close('2026-10-01') }),
  makeProgram({ slug: 'search', name: 'Searchable', content: { summary: 'Helps with QUANTUM sensors', howToApply: [], prepare: [], mistakes: [] } }),
];
const statuses = new Map<string, StatusInfo>(programs.map((p) => [p.slug, deriveStatus(p, now)]));
const slugs = (ps: Program[]) => ps.map((p) => p.slug);

describe('filterPrograms', () => {
  it('defaults to open and upcoming, sorted closing-soon first, then open/rolling, then the rest', () => {
    expect(slugs(filterPrograms(programs, statuses, {}))).toEqual([
      'soon-a', 'soon-b', // closing soon, by days left
      'alpha', 'search', 'zeta', // open/rolling, alphabetical by name
      'later', 'unv', // the rest, alphabetical by name
    ]);
  });

  it('uses derived statuses: a past close makes an open program closed', () => {
    expect(slugs(filterPrograms(programs, statuses, {}))).not.toContain('past');
    expect(slugs(filterPrograms(programs, statuses, { status: 'closed' }))).toEqual(['closed', 'past']);
  });

  it('falls back to the declared state when a status is missing (before mount)', () => {
    const out = filterPrograms(programs, new Map(), {});
    expect(slugs(out)).toContain('past');
    expect(slugs(out)).not.toContain('paused');
  });

  it('shows everything with status "all"', () => {
    expect(filterPrograms(programs, statuses, { status: 'all' })).toHaveLength(programs.length);
  });

  it('filters to one derived state', () => {
    expect(slugs(filterPrograms(programs, statuses, { status: 'closing-soon' }))).toEqual(['soon-a', 'soon-b']);
    expect(slugs(filterPrograms(programs, statuses, { status: 'paused' }))).toEqual(['paused']);
  });

  it('searches name, provider and summary case-insensitively', () => {
    expect(slugs(filterPrograms(programs, statuses, { q: 'quantum' }))).toEqual(['search']);
    expect(slugs(filterPrograms(programs, statuses, { q: 'acme' }))).toEqual(['unv']);
    expect(slugs(filterPrograms(programs, statuses, { q: '  CHARLIE ' }))).toEqual(['soon-a']);
  });

  it('filters by type and level (any of the selected values)', () => {
    expect(slugs(filterPrograms(programs, statuses, { status: 'all', type: ['credits', 'accelerator'] }))).toEqual(['closed', 'later']);
    expect(slugs(filterPrograms(programs, statuses, { status: 'all', level: ['vic'] }))).toEqual(['paused']);
    expect(filterPrograms(programs, statuses, { status: 'all', type: [] })).toHaveLength(programs.length);
  });
});

describe('closingSoon', () => {
  it('lists future close deadlines within N days, soonest first', () => {
    const out = closingSoon(programs, now, 30);
    expect(out.map((c) => c.program.slug)).toEqual(['soon-a', 'soon-b']);
    expect(out[0]).toMatchObject({ daysLeft: 3, deadline: { date: '2026-10-30' } });
  });
  it('respects the window', () => {
    expect(closingSoon(programs, now, 5).map((c) => c.program.slug)).toEqual(['soon-a']);
  });
  it('ignores milestones, past closes and paused or closed programs', () => {
    const extra = [
      makeProgram({ slug: 'm', deadlines: [{ label: 'Info session', kind: 'milestone', date: '2026-10-29' }] }),
      makeProgram({ slug: 'p', status: { state: 'paused' }, deadlines: close('2026-10-29') }),
    ];
    expect(closingSoon([...programs, ...extra], now).map((c) => c.program.slug)).toEqual(['soon-a', 'soon-b']);
  });
});

describe('URL filters', () => {
  it('round-trips through query params and omits defaults', () => {
    const f = { q: 'ai', status: 'all' as const, type: ['credits' as const, 'grant' as const], level: ['vic' as const] };
    const qs = serializeFilters(f);
    expect(qs).toBe('q=ai&status=all&type=credits%2Cgrant&level=vic');
    expect(parseFilters(new URLSearchParams(qs))).toEqual(f);
    expect(serializeFilters(DEFAULT_FILTERS)).toBe('');
  });
  it('drops unknown values instead of failing', () => {
    expect(parseFilters(new URLSearchParams('status=bogus&type=credits,nope&level=mars'))).toEqual({
      q: '', status: 'open-upcoming', type: ['credits'], level: [],
    });
  });
});
