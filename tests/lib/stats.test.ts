import { describe, it, expect } from 'vitest';
import { latestVerified, programStats } from '@/lib/programs/stats';
import { makeProgram } from '@/tests/helpers/program';

const now = new Date('2026-10-27T00:00:00Z');
const sources = [{ url: 'https://example.gov.au', title: 't', official: true }];

describe('programStats', () => {
  it('counts every program, those open now (including closing soon and rolling) and those closing within 30 days', () => {
    const programs = [
      makeProgram({ slug: 'a', status: { state: 'open' }, deadlines: [{ label: 'Close', kind: 'close', date: '2026-11-05' }] }),
      makeProgram({ slug: 'b', status: { state: 'rolling' }, deadlines: [] }),
      makeProgram({ slug: 'c', status: { state: 'open' }, deadlines: [{ label: 'Close', kind: 'close', date: '2027-03-01' }] }),
      makeProgram({ slug: 'd', status: { state: 'paused' }, deadlines: [] }),
      makeProgram({ slug: 'e', status: { state: 'open' }, deadlines: [{ label: 'Close', kind: 'close', date: '2026-10-01' }] }),
    ];
    expect(programStats(programs, now)).toEqual({ total: 5, openNow: 3, closingSoon: 1 });
  });
});

describe('latestVerified', () => {
  it('is the newest lastVerified date', () => {
    const programs = [
      makeProgram({ slug: 'a', verification: { lastVerified: '2026-10-20', sources } }),
      makeProgram({ slug: 'b', verification: { lastVerified: '2026-10-26', sources } }),
    ];
    expect(latestVerified(programs)).toBe('2026-10-26');
  });
});
