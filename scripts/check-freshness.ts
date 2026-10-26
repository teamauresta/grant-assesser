/**
 * Weekly program-data freshness check.
 *
 * Run with `pnpm freshness`. Prints a Markdown report to stdout and always exits 0; the
 * freshness workflow posts the output to a single GitHub issue. It never writes files.
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Program } from '@/lib/schema';
import { MELBOURNE, daysBetween, todayISO } from '@/lib/dates';
import { STALE_DAYS, deriveStatus, hasPastCloseOnly, resolveDeadlines } from '@/lib/status';

export const CLOSING_WITHIN_DAYS = 30;
export const LINK_TIMEOUT_MS = 15_000;
export const LINK_CONCURRENCY = 4;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

export type LinkOutcome = 'ok' | 'blocked' | 'broken';
export type LinkResult = { url: string; status: number | 'error'; outcome: LinkOutcome; error?: string };
export type FreshnessRow = { name: string; slug: string; detail: string; link: string };
export type FreshnessReport = {
  stale: FreshnessRow[];
  closingSoon: FreshnessRow[];
  pastCloseNeedsDecision: FreshnessRow[];
  brokenLinks: FreshnessRow[];
  blockedLinks: FreshnessRow[];
  okLinks: number;
  linksChecked: number;
  markdown: string;
};

/** ok = 2xx/3xx; blocked = the site refuses scripted requests (check by hand); broken = gone or failing. */
export function classifyStatus(status: number | 'error'): LinkOutcome {
  if (status === 'error') return 'broken';
  if (status >= 200 && status < 400) return 'ok';
  if (status === 401 || status === 403 || status === 429) return 'blocked';
  return 'broken';
}

/** The source a reviewer should open first: the first official one, else the first listed. */
function primarySource(p: Program): string {
  return (p.verification.sources.find((s) => s.official) ?? p.verification.sources[0]).url;
}

function describeLink(r: LinkResult): string {
  if (r.status === 'error') return `Network error${r.error ? `: ${r.error}` : ''}`;
  return `HTTP ${r.status}`;
}

const NEEDS_DECISION: ReadonlyArray<Program['status']['state']> = ['upcoming', 'paused', 'unverified'];

/** Pure: builds the report from programs, a fixed "now" and already-fetched link results. */
export function freshnessReport(programs: Program[], now: Date, linkResults: LinkResult[]): FreshnessReport {
  const today = todayISO(now);
  const byUrl = new Map(linkResults.map((r) => [r.url, r]));
  const stale: FreshnessRow[] = [];
  const closingSoon: FreshnessRow[] = [];
  const pastCloseNeedsDecision: FreshnessRow[] = [];
  const brokenLinks: FreshnessRow[] = [];
  const blockedLinks: FreshnessRow[] = [];

  for (const p of programs) {
    const row = (detail: string, link = primarySource(p)): FreshnessRow => ({ name: p.name, slug: p.slug, detail, link });
    const status = deriveStatus(p, now);

    if (status.stale) {
      stale.push(row(`Last verified ${p.verification.lastVerified} (${status.daysSinceVerified} days ago)`));
    }

    if (p.status.state !== 'closed') {
      const nextClose = resolveDeadlines(p, now).find((d) => d.kind === 'close' && d.at.getTime() > now.getTime());
      if (nextClose) {
        const days = daysBetween(today, todayISO(nextClose.at, MELBOURNE));
        if (days <= CLOSING_WITHIN_DAYS) {
          // Days count to the Melbourne calendar date (as on the site); show the declared local time and zone.
          const when = [nextClose.date, nextClose.time, nextClose.tz !== MELBOURNE ? nextClose.tz : undefined].filter(Boolean).join(' ');
          closingSoon.push(row(`${nextClose.label}: ${when} (in ${days} days)`));
        }
      }
    }

    if (NEEDS_DECISION.includes(p.status.state) && hasPastCloseOnly(p, now)) {
      const last = resolveDeadlines(p, now).filter((d) => d.kind === 'close').at(-1)!;
      pastCloseNeedsDecision.push(
        row(`Declared ${p.status.state}; last close ${last.date} has passed. Update to closed, reopening or a new round.`),
      );
    }

    for (const s of p.verification.sources) {
      const r = byUrl.get(s.url);
      if (r?.outcome === 'broken') brokenLinks.push(row(`${s.title}: ${describeLink(r)}`, s.url));
      if (r?.outcome === 'blocked') blockedLinks.push(row(`${s.title}: ${describeLink(r)}`, s.url));
    }
  }

  const okLinks = linkResults.filter((r) => r.outcome === 'ok').length;
  const report = { stale, closingSoon, pastCloseNeedsDecision, brokenLinks, blockedLinks, okLinks, linksChecked: linkResults.length };
  return { ...report, markdown: renderMarkdown(report, programs.length, today) };
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function section(title: string, rows: FreshnessRow[], intro: string): string {
  const head = `## ${title} (${rows.length})\n\n${intro}\n`;
  if (!rows.length) return `${head}\nNone.\n`;
  const lines = rows.map((r) => `| ${cell(r.name)} | \`${r.slug}\` | ${cell(r.detail)} | ${cell(r.link)} |`);
  return `${head}\n| Program | Slug | Detail | Link |\n| --- | --- | --- | --- |\n${lines.join('\n')}\n`;
}

function renderMarkdown(r: Omit<FreshnessReport, 'markdown'>, programCount: number, today: string): string {
  const linksChecked = r.linksChecked > 0;
  const summary = [
    `- Programs checked: ${programCount}`,
    `- Stale (verified more than ${STALE_DAYS} days ago): ${r.stale.length}`,
    `- Closing within ${CLOSING_WITHIN_DAYS} days: ${r.closingSoon.length}`,
    `- Past close, needs a decision: ${r.pastCloseNeedsDecision.length}`,
    linksChecked
      ? `- Source links: ${r.linksChecked} checked, ${r.okLinks} ok, ${r.brokenLinks.length} broken, ${r.blockedLinks.length} blocked`
      : '- Source links: not checked',
  ];
  return [
    `# Program data freshness`,
    '',
    `Checked ${today} (Melbourne). Generated by \`pnpm freshness\`; this issue is updated weekly and the site is never changed by this check.`,
    '',
    summary.join('\n'),
    '',
    section('Stale', r.stale, `Re-verify against the official source, then bump \`verification.lastVerified\` and add a changelog entry.`),
    section('Closing within 30 days', r.closingSoon, 'Confirm the date is still correct on the official page.'),
    section(
      'Past close, needs a decision',
      r.pastCloseNeedsDecision,
      'These programs are not closed automatically. Decide whether each is closed, reopening or replaced by a new round.',
    ),
    linksChecked
      ? section('Broken links', r.brokenLinks, 'Not found, server error or network failure (rows are per program source).')
      : '## Broken links (0)\n\nLinks were not checked in this run.\n',
    linksChecked
      ? section(
          'Blocked links, check manually',
          r.blockedLinks,
          'The site refused a scripted request (401, 403 or 429). This is usually bot protection, not a broken link: open it in a browser.',
        )
      : '## Blocked links, check manually (0)\n\nLinks were not checked in this run.\n',
  ].join('\n');
}

/** GET with a browser-like User-Agent, following redirects, with a 15-second timeout. */
export async function checkLink(url: string): Promise<LinkResult> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
    });
    await res.body?.cancel().catch(() => {});
    return { url, status: res.status, outcome: classifyStatus(res.status) };
  } catch (err) {
    const e = err as Error & { cause?: { code?: string } };
    const error = e.name === 'TimeoutError' ? `timed out after ${LINK_TIMEOUT_MS / 1000}s` : (e.cause?.code ?? e.message);
    return { url, status: 'error', outcome: 'broken', error };
  }
}

export async function checkLinks(urls: string[], concurrency = LINK_CONCURRENCY): Promise<LinkResult[]> {
  const results: LinkResult[] = new Array(urls.length);
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const i = next++;
      results[i] = await checkLink(urls[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return results;
}

async function main() {
  const { PROGRAMS } = await import('@/content/programs');
  const urls = [...new Set(PROGRAMS.flatMap((p) => p.verification.sources.map((s) => s.url)))];
  const links = await checkLinks(urls);
  process.stdout.write(freshnessReport(PROGRAMS, new Date(), links).markdown);
}

const isEntry = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isEntry) {
  main().catch((err) => {
    // Still exit 0: the report is advisory and must not fail the scheduled workflow.
    console.error(err);
    process.stdout.write(`# Program data freshness\n\nThe check failed to run: ${String(err)}\n`);
  });
}
