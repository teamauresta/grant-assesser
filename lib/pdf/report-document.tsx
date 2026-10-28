import type { ReactNode } from 'react';
import { Document, Font, Link, Page, StyleSheet, Text, View, type Styles } from '@react-pdf/renderer';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import {
  PREPARED_WITH, REPORT_SECTIONS, SECTION_INFO, UPCOMING_DAYS,
  type FundingData, type GapRow, type PipelineRow, type ProgramGroup, type Range, type ReportData,
  type SourceGroup, type StackingRow, type SummaryData, type UpcomingRow,
} from './report-data';

/*
 * The PDF has no CSS tokens, so its palette lives here: neutrals only. Matches the light theme in
 * app/globals.css.
 */
const C = {
  fg: '#09090b',
  body: '#27272a',
  muted: '#52525b',
  faint: '#71717a',
  border: '#d4d4d8',
  hairline: '#e4e4e7',
  fill: '#f4f4f5',
} as const;

/** 1px at 96dpi. */
const PX = 0.75;

export type ReportFont = 'Geist' | 'Helvetica';

let registeredBase: string | null = null;

/**
 * Registers Geist (regular, medium and semibold TTFs) from `base`, a URL prefix in the browser
 * (`${basePath}/fonts`) or a directory path in Node. Safe to call more than once.
 */
export function registerReportFonts(base: string) {
  if (registeredBase === base) return;
  Font.register({
    family: 'Geist',
    fonts: [
      { src: `${base}/Geist-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/Geist-Medium.ttf`, fontWeight: 500 },
      { src: `${base}/Geist-SemiBold.ttf`, fontWeight: 600 },
    ],
  });
  registeredBase = base;
}

/** No hyphenation: words stay whole. Long URLs are wrapped by breakUrl instead. */
Font.registerHyphenationCallback((word) => [word]);

type Style = Styles[string];

const s = StyleSheet.create({
  // No lineHeight here; see T.
  page: { paddingTop: 40, paddingHorizontal: 40, paddingBottom: 64, fontSize: 9.5, color: C.body },
  body: { flexGrow: 1 },
  // fontSize sits beside lineHeight: a unitless lineHeight resolves against the Text's own fontSize.
  text: { fontSize: 9.5, lineHeight: 1.45 },
  footer: {
    position: 'absolute', left: 40, right: 40, bottom: 24, paddingTop: 6, paddingRight: 64,
    borderTopWidth: PX, borderTopColor: C.hairline,
  },
  footerText: { fontSize: 7, lineHeight: 1.3, color: C.faint },
  footerPage: {
    position: 'absolute', right: 40, bottom: 24, width: 60, textAlign: 'right',
    fontSize: 7, color: C.faint, fontFeatureSettings: ['tnum'],
  },

  // Cover
  cover: { flexGrow: 1, justifyContent: 'space-between' },
  eyebrow: { fontSize: 9, fontWeight: 500, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase' },
  coverTitle: { marginTop: 10, fontSize: 30, lineHeight: 1.15, fontWeight: 600, color: C.fg },
  coverRule: { marginTop: 18, width: 48, height: PX, backgroundColor: C.hairline },
  coverMeta: { marginTop: 18, gap: 4 },
  coverMetaRow: { flexDirection: 'row' },
  coverMetaLabel: { width: 110, fontSize: 10.5, color: C.muted },
  coverMetaValue: { fontSize: 10.5, color: C.fg, fontWeight: 500 },
  coverNote: { marginTop: 22, maxWidth: 380, color: C.muted },
  contents: { gap: 3 },
  contentsTitle: { fontSize: 9, fontWeight: 600, color: C.fg, marginBottom: 4 },
  contentsItem: { flexDirection: 'row', gap: 8, color: C.muted },
  contentsNum: { width: 14, color: C.faint, fontFeatureSettings: ['tnum'] },
  disclaimerBox: { marginTop: 24, paddingTop: 10, borderTopWidth: PX, borderTopColor: C.border },
  disclaimer: { fontSize: 8.5, color: C.muted },

  // Sections
  section: { marginBottom: 22 },
  sectionHead: { marginBottom: 10 },
  h2: { fontSize: 14, lineHeight: 1.25, fontWeight: 600, color: C.fg },
  rule: { marginTop: 5, height: PX, backgroundColor: C.hairline },
  lead: { marginTop: 6, color: C.muted },
  h3: { fontSize: 10.5, fontWeight: 600, color: C.fg },
  groupHead: { marginTop: 8, marginBottom: 5 },
  small: { fontSize: 8, lineHeight: 1.4, color: C.muted },
  empty: { paddingVertical: 8, paddingHorizontal: 10, borderWidth: PX, borderColor: C.border, borderStyle: 'dashed', color: C.muted },
  num: { fontFeatureSettings: ['tnum'] },
  strong: { fontWeight: 600, color: C.fg },
  medium: { fontWeight: 500, color: C.fg },

  // Tables
  // Borders live on the rows, not the table, so a table split across pages has no empty bordered tail.
  table: {},
  // Top borders, so a row that starts a page is closed; the last row also gets a bottom border.
  tr: { flexDirection: 'row', borderLeftWidth: PX, borderRightWidth: PX, borderTopWidth: PX, borderColor: C.border },
  trLast: { borderBottomWidth: PX },
  th: { backgroundColor: C.fill },
  thText: { fontSize: 7.5, fontWeight: 600, color: C.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  td: { paddingVertical: 5, paddingHorizontal: 6 },
  muted: { color: C.faint },

  // Summary
  facts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, borderWidth: PX, borderColor: C.border },
  fact: { width: '50%', flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6 },
  factLabel: { width: 100, color: C.muted },
  factValue: { flex: 1, color: C.fg, fontWeight: 500 },
  counts: { flexDirection: 'row', gap: 8, marginTop: 10 },
  count: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderWidth: PX, borderColor: C.border },
  countNum: { fontSize: 18, lineHeight: 1.1, fontWeight: 600, color: C.fg, fontFeatureSettings: ['tnum'] },
  countLabel: { marginTop: 2, fontSize: 8, color: C.muted },

  // Funding
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 10, borderWidth: PX, borderColor: C.border },
  statLabel: { fontSize: 8, color: C.muted },
  statValue: { marginTop: 3, fontSize: 18, lineHeight: 1.15, fontWeight: 600, color: C.fg, fontFeatureSettings: ['tnum'] },
  statNote: { marginTop: 3, fontSize: 8, color: C.muted },
  notes: { marginTop: 8, gap: 2 },

  // Stacking and sources
  block: { paddingVertical: 6, borderTopWidth: PX, borderTopColor: C.hairline },
  blockFirst: { borderTopWidth: 0, paddingTop: 0 },
  link: { color: C.body, textDecoration: 'none' },
});

// For tests only: importing this module anywhere else would pull @react-pdf/renderer into a bundle; it must stay behind import().
export { C as REPORT_PALETTE, s as REPORT_STYLES };

/**
 * Text with the body size and line height. A unitless lineHeight resolves against the fontSize in
 * the same style, so both are set on each Text rather than inherited from a View (which renders far
 * too loose); react-pdf also drops a `render` Text, such as the page number, that inherits one.
 * Spans nested inside a T use plain Text so they keep the parent's size.
 */
function T({ style, children }: { style?: Style | Style[]; children?: ReactNode }) {
  return <Text style={[s.text, ...(Array.isArray(style) ? style : style ? [style] : [])]}>{children}</Text>;
}

const fmt = (iso: string | null) => (iso ? formatDate(iso) : 'not recorded');

function range({ low, high }: Range, currency: 'AUD' | 'USD'): string {
  if (high <= 0) return 'None counted yet';
  return low === high || low <= 0 ? `Up to ${formatMoney(high, currency)}` : `${formatMoney(low, currency)}–${formatMoney(high, currency)}`;
}

/** "business.gov.au/grants-and-programs/…": short enough for a table cell; the link keeps the full URL. */
function shortUrl(url: string, max = 52): string {
  const bare = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return bare.length > max ? `${bare.slice(0, max - 1)}…` : bare;
}

/**
 * The page number is its own fixed Text with no lineHeight (see T): react-pdf drops a `render` Text
 * that has one, and with it any fixed View that contains it.
 */
/**
 * A long URL as lines of at most `max` characters, broken after "/", "-", "?" or "&". react-pdf
 * would otherwise either overflow the line or break it with an inserted hyphen.
 */
export function breakUrl(url: string, max = 105): string {
  const lines: string[] = [];
  let line = '';
  for (const part of url.split(/(?<=[/\-?&])/)) {
    if (line && line.length + part.length > max) { lines.push(line); line = ''; }
    line += part;
  }
  return [...lines, line].join('\n');
}

function Footer({ data }: { data: ReportData }) {
  return (
    <>
      <View style={s.footer} fixed>
        <T style={s.footerText}>Generated {fmt(data.generatedOn)} · Program data verified as of {fmt(data.oldestVerified)} · General information, not financial or tax advice</T>
      </View>
      <Text style={s.footerPage} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </>
  );
}

/** Heading, rule and lead kept together, and never left alone at the foot of a page. */
function Section({ title, lead, first, children }: {
  title: string; lead?: string;
  /** Kept on the same page as the heading. minPresenceAhead does not hold for a tall unbreakable block. */
  first?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={s.section}>
      <View wrap={false} minPresenceAhead={72}>
        <View style={s.sectionHead}>
          <T style={s.h2}>{title}</T>
          <View style={s.rule} />
          {lead && <T style={s.lead}>{lead}</T>}
        </View>
        {first}
      </View>
      {children}
    </View>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <T style={s.empty}>{children}</T>;
}

type Col = { label: string; width: string | number; align?: 'left' | 'right' };

type TableSpec<R> = { cols: Col[]; rows: R[]; cells: (row: R) => ReactNode[]; rowKey: (row: R) => string };

/**
 * A table as its header plus first row, which must stay together (with whatever heading the caller
 * puts in front), and the remaining rows. Each row is unbreakable; borders sit on the rows.
 */
function tableParts<R>({ cols, rows, cells, rowKey }: TableSpec<R>): { first: ReactNode; rest: ReactNode[] } {
  const row = (r: R, i: number) => (
    <View key={rowKey(r)} style={[s.tr, i === rows.length - 1 ? s.trLast : {}]} wrap={false}>
      {cells(r).map((cell, c) => (
        <View key={cols[c].label} style={[s.td, { width: cols[c].width }]}>{cell}</View>
      ))}
    </View>
  );
  const header = (
    <View style={s.tr}>
      {cols.map((c) => (
        <View key={c.label} style={[s.td, s.th, { width: c.width }]}>
          <T style={[s.thText, { textAlign: c.align ?? 'left' }]}>{c.label}</T>
        </View>
      ))}
    </View>
  );
  return { first: <View>{header}{row(rows[0], 0)}</View>, rest: rows.slice(1).map((r, i) => row(r, i + 1)) };
}

/** A section whose body is one table, or a note when there are no rows. */
function TableSection<R>({ title, lead, empty, ...table }: { title: string; lead: string; empty: string } & TableSpec<R>) {
  const parts = table.rows.length ? tableParts(table) : { first: <Empty>{empty}</Empty>, rest: [] };
  return <Section title={title} lead={lead} first={parts.first}>{parts.rest}</Section>;
}

function Cover({ data }: { data: ReportData }) {
  const cover = data.cover!;
  const inside = REPORT_SECTIONS.filter((k) => k !== 'cover' && data[k] !== null);
  return (
    <View style={s.cover}>
      <View>
        <T style={s.eyebrow}>Funding report</T>
        <T style={s.coverTitle}>{cover.title}</T>
        <View style={s.coverRule} />
        <View style={s.coverMeta}>
          {cover.persona && (
            <View style={s.coverMetaRow}><T style={s.coverMetaLabel}>Persona</T><T style={s.coverMetaValue}>{cover.persona}</T></View>
          )}
          <View style={s.coverMetaRow}><T style={s.coverMetaLabel}>Date</T><T style={s.coverMetaValue}>{fmt(data.generatedOn)}</T></View>
          <View style={s.coverMetaRow}><T style={s.coverMetaLabel}>Data verified</T><T style={s.coverMetaValue}>{fmt(data.oldestVerified)}</T></View>
        </View>
        <T style={s.coverNote}>
          {cover.directoryOnly
            ? 'Directory-only report. No assessment answers were saved, so this lists every program that is open or rolling today, with no eligibility checks or estimate. Take the assessment for a personalised report.'
            : 'Australian government, state and industry programs matched to your answers, with an estimate of potential funding and the steps to get ready.'}
        </T>
      </View>
      <View>
        {inside.length > 0 && (
          <View style={s.contents}>
            <T style={s.contentsTitle}>In this report</T>
            {inside.map((k, i) => (
              <View key={k} style={s.contentsItem}>
                <T style={s.contentsNum}>{i + 1}</T>
                <T>{SECTION_INFO[k].label}</T>
              </View>
            ))}
          </View>
        )}
        <View style={s.disclaimerBox}>
          <T style={[s.disclaimer, s.medium]}>{PREPARED_WITH}</T>
          <T style={s.disclaimer}>{data.disclaimer}</T>
        </View>
      </View>
    </View>
  );
}

function Summary({ summary }: { summary: SummaryData }) {
  return (
    <Section title="Assessment summary">
      <T style={s.h3}>{summary.title}</T>
      <T style={s.lead}>{summary.intro}</T>
      {summary.facts.length > 0 && (
        <View style={s.facts} wrap={false}>
          {summary.facts.map((f) => (
            <View key={f.label} style={s.fact}>
              <T style={s.factLabel}>{f.label}</T>
              <T style={s.factValue}>{f.value}</T>
            </View>
          ))}
        </View>
      )}
      <View style={s.counts} wrap={false}>
        {summary.counts.map((c) => (
          <View key={c.group} style={s.count}>
            <T style={s.countNum}>{c.count}</T>
            <T style={s.countLabel}>{c.label}</T>
          </View>
        ))}
      </View>
    </Section>
  );
}

function Programs({ groups, directory }: { groups: ProgramGroup[]; directory: boolean }) {
  // Each group's heading stays with its table header and first row; the first group's also stays
  // with the section heading.
  const parts = groups.map((g, i) => {
    const head = (
      <View style={[s.groupHead, i > 0 ? { marginTop: 14 } : {}]}>
        <T style={s.h3}>{g.label} <Text style={[s.muted, s.num]}>({g.programs.length})</Text></T>
        <T style={s.small}>{g.description}</T>
      </View>
    );
    if (!g.programs.length) return { first: <View>{head}<Empty>Nothing here for now.</Empty></View>, rest: [] as ReactNode[] };
    const table = tableParts({
      cols: [{ label: 'Program', width: '52%' }, { label: 'Benefit', width: '20%' }, { label: 'Status', width: '15%' }, { label: 'Verified', width: '13%' }],
      rows: g.programs,
      rowKey: (p) => p.slug,
      cells: (p) => [
        <View key="p" style={{ gap: 1 }}>
          <T style={s.medium}>{p.name}{p.inPipeline ? '  ·  In pipeline' : ''}</T>
          <T style={s.small}>{p.provider} · {p.type}{p.checks ? ` · ${p.checks}` : ''}</T>
          {p.issue && <T style={s.small}>Next step: {p.issue}</T>}
          {p.source && <Link src={p.source.url} style={[s.small, s.link]}>{shortUrl(p.source.url)}</Link>}
        </View>,
        <T key="b" style={s.num}>{p.benefit}</T>,
        <T key="s" style={s.num}>{p.status}</T>,
        <T key="v" style={s.num}>{formatDate(p.lastVerified)}</T>,
      ],
    });
    return { first: <View>{head}{table.first}</View>, rest: table.rest };
  });
  return (
    <Section
      title={directory ? 'Open and rolling programs' : 'Matched programs'}
      lead={directory
        ? 'Every program open or taking applications today. Without assessment answers, eligibility is not checked.'
        : 'Programs not ruled out by your answers, grouped by what to do next. Programs that are not a fit are left out.'}
      first={parts[0]?.first}
    >
      {parts[0]?.rest}
      {groups.slice(1).map((g, i) => (
        <View key={g.id}>
          <View wrap={false}>{parts[i + 1].first}</View>
          {parts[i + 1].rest}
        </View>
      ))}
    </Section>
  );
}

function Funding({ funding }: { funding: FundingData }) {
  return (
    <Section title="Funding estimate" lead="An estimate of what you could apply for, not money you have been awarded.">
      <View style={s.stats} wrap={false}>
        <View style={s.stat}>
          <T style={s.statLabel}>Potential cash and tax offsets (AUD), not secured</T>
          <T style={s.statValue}>{range(funding.aud, 'AUD')}</T>
          <T style={s.statNote}>{funding.fundingPrograms.length ? `From ${funding.fundingPrograms.join(', ')}` : 'Nothing counted yet'}</T>
        </View>
        <View style={s.stat}>
          <T style={s.statLabel}>Cloud and AI credits (USD), counted separately</T>
          <T style={s.statValue}>{funding.creditsUsd.high > 0 ? `Up to ${formatMoney(funding.creditsUsd.high, 'USD')}` : 'None counted yet'}</T>
          <T style={s.statNote}>{funding.creditPrograms.length ? `From ${funding.creditPrograms.join(', ')}` : 'Nothing counted yet'}</T>
        </View>
      </View>
      <View style={s.notes}>
        <T style={s.small}>Only open programs where you pass every required check are counted. Where programs are alternatives, only the larger one counts.</T>
        <T style={s.small}>Consortium awards, equity, debt and investor incentives are not counted. The R&D Tax Incentive range uses your R&D spend band and arrives after your tax return.</T>
      </View>
    </Section>
  );
}

function Pipeline({ rows }: { rows: PipelineRow[] }) {
  return (
    <TableSection
      title="Pipeline"
      lead="Every application you are tracking, including ones you are no longer pursuing."
      empty="No applications in your pipeline yet."
      cols={[{ label: 'Application', width: '30%' }, { label: 'Stage', width: '16%' }, { label: 'Expected', width: '12%', align: 'right' }, { label: 'Progress and next step', width: '42%' }]}
      rows={rows}
      rowKey={(r) => r.id}
      cells={(r) => [
        <T key="n" style={r.dropped ? s.muted : s.medium}>{r.name}</T>,
        <View key="s"><T style={r.dropped ? s.muted : undefined}>{r.stage}</T>{r.dropped && <T style={s.small}>No longer pursued</T>}</View>,
        <T key="e" style={[s.num, { textAlign: 'right' }, r.dropped ? s.muted : {}]}>{r.expected ?? '–'}</T>,
        <View key="g" style={{ gap: 1 }}>
          <T style={r.dropped ? s.muted : undefined}>{r.goals}</T>
          {r.next && <T style={s.small}>Next: {r.next.title}, due <Text style={s.num}>{formatDate(r.next.date)}</Text></T>}
          {r.nextDeadline && <T style={s.small}>{r.nextDeadline.label}: <Text style={s.num}>{formatDate(r.nextDeadline.date)}</Text></T>}
        </View>,
      ]}
    />
  );
}

function Upcoming({ rows }: { rows: UpcomingRow[] }) {
  return (
    <TableSection
      title="Goals and deadlines"
      lead={`Open goals and program deadlines due in the next ${UPCOMING_DAYS} days, with anything overdue.`}
      empty={`Nothing due in the next ${UPCOMING_DAYS} days.`}
      cols={[{ label: 'Date', width: '16%' }, { label: 'Item', width: '64%' }, { label: 'Type', width: '20%' }]}
      rows={rows}
      rowKey={(r) => r.id}
      cells={(r) => [
        <T key="d" style={s.num}>{formatDate(r.date)}</T>,
        <View key="t"><T style={s.medium}>{r.title}</T>{r.context && <T style={s.small}>{r.context}</T>}</View>,
        <T key="k">{r.kind === 'deadline' ? 'Program deadline' : r.overdue ? 'Goal, overdue' : 'Goal'}</T>,
      ]}
    />
  );
}

function Gaps({ rows }: { rows: GapRow[] }) {
  return (
    <TableSection
      title="Readiness gaps"
      lead="Required checks that are unanswered or not yet met, across the programs to act on or prepare for."
      empty="No gaps: you meet every required check for the programs you can act on."
      cols={[{ label: 'Check', width: '28%' }, { label: 'Status', width: '15%' }, { label: 'What to do', width: '27%' }, { label: 'Needed for', width: '30%' }]}
      rows={rows}
      rowKey={(r) => `${r.gateId}|${r.label}`}
      cells={(r) => [
        <View key="c"><T style={s.medium}>{r.label}</T><T style={s.small}>{r.reason}</T></View>,
        <T key="o">{r.outcome === 'unknown' ? 'Not answered' : 'Not met'}</T>,
        <T key="f">{r.fix}</T>,
        <T key="p" style={s.small}>{r.programs.join(', ')}</T>,
      ]}
    />
  );
}

function Stacking({ rows }: { rows: StackingRow[] }) {
  const blocks = rows.map((r, i) => (
    <View key={`${r.program}-${r.with}`} style={[s.block, i === 0 ? s.blockFirst : {}]} wrap={false}>
      <T style={s.medium}>{r.program} with {r.with}{r.withInPipeline ? '  ·  Both in pipeline' : ''}</T>
      <T>{r.note}</T>
    </View>
  ));
  return (
    <Section
      title="Stacking notes"
      lead="How the programs you are pursuing combine with others. Get advice before relying on two programs for the same costs."
      first={blocks[0] ?? <Empty>No stacking notes for the programs in your pipeline.</Empty>}
    >
      {blocks.slice(1)}
    </Section>
  );
}

function Sources({ groups }: { groups: SourceGroup[] }) {
  const blocks = groups.map((g, i) => (
    <View key={g.program} style={[s.block, i === 0 ? s.blockFirst : {}]} wrap={false}>
      <T style={s.medium}>{g.program} <Text style={[s.small, s.num]}>· verified {formatDate(g.lastVerified)}</Text></T>
      {g.sources.map((src) => (
        <View key={src.url} style={{ marginTop: 2 }}>
          <T style={s.small}>{src.title}{src.official ? '' : ' (secondary source)'}</T>
          <Link src={src.url} style={[s.small, s.link]}>{breakUrl(src.url)}</Link>
        </View>
      ))}
    </View>
  ));
  return (
    <Section
      title="Sources appendix"
      lead="The sources behind each program in this report, with the date they were last checked."
      first={blocks[0] ?? <Empty>No programs in this report.</Empty>}
    >
      {blocks.slice(1)}
    </Section>
  );
}

export type ReportDocumentProps = { data: ReportData; font?: ReportFont };

/** The report as an A4 PDF: an optional cover page, then the selected sections, with a footer on every page. */
export function ReportDocument({ data, font = 'Geist' }: ReportDocumentProps) {
  const body = REPORT_SECTIONS.some((k) => k !== 'cover' && data[k] !== null);
  const title = `${data.companyName ?? 'Startup'} funding report`;
  return (
    <Document title={title} author={data.companyName} subject="Funding report" creator={PREPARED_WITH} producer={PREPARED_WITH} language="en-AU">
      {data.cover && (
        <Page size="A4" style={[s.page, { fontFamily: font }]}>
          <View style={s.body}><Cover data={data} /></View>
          <Footer data={data} />
        </Page>
      )}
      {(body || !data.cover) && (
        <Page size="A4" style={[s.page, { fontFamily: font }]}>
          <View style={s.body}>
          {data.summary && <Summary summary={data.summary} />}
          {data.programs && <Programs groups={data.programs} directory={data.mode === 'directory'} />}
          {data.funding && <Funding funding={data.funding} />}
          {data.pipeline && <Pipeline rows={data.pipeline} />}
          {data.upcoming && <Upcoming rows={data.upcoming} />}
          {data.gaps && <Gaps rows={data.gaps} />}
          {data.stacking && <Stacking rows={data.stacking} />}
          {data.sources && <Sources groups={data.sources} />}
          {!body && <T style={s.lead}>No sections selected.</T>}
          </View>
          <Footer data={data} />
        </Page>
      )}
    </Document>
  );
}
