import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { renderToBuffer } from '@react-pdf/renderer';
import { WorkspaceSchema } from '@/lib/schema';
import { PROGRAMS } from '@/content/programs';
import { DEFAULT_SECTIONS, REPORT_SECTIONS, buildReportData, type ReportSections } from '@/lib/pdf/report-data';
import { ReportDocument, registerReportFonts } from '@/lib/pdf/report-document';

const now = new Date('2026-10-27T00:00:00Z');
const stamp = now.toISOString();
const ws = WorkspaceSchema.parse({
  schemaVersion: 1, workspaceId: 'w', settings: {}, createdAt: stamp, updatedAt: stamp,
  profile: { persona: 'bootstrapped', companyName: 'Acme AI', state: 'vic', hasAcn: true, rdSpend: '100k-500k' },
  pipeline: [{ id: 'a1', programSlug: 'rdti', stage: 'preparing', createdAt: stamp, updatedAt: stamp }],
  goals: [{ id: 'g1', applicationId: 'a1', title: 'Start an R&D log', dueDate: '2026-11-03', status: 'todo', source: 'user', createdAt: stamp, updatedAt: stamp }],
});
const all = Object.fromEntries(REPORT_SECTIONS.map((s) => [s, true])) as ReportSections;

// In the browser the fonts load from `${basePath}/fonts`; in Node, from the same files on disk.
beforeAll(() => { registerReportFonts(path.resolve(import.meta.dirname, '../../public/fonts')); });

describe('ReportDocument', () => {
  it('renders every section to a PDF', async () => {
    const buf = await renderToBuffer(<ReportDocument data={buildReportData(ws, PROGRAMS, now, all)} />);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(5_000);
  }, 30_000);

  it('renders a directory-only report for an empty workspace', async () => {
    const empty = WorkspaceSchema.parse({ ...ws, profile: {}, pipeline: [], goals: [] });
    const buf = await renderToBuffer(<ReportDocument data={buildReportData(empty, PROGRAMS, now, DEFAULT_SECTIONS)} />);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(5_000);
  }, 30_000);

  it('falls back to Helvetica', async () => {
    const buf = await renderToBuffer(<ReportDocument data={buildReportData(ws, PROGRAMS, now, DEFAULT_SECTIONS)} font="Helvetica" />);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  }, 30_000);
});
