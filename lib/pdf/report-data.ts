import type { GateId, Profile, Program, Workspace } from '@/lib/schema';
import { GROUP_ORDER, assessAll, estimateFunding, trackFor, type Assessment, type Group } from '@/lib/assess';
import { GROUP_INFO, TRACK_INFO, countedPrograms, firstIssue, gateSummaryText, summariseGates } from '@/lib/assessment/results';
import { QUESTIONS } from '@/lib/assessment/questions';
import { DEFAULT_RESULTS, PERSONAS_INFO, PERSONA_RESULTS } from '@/lib/personas';
import { DISCLAIMER } from '@/lib/copy';
import { formatDate, todayISO } from '@/lib/dates';
import { TYPE_LABELS, formatBenefit, formatMoney } from '@/lib/format';
import { deriveStatus, type DerivedState } from '@/lib/status';
import { statusLabel } from '@/components/ui/status-pill';
import { STAGE_LABELS, applicationName, isDropped } from '@/lib/plan/applications';
import { agenda, applicationProgress } from '@/lib/plan/selectors';
import { hasAnswers } from '@/lib/profile';

export const REPORT_SECTIONS = ['cover', 'summary', 'programs', 'funding', 'pipeline', 'upcoming', 'gaps', 'stacking', 'sources'] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];
export type ReportSections = Record<ReportSection, boolean>;

export const SECTION_INFO: Record<ReportSection, { label: string; description: string }> = {
  cover: { label: 'Cover', description: 'Company, persona and date' },
  summary: { label: 'Assessment summary', description: 'Your profile and how programs were grouped' },
  programs: { label: 'Matched programs', description: 'By group, with status, verified date and source' },
  funding: { label: 'Funding estimate', description: 'Potential cash and tax offsets, credits separate' },
  pipeline: { label: 'Pipeline', description: 'Every application and its stage' },
  upcoming: { label: 'Goals and deadlines', description: 'What is due in the next 90 days' },
  gaps: { label: 'Readiness gaps', description: 'Unanswered or unmet checks, each with its fix' },
  stacking: { label: 'Stacking notes', description: 'How your pipeline programs combine' },
  sources: { label: 'Sources appendix', description: 'Every official source behind the report' },
};

export const DEFAULT_SECTIONS: ReportSections = {
  cover: true, summary: true, programs: true, funding: true, pipeline: true,
  upcoming: true, gaps: true, stacking: true, sources: false,
};

export const UPCOMING_DAYS = 90;
export const PREPARED_WITH = 'Prepared with Grant Navigator';

export type ReportProgram = {
  slug: string; name: string; provider: string; type: string; benefit: string;
  state: DerivedState; status: string; lastVerified: string;
  source?: { title: string; url: string };
  /** "4 of 6 checks pass · 1 unknown"; assessment reports only. */
  checks?: string;
  /** The check most worth acting on, for programs in Prepare. */
  issue?: string;
  inPipeline: boolean;
};
export type ProgramGroup = { id: Group | 'funding' | 'quick-wins'; label: string; description: string; programs: ReportProgram[] };

export type CoverData = { title: string; persona?: string; directoryOnly: boolean };
export type SummaryData = {
  title: string; intro: string;
  facts: { label: string; value: string }[];
  counts: { group: Group; label: string; count: number }[];
};
export type Range = { low: number; high: number };
export type FundingData = { aud: Range; creditsUsd: Range; fundingPrograms: string[]; creditPrograms: string[] };
export type PipelineRow = {
  id: string; name: string; stage: string; dropped: boolean; expected?: string; goals: string;
  next?: { title: string; date: string };
  nextDeadline?: { label: string; date: string };
};
export type UpcomingRow = { id: string; kind: 'goal' | 'deadline'; date: string; title: string; context?: string; overdue: boolean };
export type GapRow = {
  gateId: GateId; label: string; outcome: 'unknown' | 'not-met'; reason: string; fix: string; programs: string[];
};
export type StackingRow = { program: string; with: string; note: string; withInPipeline: boolean };
export type SourceGroup = { program: string; lastVerified: string; sources: { title: string; url: string; official: boolean }[] };

export type ReportData = {
  /** Melbourne calendar date the report was made. */
  generatedOn: string;
  /** Earliest lastVerified among the programs the report includes. */
  oldestVerified: string | null;
  /** 'directory' when there is no profile: open programs only, no assessment. */
  mode: 'assessment' | 'directory';
  companyName?: string;
  disclaimer: string;
  /** Each is null when its section is switched off (or, in a directory report, not applicable). */
  cover: CoverData | null;
  summary: SummaryData | null;
  programs: ProgramGroup[] | null;
  funding: FundingData | null;
  pipeline: PipelineRow[] | null;
  upcoming: UpcomingRow[] | null;
  gaps: GapRow[] | null;
  stacking: StackingRow[] | null;
  sources: SourceGroup[] | null;
};

/** The results intro without sentences about on-screen styling, which the printed report does not have. */
const printIntro = (intro: string) => intro.split(/(?<=\.)\s+/).filter((x) => !/greyed out/i.test(x)).join(' ');

/** "Acme AI Pty. Ltd!" → "acme-ai-pty-ltd". */
export function slugify(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** `{company}-funding-report-{YYYY-MM-DD}.pdf`, dated in Melbourne. */
export function reportFilename(companyName: string | undefined, now: Date): string {
  return `${slugify(companyName ?? '') || 'startup'}-funding-report-${todayISO(now)}.pdf`;
}

/** The wizard's wording for an answer, e.g. turnover 'under-1m' → "Under $1M". */
function answerLabel(id: keyof Profile, profile: Profile): string | undefined {
  const value = profile[id];
  if (value === undefined) return undefined;
  return QUESTIONS.find((q) => q.id === id)?.options?.find((o) => o.value === value)?.label;
}

function profileFacts(profile: Profile): SummaryData['facts'] {
  const facts: SummaryData['facts'] = [];
  const add = (label: string, value: string | undefined) => { if (value) facts.push({ label, value }); };
  add('Company', profile.companyName?.trim());
  add('Persona', profile.persona && PERSONAS_INFO[profile.persona].label);
  add('Based in', answerLabel('state', profile));
  add('Incorporated', profile.incorporatedOn && formatDate(profile.incorporatedOn));
  add('Latest round', answerLabel('fundingStage', profile));
  add('Turnover', answerLabel('turnover', profile));
  add('R&D spend this year', answerLabel('rdSpend', profile));
  return facts;
}

function programRow(p: Program, now: Date, profile: Profile, inPipeline: Set<string>, a?: Assessment): ReportProgram {
  const status = a?.status ?? deriveStatus(p, now, profile);
  const source = p.verification.sources.find((s) => s.official) ?? p.verification.sources[0];
  const issue = a?.group === 'prepare' ? firstIssue(a.gates) : undefined;
  return {
    slug: p.slug, name: p.name, provider: p.provider, type: TYPE_LABELS[p.type], benefit: formatBenefit(p.benefit),
    state: status.state, status: statusLabel(status.state, status.daysToClose), lastVerified: p.verification.lastVerified,
    source: source && { title: source.title, url: source.url },
    checks: a ? gateSummaryText(summariseGates(a.gates)) : undefined,
    issue: issue && (issue.fix ? `${issue.reason}. ${issue.fix}.` : `${issue.reason}.`),
    inPipeline: inPipeline.has(p.slug),
  };
}

function readinessGaps(assessments: Assessment[]): GapRow[] {
  const gaps = new Map<string, GapRow>();
  for (const a of assessments) {
    if (a.group !== 'act-now' && a.group !== 'prepare') continue;
    for (const g of a.gates) {
      if (g.severity !== 'hard') continue;
      if (!(g.result === 'unknown' || (g.result === 'fail' && g.fixable))) continue;
      const key = `${g.id}|${g.label}`;
      const row = gaps.get(key) ?? {
        gateId: g.id, label: g.label, outcome: g.result === 'unknown' ? 'unknown' : 'not-met', reason: g.reason,
        fix: g.fix ?? 'Answer this in the assessment', programs: [],
      } satisfies GapRow;
      if (!row.programs.includes(a.program.name)) row.programs.push(a.program.name);
      gaps.set(key, row);
    }
  }
  // Checks that hold back the most programs first; ties keep their first-seen (ranked) order.
  return [...gaps.values()].sort((x, y) => y.programs.length - x.programs.length);
}

/**
 * Everything the report needs, from the workspace and program data at `now`. Pure: the HTML preview
 * and the PDF both render from this. Sections switched off come back null.
 */
export function buildReportData(ws: Workspace, programs: Program[], now: Date, sections: ReportSections): ReportData {
  const profile = ws.profile;
  const assessed = hasAnswers(profile);
  const bySlug = new Map(programs.map((p) => [p.slug, p]));
  const active = ws.pipeline.filter((a) => !isDropped(a));
  const pursued = new Set(active.flatMap((a) => (a.programSlug ? [a.programSlug] : [])));
  const inPipeline = new Set(ws.pipeline.flatMap((a) => (a.programSlug ? [a.programSlug] : [])));
  const companyName = profile.companyName?.trim() || undefined;

  // Programs referenced by the enabled sections; their oldest verified date goes in the footer.
  const included = new Set<string>();
  const include = (slug: string | undefined) => { if (slug && bySlug.has(slug)) included.add(slug); };

  let matched: ProgramGroup[];
  let assessments: Assessment[] = [];
  if (assessed) {
    assessments = assessAll(programs, profile, now);
    matched = GROUP_ORDER.filter((g) => g !== 'not-a-fit').map((group) => ({
      id: group, label: GROUP_INFO[group].label, description: GROUP_INFO[group].description,
      programs: assessments.filter((a) => a.group === group).map((a) => programRow(a.program, now, profile, inPipeline, a)),
    }));
  } else {
    const open = programs
      .filter((p) => ['open', 'rolling', 'closing-soon'].includes(deriveStatus(p, now, profile).state))
      .sort((a, b) => a.name.localeCompare(b.name));
    matched = (['funding', 'quick-wins'] as const).map((track) => ({
      id: track, label: TRACK_INFO[track].label, description: TRACK_INFO[track].description,
      programs: open.filter((p) => trackFor(p) === track).map((p) => programRow(p, now, profile, inPipeline)),
    }));
  }

  const copy = profile.persona ? PERSONA_RESULTS[profile.persona] : DEFAULT_RESULTS;
  const summary: SummaryData | null = sections.summary && assessed ? {
    title: copy.title, intro: printIntro(copy.intro), facts: profileFacts(profile),
    counts: GROUP_ORDER.map((group) => ({ group, label: GROUP_INFO[group].label, count: assessments.filter((a) => a.group === group).length })),
  } : null;

  const programGroups = sections.programs ? matched : null;
  programGroups?.forEach((g) => g.programs.forEach((p) => include(p.slug)));

  let funding: FundingData | null = null;
  if (sections.funding && assessed) {
    const estimate = estimateFunding(assessments, profile);
    const counted = countedPrograms(estimate, programs);
    funding = { aud: estimate.aud, creditsUsd: estimate.creditsUsd, fundingPrograms: counted.funding, creditPrograms: counted.credits };
    estimate.includedSlugs.forEach(include);
  }

  const pipeline: PipelineRow[] | null = sections.pipeline ? ws.pipeline.map((a) => {
    const program = a.programSlug ? bySlug.get(a.programSlug) : undefined;
    include(program?.slug);
    const progress = applicationProgress(ws.goals, a.id);
    const dropped = isDropped(a);
    const deadline = program && !dropped ? deriveStatus(program, now, profile).nextDeadline : undefined;
    return {
      id: a.id, name: program?.name ?? applicationName(a) ?? 'Untitled application', stage: STAGE_LABELS[a.stage], dropped,
      expected: a.expectedAmount !== undefined ? formatMoney(a.expectedAmount, 'AUD') : undefined,
      goals: progress.total ? `${progress.done} of ${progress.total} ${progress.total === 1 ? 'goal' : 'goals'} done` : 'No goals yet',
      next: progress.next && { title: progress.next.title, date: progress.next.dueDate },
      nextDeadline: deadline && { label: deadline.label, date: deadline.date },
    };
  }) : null;

  const upcoming: UpcomingRow[] | null = sections.upcoming ? agenda(ws, now, UPCOMING_DAYS).map((i) => {
    if (i.kind === 'deadline') include(i.program.slug);
    return { id: i.id, kind: i.kind, date: i.date, title: i.title, context: i.context, overdue: i.kind === 'goal' && i.overdue };
  }) : null;

  const gaps = sections.gaps && assessed ? readinessGaps(assessments) : null;
  gaps?.forEach((g) => g.programs.forEach((name) => include(programs.find((p) => p.name === name)?.slug)));

  const stacking: StackingRow[] | null = sections.stacking ? [...pursued].flatMap((slug) => {
    const p = bySlug.get(slug);
    if (!p) return [];
    include(slug);
    return p.stacking.map((s) => ({ program: p.name, with: bySlug.get(s.with)?.name ?? s.with, note: s.note, withInPipeline: pursued.has(s.with) }));
  }) : null;

  // Nothing program-related switched on: fall back to the matched programs so the footer still has a date.
  if (!included.size) matched.forEach((g) => g.programs.forEach((p) => include(p.slug)));
  const includedPrograms = [...included].map((s) => bySlug.get(s)!).sort((a, b) => a.name.localeCompare(b.name));
  const oldestVerified = includedPrograms.map((p) => p.verification.lastVerified).sort()[0] ?? null;

  const sources: SourceGroup[] | null = sections.sources
    ? includedPrograms.map((p) => ({ program: p.name, lastVerified: p.verification.lastVerified, sources: p.verification.sources.map((s) => ({ ...s })) }))
    : null;

  return {
    generatedOn: todayISO(now), oldestVerified, mode: assessed ? 'assessment' : 'directory', companyName, disclaimer: DISCLAIMER,
    cover: sections.cover ? { title: companyName ?? 'Your startup', persona: profile.persona && PERSONAS_INFO[profile.persona].label, directoryOnly: !assessed } : null,
    summary, programs: programGroups, funding, pipeline, upcoming, gaps, stacking, sources,
  };
}

/** True when at least one section is on that has content to render. */
export const hasAnySection = (d: ReportData) => REPORT_SECTIONS.some((s) => d[s] !== null);
