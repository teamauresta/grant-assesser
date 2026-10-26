import { describe, it, expect } from 'vitest';
import { deriveStatus, resolveDeadlines } from '@/lib/status';
import { makeProgram } from '../helpers/program';

const now = new Date('2026-10-27T00:00:00Z'); // 11:00 AEDT, 27 Oct 2026
const close = (date: string, time?: string) => [{ label: 'Applications close', kind: 'close' as const, date, ...(time ? { time } : {}) }];

describe('deriveStatus', () => {
  it('open with a distant close stays open', () => {
    expect(deriveStatus(makeProgram({ deadlines: close('2026-11-15') }), now).state).toBe('open');
  });
  it('flips to closing-soon within 14 days', () => {
    const s = deriveStatus(makeProgram({ deadlines: close('2026-11-01') }), now);
    expect(s.state).toBe('closing-soon'); expect(s.daysToClose).toBe(5);
  });
  it('flips to closed after the last close date', () => {
    expect(deriveStatus(makeProgram({ deadlines: close('2026-10-20') }), now).state).toBe('closed');
  });
  it('closes at the deadline time, not midnight', () => {
    const p = makeProgram({ deadlines: close('2026-10-27', '10:00') }); // 10:00 AEDT already passed at 11:00
    expect(deriveStatus(p, now).state).toBe('closed');
  });
  it('does not auto-close unverified programs', () => {
    expect(deriveStatus(makeProgram({ status: { state: 'unverified' }, deadlines: close('2026-10-20') }), now).state).toBe('unverified');
  });
  it('flags stale verification after 60 days', () => {
    const p = makeProgram({ verification: { lastVerified: '2026-08-01', sources: [{ url: 'https://example.gov.au', title: 't', official: true }] } });
    expect(deriveStatus(p, now).stale).toBe(true);
    expect(deriveStatus(makeProgram(), now).stale).toBe(false);
  });
});

describe('resolveDeadlines', () => {
  const rdti = makeProgram({ status: { state: 'rolling' }, deadlines: [{ label: 'Registration due', kind: 'milestone', relative: 'fyEnd+10m' }] });
  it('June year-end → 30 April next year', () => {
    expect(resolveDeadlines(rdti, now, { fyEndMonth: 6 })[0].date).toBe('2027-04-30');
  });
  it('defaults to June and rolls forward once passed', () => {
    expect(resolveDeadlines(rdti, new Date('2027-05-15T00:00:00Z'), {})[0].date).toBe('2028-04-30');
  });
  it('December year-end', () => {
    expect(resolveDeadlines(rdti, now, { fyEndMonth: 12 })[0].date).toBe('2026-10-31');
  });
  it('milestones never close the program', () => {
    expect(deriveStatus(rdti, now).state).toBe('rolling');
  });
});
