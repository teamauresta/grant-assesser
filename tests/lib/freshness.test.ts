import { describe, expect, it } from 'vitest';
import { makeProgram } from '@/tests/helpers/program';
import { zonedToInstant } from '@/lib/dates';
import { classifyStatus, freshnessReport, type LinkResult } from '@/scripts/check-freshness';

const NOW = zonedToInstant('2026-10-27', '09:00', 'Australia/Melbourne');
const src = (url: string) => ({ url, title: 'Official page', official: true });

describe('classifyStatus', () => {
  it('treats 2xx and 3xx as ok', () => {
    expect(classifyStatus(200)).toBe('ok');
    expect(classifyStatus(204)).toBe('ok');
    expect(classifyStatus(301)).toBe('ok');
    expect(classifyStatus(399)).toBe('ok');
  });

  it('treats 401, 403 and 429 as blocked, not broken', () => {
    expect(classifyStatus(401)).toBe('blocked');
    expect(classifyStatus(403)).toBe('blocked');
    expect(classifyStatus(429)).toBe('blocked');
  });

  it('treats 404, 410, other 4xx, 5xx and network errors as broken', () => {
    expect(classifyStatus(404)).toBe('broken');
    expect(classifyStatus(410)).toBe('broken');
    expect(classifyStatus(400)).toBe('broken');
    expect(classifyStatus(500)).toBe('broken');
    expect(classifyStatus(503)).toBe('broken');
    expect(classifyStatus('error')).toBe('broken');
  });
});

describe('freshnessReport', () => {
  it('flags programs verified more than STALE_DAYS (60) ago', () => {
    const programs = [
      makeProgram({ slug: 'old', name: 'Old', verification: { lastVerified: '2026-08-27', sources: [src('https://a.gov.au')] } }),
      makeProgram({ slug: 'edge', name: 'Edge', verification: { lastVerified: '2026-08-28', sources: [src('https://b.gov.au')] } }),
    ];
    const r = freshnessReport(programs, NOW, []);
    expect(r.stale.map((x) => x.slug)).toEqual(['old']);
    expect(r.stale[0].detail).toContain('61 days');
  });

  it('flags a future close within 30 days and ignores later or past closes', () => {
    const programs = [
      makeProgram({ slug: 'soon', deadlines: [{ label: 'Round closes', kind: 'close', date: '2026-11-20' }] }),
      makeProgram({ slug: 'later', deadlines: [{ label: 'Round closes', kind: 'close', date: '2026-12-20' }] }),
      makeProgram({ slug: 'milestone', deadlines: [{ label: 'Info session', kind: 'milestone', date: '2026-11-01' }] }),
      makeProgram({ slug: 'gone', deadlines: [{ label: 'Round closes', kind: 'close', date: '2026-10-01' }] }),
    ];
    const r = freshnessReport(programs, NOW, []);
    expect(r.closingSoon.map((x) => x.slug)).toEqual(['soon']);
    expect(r.closingSoon[0].detail).toContain('2026-11-20');
    expect(r.closingSoon[0].detail).toContain('24 days');
  });

  it('shows the declared time and a non-Melbourne zone for a closing-soon deadline', () => {
    const p = makeProgram({ deadlines: [{ label: 'Batch closes', kind: 'close', date: '2026-10-31', time: '23:59', tz: 'Australia/Brisbane' }] });
    const [row] = freshnessReport([p], NOW, []).closingSoon;
    // 23:59 Brisbane is 00:59 on 1 Nov in Melbourne (AEDT), so it counts 5 days, as the site does.
    expect(row.detail).toBe('Batch closes: 2026-10-31 23:59 Australia/Brisbane (in 5 days)');
  });

  it('flags upcoming, paused or unverified programs whose closes are all past, but not auto-closing ones', () => {
    const past = [{ label: 'Round closes', kind: 'close' as const, date: '2026-09-30' }];
    const programs = [
      makeProgram({ slug: 'up', status: { state: 'upcoming' }, deadlines: past }),
      makeProgram({ slug: 'paused', status: { state: 'paused' }, deadlines: past }),
      makeProgram({ slug: 'unv', status: { state: 'unverified' }, deadlines: past }),
      makeProgram({ slug: 'open', status: { state: 'open' }, deadlines: past }),
      makeProgram({ slug: 'closed', status: { state: 'closed' }, deadlines: past }),
      makeProgram({ slug: 'none', status: { state: 'upcoming' }, deadlines: [] }),
    ];
    const r = freshnessReport(programs, NOW, []);
    expect(r.pastCloseNeedsDecision.map((x) => x.slug)).toEqual(['up', 'paused', 'unv']);
    expect(r.pastCloseNeedsDecision[0].detail).toContain('upcoming');
  });

  it('splits link results into broken and blocked, per program source', () => {
    const programs = [
      makeProgram({ slug: 'a', name: 'Alpha', verification: { lastVerified: '2026-10-26', sources: [src('https://ok.gov.au'), src('https://gone.gov.au')] } }),
      makeProgram({ slug: 'b', name: 'Beta', verification: { lastVerified: '2026-10-26', sources: [src('https://wall.example.com'), src('https://gone.gov.au')] } }),
    ];
    const links: LinkResult[] = [
      { url: 'https://ok.gov.au', status: 200, outcome: 'ok' },
      { url: 'https://gone.gov.au', status: 404, outcome: 'broken' },
      { url: 'https://wall.example.com', status: 403, outcome: 'blocked' },
    ];
    const r = freshnessReport(programs, NOW, links);
    expect(r.brokenLinks.map((x) => [x.slug, x.link])).toEqual([['a', 'https://gone.gov.au'], ['b', 'https://gone.gov.au']]);
    expect(r.brokenLinks[0].detail).toContain('404');
    expect(r.blockedLinks.map((x) => [x.slug, x.link])).toEqual([['b', 'https://wall.example.com']]);
    expect(r.okLinks).toBe(1);
    expect(r.linksChecked).toBe(3);
  });

  it('renders a Markdown report with counted sections and tables', () => {
    const programs = [
      makeProgram({ slug: 'old', name: 'Old | pipe', verification: { lastVerified: '2026-01-01', sources: [src('https://a.gov.au')] } }),
    ];
    const r = freshnessReport(programs, NOW, [{ url: 'https://a.gov.au', status: 'error', outcome: 'broken', error: 'timeout' }]);
    expect(r.markdown).toContain('# Program data freshness');
    expect(r.markdown).toContain('2026-10-27');
    expect(r.markdown).toContain('## Stale (1)');
    expect(r.markdown).toContain('## Closing within 30 days (0)');
    expect(r.markdown).toContain('## Past close, needs a decision (0)');
    expect(r.markdown).toContain('## Broken links (1)');
    expect(r.markdown).toContain('## Blocked links, check manually (0)');
    expect(r.markdown).toContain('| Program | Slug | Detail | Link |');
    expect(r.markdown).toContain('Old \\| pipe');
    expect(r.markdown).toContain('timeout');
  });

  it('says links were not checked when there are no link results', () => {
    const r = freshnessReport([makeProgram()], NOW, []);
    expect(r.markdown).toMatch(/not checked/i);
  });
});
