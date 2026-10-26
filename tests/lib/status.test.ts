import { describe, it, expect } from 'vitest';
import { deriveStatus, hasPastCloseOnly, resolveDeadlines, statusLabel } from '@/lib/status';
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

describe('daysToClose uses the deadline\'s Melbourne calendar date', () => {
  const la = (date: string) => [{ label: 'Close', kind: 'close' as const, date, time: '17:00', tz: 'America/Los_Angeles' }];
  it('a 17:00 LA close lands on the next Melbourne day', () => {
    // 2026-11-09 17:00 PST = 2026-11-10 12:00 AEDT → 14 days from 27 Oct
    const s = deriveStatus(makeProgram({ deadlines: la('2026-11-09') }), now);
    expect(s.daysToClose).toBe(14); expect(s.state).toBe('closing-soon');
  });
  it('one day later is outside the closing-soon window', () => {
    const s = deriveStatus(makeProgram({ deadlines: la('2026-11-10') }), now);
    expect(s.daysToClose).toBe(15); expect(s.state).toBe('open');
  });
});

describe('hasPastCloseOnly', () => {
  it('true when every close deadline has passed, whatever the declared state', () => {
    expect(hasPastCloseOnly(makeProgram({ deadlines: close('2026-10-20') }), now)).toBe(true);
    expect(hasPastCloseOnly(makeProgram({ status: { state: 'upcoming' }, deadlines: close('2026-09-01') }), now)).toBe(true);
    expect(hasPastCloseOnly(makeProgram({ status: { state: 'unverified' }, deadlines: close('2026-10-27', '10:00') }), now)).toBe(true);
  });
  it('false when a close is still in the future', () => {
    expect(hasPastCloseOnly(makeProgram({ deadlines: [...close('2026-09-01'), ...close('2026-11-15')] }), now)).toBe(false);
  });
  it('false without any close deadline (milestones do not count)', () => {
    expect(hasPastCloseOnly(makeProgram(), now)).toBe(false);
    expect(hasPastCloseOnly(makeProgram({ deadlines: [{ label: 'Info session', kind: 'milestone', date: '2026-09-01' }] }), now)).toBe(false);
  });
  it('upcoming/paused/unverified with a past close are not auto-closed', () => {
    for (const state of ['upcoming', 'paused', 'unverified'] as const)
      expect(deriveStatus(makeProgram({ status: { state }, deadlines: close('2026-09-01') }), now).state).toBe(state);
  });
});

describe('statusLabel', () => {
  it('lives in lib so reports can word statuses without importing a component', () => {
    expect(statusLabel('open')).toBe('Open');
    expect(statusLabel('closing-soon')).toBe('Closing soon');
    expect(statusLabel('closing-soon', 0)).toBe('Closes today');
    expect(statusLabel('closing-soon', 1)).toBe('Closes tomorrow');
    expect(statusLabel('closing-soon', 5)).toBe('Closes in 5 days');
  });
});
