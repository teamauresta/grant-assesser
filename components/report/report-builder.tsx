'use client';

import { useMemo, useRef, useState } from 'react';
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
import { WINDOW_BAR, WINDOW_FRAME, Window, WindowControls } from '@/components/ui/window';
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
  const downloadRef = useRef<HTMLButtonElement>(null);

  const data = useMemo(() => buildReportData(ws, PROGRAMS, now, sections), [ws, now, sections]);
  const available = (s: ReportSection) => assessed || !NEEDS_ASSESSMENT.includes(s);
  const selected = REPORT_SECTIONS.filter((s) => sections[s] && available(s));
  const canDownload = hasAnySection(data);

  const download = async () => {
    // While busy the button is aria-disabled, not disabled, so it keeps keyboard focus.
    if (busy) return;
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

      {/* The options and the preview are windows (Billabong design doc section 4). */}
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[280px_minmax(0,1fr)]">
        {/* Not sticky: the window is about 1,140px tall at 1280 wide, taller than the screen, so a sticky
            one would hide its last checkboxes, and keyboard focus on them, until the end of the page. */}
        <Window title="Options" titleSize="md" bodyClassName="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Button
              ref={downloadRef}
              variant="primary"
              onClick={download}
              disabled={!canDownload}
              // Loading: a 16px spinner and "Making PDF…". aria-disabled, not disabled, so focus stays
              // on the button while the PDF is made.
              aria-disabled={busy || undefined}
              aria-busy={busy || undefined}
            >
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
                {/* Focus moves to Download PDF before the error (and this button) goes, so it is not lost. */}
                <Button size="sm" onClick={() => { downloadRef.current?.focus(); void download(); }} className="self-start">
                  <RotateCw aria-hidden="true" size={16} strokeWidth={1.5} />Try again
                </Button>
              </div>
            )}
          </div>
          <ChoiceGroup
            type="checkbox"
            name="sections"
            legend="Sections"
            // Most sections are checked by default: no ring, so the list stays quieter than the preview.
            emphasis="quiet"
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
        </Window>

        <Window title="Preview" titleSize="md" className="min-w-0" padding="lg">
          <ReportPreview data={data} />
        </Window>
      </div>
    </div>
  );
}

function BuilderSkeleton() {
  // The heading and intro, then the options and preview windows' frames with their bars and glyphs,
  // so the page does not jump when the workspace loads. A status, so "Loading the report builder" is
  // announced as text (a plain div cannot take an aria-label).
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">Loading the report builder</span>
      <div aria-hidden="true" className="flex flex-col gap-8">
        <div className="flex max-w-3xl flex-col gap-2">
          <div className="h-9 w-40 rounded bg-surface" />
          <div className="h-6 rounded bg-surface" />
        </div>
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[280px_minmax(0,1fr)]">
          {['h-96', 'h-[32rem]'].map((height) => (
            <div key={height} className={cn(WINDOW_FRAME, 'border-border')}>
              <div className={WINDOW_BAR}>
                <div className="h-6 flex-1">
                  <div className="h-full w-24 rounded bg-surface" />
                </div>
                <WindowControls />
              </div>
              <div className={height} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
