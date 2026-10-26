'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleAlert, ClipboardCheck, Download, LoaderCircle, RotateCw } from 'lucide-react';
import { PROGRAMS } from '@/content/programs';
import {
  DEFAULT_SECTIONS, REPORT_SECTIONS, SECTION_INFO, buildReportData, hasAnySection, reportFilename,
  type ReportData, type ReportSection, type ReportSections,
} from '@/lib/pdf/report-data';
import { useNow } from '@/lib/use-now';
import { useStoredProfile, useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { downloadFile } from '@/lib/download';
import { Button, buttonClasses } from '@/components/ui/button';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { ReportPreview } from './report-preview';

/** Sections that need assessment answers; a directory-only report leaves them out. */
const NEEDS_ASSESSMENT: readonly ReportSection[] = ['summary', 'funding', 'gaps'];

const FONT_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fonts`;

/**
 * Renders the PDF in the browser. @react-pdf/renderer and the document are loaded on demand so they
 * stay out of the page's initial bundle. Falls back to Helvetica if the Geist files fail to load.
 */
async function renderPdf(data: ReportData): Promise<Blob> {
  const [{ pdf }, { ReportDocument, registerReportFonts }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/lib/pdf/report-document'),
  ]);
  registerReportFonts(FONT_BASE);
  try {
    return await pdf(<ReportDocument data={data} />).toBlob();
  } catch {
    return await pdf(<ReportDocument data={data} font="Helvetica" />).toBlob();
  }
}

/** The report builder: section checkboxes, an HTML preview and Download PDF. */
export function ReportBuilder() {
  const ready = useWorkspace((s) => s.ready);
  const now = useNow();
  if (!ready || !now) return <BuilderSkeleton />;
  return <BuilderView now={now} />;
}

function BuilderView({ now }: { now: Date }) {
  const ws = useWorkspace((s) => s.ws);
  const assessed = useStoredProfile() !== undefined;
  const [sections, setSections] = useState<ReportSections>(DEFAULT_SECTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const data = useMemo(() => buildReportData(ws, PROGRAMS, now, sections), [ws, now, sections]);
  const available = (s: ReportSection) => assessed || !NEEDS_ASSESSMENT.includes(s);
  const selected = REPORT_SECTIONS.filter((s) => sections[s] && available(s));
  const canDownload = hasAnySection(data);

  const download = async () => {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const filename = reportFilename(data.companyName, now);
      downloadFile(filename, await renderPdf(data));
      setSaved(filename);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong while making the PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl">Report</h1>
        <p className="text-muted-fg">
          Choose what to include, check the preview, then download a PDF for yourself, your board, investors or advisers.
        </p>
      </header>

      {!assessed && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <ClipboardCheck aria-hidden="true" size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted-fg" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">No assessment yet</p>
              <p className="text-sm text-muted-fg">
                Take the assessment for a personalised report with eligibility, a funding estimate and readiness gaps.
                You can still download a directory-only report listing every program open today.
              </p>
            </div>
          </div>
          <Link href="/assess/" className={buttonClasses({ variant: 'secondary', className: 'shrink-0 self-start sm:self-center' })}>
            Start the assessment<ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Button variant="primary" onClick={download} disabled={busy || !canDownload} aria-busy={busy || undefined}>
              {busy
                ? <LoaderCircle aria-hidden="true" size={16} strokeWidth={1.5} className="animate-spin motion-reduce:animate-none" />
                : <Download aria-hidden="true" size={16} strokeWidth={1.5} />}
              {busy ? 'Making PDF…' : 'Download PDF'}
            </Button>
            {!canDownload && <p className="text-sm text-muted-fg">Choose at least one section.</p>}
            <p aria-live="polite" className={cn('text-sm text-muted-fg', !saved && 'sr-only')}>
              {saved ? `Downloaded ${saved}` : ''}
            </p>
            {error && (
              <div role="alert" className="flex flex-col gap-2 rounded-md border border-danger p-3 text-sm">
                <p className="flex items-start gap-1.5 text-danger">
                  <CircleAlert aria-hidden="true" size={16} strokeWidth={1.5} className="mt-[3px] shrink-0" />
                  <span>The PDF could not be made. {error}</span>
                </p>
                <Button size="sm" onClick={download} disabled={busy} className="self-start">
                  <RotateCw aria-hidden="true" size={16} strokeWidth={1.5} />Try again
                </Button>
              </div>
            )}
          </div>
          <ChoiceGroup
            type="checkbox"
            name="sections"
            legend="Sections"
            value={selected}
            // Unavailable sections keep their choice, ready for when there is an assessment.
            onChange={(next) => setSections((prev) => Object.fromEntries(REPORT_SECTIONS.map((s) => [s, available(s) ? next.includes(s) : prev[s]])) as ReportSections)}
            options={REPORT_SECTIONS.map((s) => ({
              value: s,
              label: SECTION_INFO[s].label,
              description: available(s) ? SECTION_INFO[s].description : 'Needs the assessment',
              disabled: !available(s),
            }))}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-fg">Preview</h2>
          <ReportPreview data={data} />
        </div>
      </div>
    </div>
  );
}

function BuilderSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the report builder" className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-2">
        <div className="h-9 w-40 rounded bg-surface" />
        <div className="h-6 rounded bg-surface" />
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="h-96 rounded-lg border border-border bg-surface" />
        <div className="h-[32rem] rounded-lg border border-border bg-surface" />
      </div>
    </div>
  );
}
