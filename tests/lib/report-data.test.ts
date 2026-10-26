import { describe, it, expect } from 'vitest';
import { WorkspaceSchema, type Application, type Goal, type Profile, type Workspace } from '@/lib/schema';
import { PROGRAMS } from '@/content/programs';
import { deriveStatus } from '@/lib/status';
import {
  DEFAULT_SECTIONS, REPORT_SECTIONS, buildReportData, reportFilename, slugify, type ReportSections,
} from '@/lib/pdf/report-data';
import { makeProgram } from '../helpers/program';

// 11:00 on 27 Oct 2026 in Melbourne.
const now = new Date('2026-10-27T00:00:00Z');
const stamp = now.toISOString();

const goal = (id: string, over: Partial<Goal> = {}): Goal => ({
  id, title: `Goal ${id}`, dueDate: '2026-11-10', status: 'todo', steps: [], reminderOffsetsDays: [7, 1],
  source: 'user', sequence: 0, createdAt: stamp, updatedAt: stamp, ...over,
});
const app = (id: string, over: Partial<Application> = {}): Application =>
  ({ id, stage: 'considering', notes: '', createdAt: stamp, updatedAt: stamp, ...over });
const workspace = (over: Partial<Workspace> = {}): Workspace => WorkspaceSchema.parse({
  schemaVersion: 1, workspaceId: 'w', profile: {}, pipeline: [], goals: [], settings: {},
  changesSinceCalendarExport: 0, createdAt: stamp, updatedAt: stamp, ...over,
});

const vicBootstrapped: Profile = {
  persona: 'bootstrapped', companyName: 'Acme AI Pty Ltd', state: 'vic', hasAcn: true, gstRegistered: true,
  incorporatedOn: '2025-03-01', foreignSubsidiary: false, turnover: 'under-1m', rdSpend: '100k-500k',
  experimental: true, contemporaneousRecords: true, businessModel: 'product', hasMvp: true, hasWebsite: true, fundingStage: 'none',
  vcBacked: false, acceleratorMember: false,
};

const full = workspace({
  profile: vicBootstrapped,
  pipeline: [app('a1', { programSlug: 'rdti', stage: 'preparing', expectedAmount: 60_000 }), app('a2', { programSlug: 'csiro-kick-start', stage: 'declined' }), app('a3', { customName: 'Angel round' })],
  goals: [goal('g1', { applicationId: 'a1', title: 'Start an R&D log', dueDate: '2026-11-03' }), goal('g2', { title: 'Far away', dueDate: '2027-06-01' }), goal('g3', { applicationId: 'a1', status: 'done' })],
});

const only = (...on: (keyof ReportSections)[]): ReportSections =>
  Object.fromEntries(REPORT_SECTIONS.map((s) => [s, on.includes(s)])) as ReportSections;

describe('sections', () => {
  it('turns every section on by default except the sources appendix', () => {
    expect(REPORT_SECTIONS.filter((s) => !DEFAULT_SECTIONS[s])).toEqual(['sources']);
  });

  it('drops the data of every section that is switched off', () => {
    const all = buildReportData(full, PROGRAMS, now, only(...REPORT_SECTIONS));
    for (const s of REPORT_SECTIONS) expect(all[s], s).not.toBeNull();

    const none = buildReportData(full, PROGRAMS, now, only());
    for (const s of REPORT_SECTIONS) expect(none[s], s).toBeNull();

    const some = buildReportData(full, PROGRAMS, now, only('pipeline', 'gaps'));
    expect(some.pipeline).not.toBeNull();
    expect(some.gaps).not.toBeNull();
    expect(some.programs).toBeNull();
    expect(some.funding).toBeNull();
    expect(some.upcoming).toBeNull();
  });
});

describe('assessment report', () => {
  const data = buildReportData(full, PROGRAMS, now, only(...REPORT_SECTIONS));

  it('carries the company, persona and Melbourne date', () => {
    expect(data.mode).toBe('assessment');
    expect(data.generatedOn).toBe('2026-10-27');
    expect(data.cover).toMatchObject({ title: 'Acme AI Pty Ltd', persona: 'Bootstrapped', directoryOnly: false });
    expect(data.summary?.facts).toContainEqual({ label: 'Based in', value: 'Victoria' });
  });

  it('lists matched programs by group without the "not a fit" ones, each with a source', () => {
    expect(data.programs!.map((g) => g.id)).toEqual(['act-now', 'prepare', 'watch']);
    const rows = data.programs!.flatMap((g) => g.programs);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.source?.url).toMatch(/^https?:\/\//);
    expect(rows.find((r) => r.slug === 'rdti')).toMatchObject({ inPipeline: true, status: 'Rolling' });
  });

  it('labels the estimate as not secured and keeps credits separate', () => {
    expect(data.funding!.aud.high).toBeGreaterThan(0);
    expect(data.funding!.fundingPrograms).toContain('R&D Tax Incentive');
    expect(data.funding!.creditPrograms.every((n) => !data.funding!.fundingPrograms.includes(n))).toBe(true);
  });

  it('lists every application, labelling dropped ones', () => {
    expect(data.pipeline!.map((r) => [r.name, r.stage, r.dropped])).toEqual([
      ['R&D Tax Incentive', 'Preparing', false],
      ['CSIRO Kick-Start', 'Declined', true],
      ['Angel round', 'Considering', false],
    ]);
    expect(data.pipeline![0]).toMatchObject({ expected: '$60K', goals: '1 of 2 goals done' });
  });

  it('includes goals and deadlines in the next 90 days only', () => {
    const titles = data.upcoming!.map((u) => u.title);
    expect(titles).toContain('Start an R&D log');
    expect(titles).not.toContain('Far away');
    expect(data.upcoming!.every((u) => u.date <= '2027-01-25')).toBe(true);
  });

  it('notes stacking only for programs still being pursued', () => {
    expect(data.stacking!.length).toBeGreaterThan(0);
    expect(data.stacking!.every((s) => s.program === 'R&D Tax Incentive')).toBe(true);
  });
});

describe('readiness gaps', () => {
  it('collects unknown and fixable required checks once each, naming every program that needs them', () => {
    // GST and ACN unanswered: many open programs require them.
    const { hasAcn: _a, gstRegistered: _g, ...rest } = vicBootstrapped;
    void _a; void _g;
    const data = buildReportData(workspace({ profile: rest }), PROGRAMS, now, DEFAULT_SECTIONS);
    const gaps = data.gaps!;
    const keys = gaps.map((g) => `${g.gateId}|${g.label}`);
    expect(new Set(keys).size).toBe(keys.length);
    const acn = gaps.find((g) => g.gateId === 'au-entity')!;
    expect(acn.outcome).toBe('unknown');
    expect(acn.programs.length).toBeGreaterThan(1);
    expect(new Set(acn.programs).size).toBe(acn.programs.length);
    expect(acn.fix).toBeTruthy();
  });

  it('ignores soft checks, unfixable failures and programs outside act-now and prepare', () => {
    const programs = [
      makeProgram({ slug: 'p1', name: 'P1', gates: ['gst-registered', { id: 'has-website', severity: 'soft' }] }),
      makeProgram({ slug: 'p2', name: 'P2', gates: ['gst-registered'] }),
      makeProgram({ slug: 'p3', name: 'P3', status: { state: 'upcoming' }, gates: ['women-led'] }),
      makeProgram({ slug: 'p4', name: 'P4', gates: [{ id: 'state-is', state: 'nsw' }] }),
    ];
    // A partial assessment: three answers (hasAnswers' minimum), none of them about these programs' gates.
    const data = buildReportData(workspace({ profile: { state: 'vic', turnover: 'under-1m', fyEndMonth: 6 } }), programs, now, DEFAULT_SECTIONS);
    expect(data.gaps!.map((g) => [g.gateId, [...g.programs].sort()])).toEqual([['gst-registered', ['P1', 'P2']]]);
  });
});

describe('oldestVerified', () => {
  it('is the earliest lastVerified among the programs the report includes', () => {
    const programs = [
      makeProgram({ slug: 'new', name: 'New', verification: { lastVerified: '2026-10-20', sources: [{ url: 'https://a.gov.au', title: 'a', official: true }] } }),
      makeProgram({ slug: 'old', name: 'Old', verification: { lastVerified: '2026-09-01', sources: [{ url: 'https://b.gov.au', title: 'b', official: true }] } }),
      // Closed, so never listed: its older date must not count.
      makeProgram({ slug: 'closed', name: 'Closed', status: { state: 'closed' }, verification: { lastVerified: '2025-01-01', sources: [{ url: 'https://c.gov.au', title: 'c', official: true }] } }),
    ];
    const ws = workspace({ profile: { state: 'vic' } });
    expect(buildReportData(ws, programs, now, DEFAULT_SECTIONS).oldestVerified).toBe('2026-09-01');
    expect(buildReportData(ws, programs.filter((p) => p.slug !== 'old'), now, DEFAULT_SECTIONS).oldestVerified).toBe('2026-10-20');
  });

  it('lists the included programs in the sources appendix with every source', () => {
    const data = buildReportData(full, PROGRAMS, now, only('programs', 'sources'));
    const rdti = data.sources!.find((s) => s.program === 'R&D Tax Incentive')!;
    expect(rdti.sources.length).toBe(PROGRAMS.find((p) => p.slug === 'rdti')!.verification.sources.length);
    const listed = data.programs!.flatMap((g) => g.programs).map((p) => p.name).sort();
    expect(data.sources!.map((s) => s.program).sort()).toEqual(listed);
  });
});

describe('directory-only report (no profile)', () => {
  const ws = workspace();
  const data = buildReportData(ws, PROGRAMS, now, only(...REPORT_SECTIONS));

  it('has no assessment, estimate or gaps', () => {
    expect(data.mode).toBe('directory');
    expect(data.summary).toBeNull();
    expect(data.funding).toBeNull();
    expect(data.gaps).toBeNull();
    expect(data.cover).toMatchObject({ title: 'Your startup', directoryOnly: true });
    expect(data.cover!.persona).toBeUndefined();
  });

  it('lists every open or rolling program', () => {
    const expected = PROGRAMS.filter((p) => ['open', 'rolling', 'closing-soon'].includes(deriveStatus(p, now).state)).map((p) => p.slug).sort();
    const listed = data.programs!.flatMap((g) => g.programs).map((p) => p.slug).sort();
    expect(listed).toEqual(expected);
    expect(listed.length).toBeGreaterThan(5);
    expect(data.oldestVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('still includes an empty pipeline and agenda', () => {
    expect(data.pipeline).toEqual([]);
    expect(data.upcoming).toEqual([]);
    expect(data.stacking).toEqual([]);
  });
});

describe('reportFilename', () => {
  it('slugs the company name and uses the Melbourne date', () => {
    expect(slugify('  Acme AI Pty. Ltd! ')).toBe('acme-ai-pty-ltd');
    expect(reportFilename('Acme AI', new Date('2026-10-27T14:00:00Z'))).toBe('acme-ai-funding-report-2026-10-28.pdf');
    expect(reportFilename(undefined, now)).toBe('startup-funding-report-2026-10-27.pdf');
    expect(reportFilename('!!!', now)).toBe('startup-funding-report-2026-10-27.pdf');
  });
});
