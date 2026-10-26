import type { GateId, GateParams, GateRef, Profile } from '@/lib/schema';
import { EVIDENCE_LEVELS, FUNDING_STAGES, RESEARCH_LEVELS } from '@/lib/schema';
import { addMonthsISO, monthsBetween, todayISO } from '@/lib/dates';
import {
  EVIDENCE_LABELS, FUNDING_STAGE_LABELS, RESEARCH_LABELS, SECTOR_LABELS, STACK_LABELS,
  capitalise, inState, listOr,
} from '@/lib/format';

export type Severity = 'hard' | 'soft';
export type GateOutcome = 'pass' | 'fail' | 'unknown';
export type GateResult = {
  id: GateId; label: string; severity: Severity; result: GateOutcome;
  reason: string; fix?: string; fixable: boolean;
};
type Eval = Pick<GateResult, 'result' | 'reason' | 'fix' | 'fixable'>;
type Ctx = { now: Date };
type Def<G extends GateId> = {
  severity: Severity;
  label: (p: GateParams<G>) => string;
  evaluate: (pr: Profile, p: GateParams<G>, ctx: Ctx) => Eval;
};
type Defs = { [G in GateId]: Def<G> };
/** Params as they arrive at runtime; validated by GateRefSchema when programs are parsed. */
type LooseParams = Record<string, unknown>;
type AnyDef = { severity: Severity; label: (p: LooseParams) => string; evaluate: (pr: Profile, p: LooseParams, ctx: Ctx) => Eval };

const pass = (reason: string): Eval => ({ result: 'pass', reason, fixable: false });
const fail = (reason: string, fix?: string, fixable = false): Eval => ({ result: 'fail', reason, fix, fixable });
const unknown = (reason: string, fix?: string): Eval => ({ result: 'unknown', reason, fix, fixable: true });

const money = (n: number) => n >= 1_000_000 ? `$${n / 1_000_000}M` : `$${Math.round(n / 1000)}K`;

const TURNOVER: Record<NonNullable<Profile['turnover']>, [number, number]> = {
  'under-1m': [0, 1e6], '1m-10m': [1e6, 1e7], '10m-20m': [1e7, 2e7], '20m-50m': [2e7, 5e7], 'over-50m': [5e7, Infinity],
};
const RD_SPEND: Record<NonNullable<Profile['rdSpend']>, [number, number]> = {
  'under-20k': [0, 2e4], '20k-100k': [2e4, 1e5], '100k-500k': [1e5, 5e5], 'over-500k': [5e5, Infinity],
};
const CASH: Record<NonNullable<Profile['cashMatch']>, [number, number]> = {
  none: [0, 0], 'under-20k': [0, 2e4], '20k-60k': [2e4, 6e4], '60k-250k': [6e4, 2.5e5], 'over-250k': [2.5e5, Infinity],
};

/** Unanswered asks for the answer (naming `label.topic`); only a "no" gets the remedy `fix`. */
function bool(v: boolean | undefined, label: { yes: string; no: string; ask: string; topic: string }, fix?: string, fixable = true): Eval {
  if (v === undefined) return unknown(label.ask, `Answer the ${label.topic} question in the assessment`);
  return v ? pass(label.yes) : fail(label.no, fix, fixable);
}

function turnoverUnder(pr: Profile, aud: number): Eval {
  if (!pr.turnover) return unknown('Turnover not answered', 'Add your aggregated turnover band');
  const [lo, hi] = TURNOVER[pr.turnover];
  if (hi <= aud) return pass(`Turnover is under ${money(aud)}`);
  if (lo >= aud) return fail(`Turnover is ${money(aud)} or more`);
  return unknown(`Your turnover band straddles ${money(aud)}`, 'Confirm aggregated turnover with your accountant');
}

/** "Within N months": date on or after the same calendar day N months ago (inclusive). */
function withinMonths(date: string, months: number, now: Date): boolean {
  return date >= addMonthsISO(todayISO(now), -months);
}

function ageText(date: string, now: Date): string {
  return `${monthsBetween(date, todayISO(now))} months ago`;
}

function incorporatedWithin(pr: Profile, months: number, now: Date): Eval {
  if (!pr.incorporatedOn) return unknown('Incorporation date not answered', 'Add your incorporation date');
  const age = monthsBetween(pr.incorporatedOn, todayISO(now));
  if (withinMonths(pr.incorporatedOn, months, now)) return pass(`Incorporated ${age} months ago`);
  return fail(age > months ? `Incorporated ${age} months ago (limit ${months})` : `Incorporated more than ${months} months ago`);
}

/** "Under Y years old": incorporated strictly after the same calendar day Y years ago. */
function youngerThanYears(pr: Profile, years: number, now: Date): Eval {
  if (!pr.incorporatedOn) return unknown('Incorporation date not answered', 'Add your incorporation date');
  return pr.incorporatedOn > addMonthsISO(todayISO(now), -years * 12)
    ? pass(`Incorporated ${ageText(pr.incorporatedOn, now)}`)
    : fail(`Company is ${years} or more years old`);
}

/** Whole years read better than months: "5 years", "18 months". */
const monthsText = (m: number) => (m >= 24 && m % 12 === 0 ? `${m / 12} years` : `${m} months`);
const partners = (n: number) => `${n} industry partner${n === 1 ? '' : 's'}`;
const withArticle = (s: string) => `${/^[aeiou]/i.test(s) ? 'an' : 'a'} ${s}`;

/** The stage just before `stage`, as "Series A or earlier"; "no funding yet" when nothing comes before. */
function stageBefore(stage: (typeof FUNDING_STAGES)[number]): string {
  const prev = FUNDING_STAGES[FUNDING_STAGES.indexOf(stage) - 1];
  return !prev || prev === 'none' ? 'no funding yet' : `${FUNDING_STAGE_LABELS[prev]} or earlier`;
}

export const GATES: Defs = {
  'au-entity': { severity: 'hard', label: () => 'Australian company (ACN)',
    evaluate: (pr) => bool(pr.hasAcn, { yes: 'Has an ACN', no: 'No Australian company yet', ask: 'ACN not answered', topic: 'ACN' }, 'Register a Pty Ltd company') },
  'gst-registered': { severity: 'hard', label: () => 'Registered for GST',
    evaluate: (pr) => bool(pr.gstRegistered, { yes: 'Registered for GST', no: 'Not registered for GST', ask: 'GST not answered', topic: 'GST' }, 'Register for GST with the ATO') },
  'not-foreign-subsidiary': { severity: 'hard', label: () => 'Not a subsidiary of a foreign company',
    evaluate: (pr) => pr.foreignSubsidiary === undefined ? unknown('Ownership not answered')
      : pr.foreignSubsidiary ? fail('Australian subsidiaries of foreign entities are excluded') : pass('Not a foreign subsidiary') },
  'incorporated-within': { severity: 'hard', label: (p) => `Incorporated within ${monthsText(p.months)}`,
    evaluate: (pr, p, { now }) => incorporatedWithin(pr, p.months, now) },
  'turnover-under': { severity: 'hard', label: (p) => `Turnover under ${money(p.aud)}`,
    evaluate: (pr, p) => turnoverUnder(pr, p.aud) },
  'turnover-or-age': { severity: 'hard', label: (p) => `Turnover under ${money(p.turnoverUnder)} or under ${p.yearsUnder} years old`,
    evaluate: (pr, p, { now }) => {
      const t = turnoverUnder(pr, p.turnoverUnder);
      const a = youngerThanYears(pr, p.yearsUnder, now);
      if (t.result === 'pass' || a.result === 'pass') return pass(t.result === 'pass' ? t.reason : a.reason);
      if (t.result === 'fail' && a.result === 'fail') return fail(`${t.reason}, and ${a.reason.toLowerCase()}`);
      if (t.result === 'unknown' && a.result === 'unknown') return unknown('Need turnover and incorporation date to check', 'Answer turnover and incorporation date');
      return t.result === 'unknown' ? t : a; // exactly one sub-check is unknown and the other failed
    } },
  'product-company': { severity: 'hard', label: () => 'Owns a software product (not a consultancy)',
    evaluate: (pr) => !pr.businessModel ? unknown('Business model not answered')
      : pr.businessModel === 'services' ? fail('Consultancies and agencies are excluded')
      : pass(pr.businessModel === 'mixed' ? 'Apply with the product, not the services work' : 'Product company') },
  'vc-funded': { severity: 'hard', label: () => 'Backed by venture capital',
    evaluate: (pr) => {
      const v = pr.vcBacked ?? (pr.persona === 'vc-backed' ? true : pr.persona ? false : undefined);
      if (v === undefined) return unknown('Funding not answered');
      if (v) return pass('VC-backed');
      return pr.persona === 'pre-raise'
        ? fail('Needs institutional VC funding', 'Available once you close a VC-led round', true)
        : fail('Needs institutional VC funding; angel money, grants and bootstrapping do not count');
    } },
  'vc-or-accelerator': { severity: 'hard', label: () => 'Backed by a VC or accelerator partner',
    evaluate: (pr) => {
      const vc = pr.vcBacked ?? (pr.persona ? pr.persona === 'vc-backed' : undefined);
      if (vc || pr.acceleratorMember) return pass('Has a VC or accelerator relationship');
      if (vc === false && pr.acceleratorMember === false)
        return fail('Needs an Org ID from a partner VC or accelerator', 'Join an accelerator or VC that is an Activate Provider', true);
      return unknown('VC or accelerator membership not answered');
    } },
  'funding-stage-before': { severity: 'hard', label: (p) => `Funding stage: ${stageBefore(p.stage)}`,
    evaluate: (pr, p) => {
      if (!pr.fundingStage) return unknown('Funding stage not answered');
      return FUNDING_STAGES.indexOf(pr.fundingStage) < FUNDING_STAGES.indexOf(p.stage)
        ? pass(`Funding stage: ${FUNDING_STAGE_LABELS[pr.fundingStage]}`) : fail(`Only for companies at ${stageBefore(p.stage)}`);
    } },
  'last-round-within': { severity: 'hard', label: () => 'Recent qualifying funding round',
    evaluate: (pr, p, { now }) => {
      const stage = pr.fundingStage;
      if (!stage) return unknown('Funding stage not answered', 'Add your funding stage');
      const rule = p.rules.find((r) => r.stages.includes(stage));
      if (!rule) {
        const reason = stage === 'none' ? 'Needs a qualifying funding round' : `${capitalise(withArticle(FUNDING_STAGE_LABELS[stage]))} round does not qualify`;
        return pr.persona === 'pre-raise' ? fail(reason, 'Available once you close a qualifying round', true) : fail(reason);
      }
      if (!pr.lastRoundOn) return unknown('Last round date not answered', 'Add the date your last round closed');
      const age = monthsBetween(pr.lastRoundOn, todayISO(now));
      if (withinMonths(pr.lastRoundOn, rule.months, now)) return pass(`Last round ${age} months ago`);
      return fail(age > rule.months ? `Last round ${age} months ago (limit ${rule.months})` : `Last round more than ${rule.months} months ago`);
    } },
  'prior-credits-max': { severity: 'hard',
    label: (p) => p.usd === 0 ? `No prior ${STACK_LABELS[p.provider]} credits`
      : `No more than US$${p.usd.toLocaleString('en-AU')} in prior ${STACK_LABELS[p.provider]} credits`,
    evaluate: (pr, p) => {
      const v = pr.priorCreditsUsd?.[p.provider];
      if (v === undefined) return unknown(`Prior ${STACK_LABELS[p.provider]} credits not answered`);
      return v <= p.usd ? pass('Within the prior-credit limit') : fail(`Already received US$${v.toLocaleString('en-AU')} in credits`);
    } },
  'cash-match': { severity: 'hard', label: (p) => `Cash to match at least ${money(p.min)}`,
    evaluate: (pr, p) => {
      if (!pr.cashMatch) return unknown('Matching cash not answered');
      const [lo, hi] = CASH[pr.cashMatch];
      if (lo >= p.min) return pass('Enough cash to match');
      if (hi <= p.min) return fail(`Needs at least ${money(p.min)} in cash`, 'Budget the match before applying', true);
      return unknown('Your cash band may not cover the match', 'Confirm available cash');
    } },
  'rd-spend-over': { severity: 'hard', label: (p) => `R&D spend over ${money(p.aud)}`,
    evaluate: (pr, p) => {
      if (!pr.rdSpend) return unknown('R&D spend not answered');
      const [lo, hi] = RD_SPEND[pr.rdSpend];
      if (lo >= p.aud) return pass('R&D spend above the minimum');
      if (hi <= p.aud) return fail(`R&D spend must exceed ${money(p.aud)}`, 'Below the minimum, only spend with a registered research service provider counts', true);
      return unknown('R&D spend band straddles the minimum');
    } },
  'experimental-activities': { severity: 'hard', label: () => 'Genuinely experimental activities',
    evaluate: (pr) => bool(pr.experimental, { yes: 'Has experimental activities', no: 'No technical uncertainty being resolved', ask: 'Experimental work not answered', topic: 'experimental work' }, undefined, false) },
  'contemporaneous-records': { severity: 'soft', label: () => 'Keeps R&D records as work happens',
    evaluate: (pr) => bool(pr.contemporaneousRecords, { yes: 'Keeps contemporaneous records', no: 'No contemporaneous R&D records', ask: 'Record-keeping not answered', topic: 'R&D records' }, 'Log hypotheses, experiments and results now') },
  'research-partner': { severity: 'hard',
    label: (p) => `Research partner: ${RESEARCH_LABELS[p.min]}${p.min === 'formal' ? '' : ' or stronger'}`,
    evaluate: (pr, p) => {
      if (!pr.researchPartner) return unknown('Research partner not answered');
      return RESEARCH_LEVELS.indexOf(pr.researchPartner) >= RESEARCH_LEVELS.indexOf(p.min)
        ? pass(`Research relationship: ${RESEARCH_LABELS[pr.researchPartner]}`) : fail('Needs a committed research partner', 'Start talks with a university or CSIRO', true);
    } },
  'industry-partners': { severity: 'hard', label: (p) => `At least ${partners(p.count)}`,
    evaluate: (pr, p) => pr.industryPartners === undefined ? unknown('Industry partners not answered')
      : pr.industryPartners >= p.count ? pass(partners(pr.industryPartners)) : fail(`Needs ${partners(p.count)}`, 'Secure committed partners', true) },
  'state-is': { severity: 'hard', label: (p) => `Based ${inState(p.state)}`,
    evaluate: (pr, p) => !pr.state ? unknown('State not answered')
      : pr.state === p.state ? pass(`Based ${inState(p.state)}`) : fail(`Only for companies based ${inState(p.state)}`) },
  'sector-any': { severity: 'hard', label: (p) => `Sector: ${listOr(p.sectors.map((s) => SECTOR_LABELS[s]))}`,
    evaluate: (pr, p) => !pr.sectors?.length ? unknown('Sectors not answered')
      : pr.sectors.some((s) => p.sectors.includes(s)) ? pass('Sector matches') : fail('Sector does not match') },
  'women-led': { severity: 'hard', label: () => 'Women-led or women founder',
    evaluate: (pr) => pr.womenLed === 'yes' ? pass('Women-led') : pr.womenLed === 'no' ? fail('Only for women-led startups')
      : unknown('Optional question not answered') },
  'has-mvp': { severity: 'hard', label: () => 'Working MVP',
    evaluate: (pr) => bool(pr.hasMvp, { yes: 'Has a working MVP', no: 'No working MVP yet', ask: 'MVP not answered', topic: 'MVP' }, 'Ship a working MVP first') },
  'has-website': { severity: 'soft', label: () => 'Working website',
    evaluate: (pr) => bool(pr.hasWebsite, { yes: 'Has a website', no: 'No working website', ask: 'Website not answered', topic: 'website' }, 'Publish a simple website on your company domain') },
  'customer-evidence-at-least': { severity: 'hard',
    label: (p) => p.level === 'revenue' ? 'Paying customers' : `${capitalise(EVIDENCE_LABELS[p.level])} or stronger customer evidence`,
    evaluate: (pr, p) => !pr.customerEvidence ? unknown('Customer evidence not answered')
      : EVIDENCE_LEVELS.indexOf(pr.customerEvidence) >= EVIDENCE_LEVELS.indexOf(p.level) ? pass(`Customer evidence: ${EVIDENCE_LABELS[pr.customerEvidence]}`)
      : fail(`Needs ${EVIDENCE_LABELS[p.level]}`, 'Secure a paid pilot', true) },
  'uses-stack': { severity: 'soft', label: (p) => `Uses ${STACK_LABELS[p.tech]}`,
    evaluate: (pr, p) => {
      const tech = STACK_LABELS[p.tech];
      return !pr.stack ? unknown('Tech stack not answered')
        : pr.stack.includes(p.tech) ? pass(`Uses ${tech}`) : fail(`Expects ${tech} in the product`, `Only worth it if ${tech} fits your architecture`, true);
    } },
};

export function normaliseRef(ref: GateRef): { id: GateId; severity?: Severity; note?: string; params: LooseParams } {
  if (typeof ref === 'string') return { id: ref, params: {} };
  const { id, severity, note, ...params } = ref;
  return { id, severity, note, params };
}

/** What a gate checks, without evaluating it: for listing a program's eligibility before an assessment. */
export function describeGate(ref: GateRef): { id: GateId; label: string; severity: Severity; note?: string } {
  const { id, severity, note, params } = normaliseRef(ref);
  const def = GATES[id] as unknown as AnyDef;
  return { id, label: def.label(params), severity: severity ?? def.severity, note };
}

export function evaluateGate(ref: GateRef, profile: Profile, ctx: Ctx): GateResult {
  const { id, severity, note, params } = normaliseRef(ref);
  const def = GATES[id] as unknown as AnyDef;
  const out = def.evaluate(profile, params, ctx);
  const reason = out.result === 'fail' && note ? `${out.reason}. ${note}` : out.reason;
  return { id, label: def.label(params), severity: severity ?? def.severity, ...out, reason };
}

export const evaluateGates = (refs: GateRef[], profile: Profile, ctx: Ctx) => refs.map((r) => evaluateGate(r, profile, ctx));
