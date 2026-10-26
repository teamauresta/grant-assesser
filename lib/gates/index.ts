import type { GateId, GateRef, Profile } from '@/lib/schema';
import { FUNDING_STAGES } from '@/lib/schema';
import { monthsBetween, todayISO } from '@/lib/dates';

export type Severity = 'hard' | 'soft';
export type GateOutcome = 'pass' | 'fail' | 'unknown';
export type GateResult = {
  id: GateId; label: string; severity: Severity; result: GateOutcome;
  reason: string; fix?: string; fixable: boolean;
};
type Eval = Pick<GateResult, 'result' | 'reason' | 'fix' | 'fixable'>;
type Ctx = { now: Date };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = Record<string, any>;
type Def = { severity: Severity; label: (p: Params) => string; evaluate: (pr: Profile, p: Params, ctx: Ctx) => Eval };

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
const RESEARCH = ['none', 'informal', 'active', 'formal'] as const;
const EVIDENCE = ['none', 'interviews', 'pilots', 'revenue'] as const;

function bool(v: boolean | undefined, label: { yes: string; no: string; ask: string }, fix?: string, fixable = true): Eval {
  if (v === undefined) return unknown(label.ask, fix);
  return v ? pass(label.yes) : fail(label.no, fix, fixable);
}

function turnoverUnder(pr: Profile, aud: number): Eval {
  if (!pr.turnover) return unknown('Turnover not answered', 'Add your aggregated turnover band');
  const [lo, hi] = TURNOVER[pr.turnover];
  if (hi <= aud) return pass(`Turnover is under ${money(aud)}`);
  if (lo >= aud) return fail(`Turnover is ${money(aud)} or more`);
  return unknown(`Your turnover band straddles ${money(aud)}`, 'Confirm aggregated turnover with your accountant');
}

function incorporatedWithin(pr: Profile, months: number, now: Date): Eval {
  if (!pr.incorporatedOn) return unknown('Incorporation date not answered', 'Add your incorporation date');
  const age = monthsBetween(pr.incorporatedOn, todayISO(now));
  return age <= months ? pass(`Incorporated ${age} months ago`) : fail(`Incorporated ${age} months ago (limit ${months})`);
}

export const GATES: Record<GateId, Def> = {
  'au-entity': { severity: 'hard', label: () => 'Australian company (ACN)',
    evaluate: (pr) => bool(pr.hasAcn, { yes: 'Has an ACN', no: 'No Australian company yet', ask: 'ACN not answered' }, 'Register a Pty Ltd company') },
  'gst-registered': { severity: 'hard', label: () => 'Registered for GST',
    evaluate: (pr) => bool(pr.gstRegistered, { yes: 'Registered for GST', no: 'Not registered for GST', ask: 'GST not answered' }, 'Register for GST with the ATO') },
  'not-foreign-subsidiary': { severity: 'hard', label: () => 'Not a subsidiary of a foreign company',
    evaluate: (pr) => pr.foreignSubsidiary === undefined ? unknown('Ownership not answered')
      : pr.foreignSubsidiary ? fail('Australian subsidiaries of foreign entities are excluded') : pass('Not a foreign subsidiary') },
  'incorporated-within': { severity: 'hard', label: (p) => `Incorporated within ${p.months} months`,
    evaluate: (pr, p, { now }) => incorporatedWithin(pr, p.months, now) },
  'turnover-under': { severity: 'hard', label: (p) => `Turnover under ${money(p.aud)}`,
    evaluate: (pr, p) => turnoverUnder(pr, p.aud) },
  'turnover-or-age': { severity: 'hard', label: (p) => `Turnover under ${money(p.turnoverUnder)} or under ${p.yearsUnder} years old`,
    evaluate: (pr, p, { now }) => {
      const t = turnoverUnder(pr, p.turnoverUnder);
      const a = incorporatedWithin(pr, p.yearsUnder * 12 - 1, now);
      if (t.result === 'pass' || a.result === 'pass') return pass(t.result === 'pass' ? t.reason : a.reason);
      if (t.result === 'fail' && a.result === 'fail') return fail(`${t.reason}, and ${a.reason.toLowerCase()}`);
      return unknown('Need turnover and incorporation date to check', 'Answer turnover and incorporation date');
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
      const vc = pr.vcBacked ?? (pr.persona === 'vc-backed' ? true : undefined);
      if (vc || pr.acceleratorMember) return pass('Has a VC or accelerator relationship');
      if (vc === false && pr.acceleratorMember === false)
        return fail('Needs an Org ID from a partner VC or accelerator', 'Join an accelerator or VC that is an Activate Provider', true);
      return unknown('VC or accelerator membership not answered');
    } },
  'funding-stage-before': { severity: 'hard', label: (p) => `Raised less than ${p.stage}`,
    evaluate: (pr, p) => {
      if (!pr.fundingStage) return unknown('Funding stage not answered');
      return FUNDING_STAGES.indexOf(pr.fundingStage) < FUNDING_STAGES.indexOf(p.stage)
        ? pass(`Stage: ${pr.fundingStage}`) : fail(`Must be before ${p.stage}`);
    } },
  'last-round-within': { severity: 'hard', label: () => 'Recent qualifying funding round',
    evaluate: (pr, p, { now }) => {
      if (!pr.fundingStage || !pr.lastRoundOn) return unknown('Funding stage or last round date not answered');
      const rule = (p.rules as { stages: string[]; months: number }[]).find((r) => r.stages.includes(pr.fundingStage!));
      if (!rule) return fail(`A ${pr.fundingStage} round does not qualify`);
      const age = monthsBetween(pr.lastRoundOn, todayISO(now));
      return age <= rule.months ? pass(`Last round ${age} months ago`) : fail(`Last round ${age} months ago (limit ${rule.months})`);
    } },
  'prior-credits-max': { severity: 'hard', label: (p) => `No more than US$${p.usd.toLocaleString('en-AU')} prior ${p.provider.toUpperCase()} credits`,
    evaluate: (pr, p) => {
      const v = pr.priorCreditsUsd?.[p.provider as 'aws' | 'azure' | 'gcp'];
      if (v === undefined) return unknown(`Prior ${p.provider.toUpperCase()} credits not answered`);
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
    evaluate: (pr) => bool(pr.experimental, { yes: 'Has experimental activities', no: 'No technical uncertainty being resolved', ask: 'Experimental work not answered' }, undefined, false) },
  'contemporaneous-records': { severity: 'soft', label: () => 'Keeps R&D records as work happens',
    evaluate: (pr) => bool(pr.contemporaneousRecords, { yes: 'Keeps contemporaneous records', no: 'No contemporaneous R&D records', ask: 'Record-keeping not answered' }, 'Log hypotheses, experiments and results now') },
  'research-partner': { severity: 'hard', label: (p) => `Research partner (${p.min} or better)`,
    evaluate: (pr, p) => {
      if (!pr.researchPartner) return unknown('Research partner not answered');
      return RESEARCH.indexOf(pr.researchPartner) >= RESEARCH.indexOf(p.min)
        ? pass(`Research relationship: ${pr.researchPartner}`) : fail('Needs a committed research partner', 'Start talks with a university or CSIRO', true);
    } },
  'industry-partners': { severity: 'hard', label: (p) => `At least ${p.count} industry partner(s)`,
    evaluate: (pr, p) => pr.industryPartners === undefined ? unknown('Industry partners not answered')
      : pr.industryPartners >= p.count ? pass(`${pr.industryPartners} industry partner(s)`) : fail(`Needs ${p.count} industry partner(s)`, 'Secure committed partners', true) },
  'state-is': { severity: 'hard', label: (p) => `Based in ${String(p.state).toUpperCase()}`,
    evaluate: (pr, p) => !pr.state ? unknown('State not answered')
      : pr.state === p.state ? pass(`Based in ${p.state.toUpperCase()}`) : fail(`Only for ${p.state.toUpperCase()} companies`) },
  'sector-any': { severity: 'hard', label: (p) => `Sector: ${(p.sectors as string[]).join(' / ')}`,
    evaluate: (pr, p) => !pr.sectors?.length ? unknown('Sectors not answered')
      : pr.sectors.some((s) => (p.sectors as string[]).includes(s)) ? pass('Sector matches') : fail('Sector does not match') },
  'women-led': { severity: 'hard', label: () => 'Women-led or women founder',
    evaluate: (pr) => pr.womenLed === 'yes' ? pass('Women-led') : pr.womenLed === 'no' ? fail('Only for women-led startups')
      : unknown('Optional question not answered') },
  'has-mvp': { severity: 'hard', label: () => 'Working MVP',
    evaluate: (pr) => bool(pr.hasMvp, { yes: 'Has a working MVP', no: 'No working MVP yet', ask: 'MVP not answered' }, 'Ship a working MVP first') },
  'has-website': { severity: 'soft', label: () => 'Working website',
    evaluate: (pr) => bool(pr.hasWebsite, { yes: 'Has a website', no: 'No working website', ask: 'Website not answered' }, 'Publish a simple website on your company domain') },
  'customer-evidence-at-least': { severity: 'hard', label: (p) => `Customer evidence: ${p.level} or better`,
    evaluate: (pr, p) => !pr.customerEvidence ? unknown('Customer evidence not answered')
      : EVIDENCE.indexOf(pr.customerEvidence) >= EVIDENCE.indexOf(p.level) ? pass(`Evidence: ${pr.customerEvidence}`)
      : fail(`Needs ${p.level}`, 'Secure a paid pilot', true) },
  'uses-stack': { severity: 'soft', label: (p) => `Uses ${p.tech}`,
    evaluate: (pr, p) => !pr.stack ? unknown('Tech stack not answered')
      : pr.stack.includes(p.tech) ? pass(`Uses ${p.tech}`) : fail(`Expects ${p.tech} in the product`, `Only worth it if ${p.tech} fits your architecture`, true) },
};

export function normaliseRef(ref: GateRef): { id: GateId; severity?: Severity; params: Params } {
  if (typeof ref === 'string') return { id: ref, params: {} };
  const { id, severity, ...params } = ref as { id: GateId; severity?: Severity } & Params;
  return { id, severity, params };
}

export function evaluateGate(ref: GateRef, profile: Profile, ctx: Ctx): GateResult {
  const { id, severity, params } = normaliseRef(ref);
  const def = GATES[id];
  return { id, label: def.label(params), severity: severity ?? def.severity, ...def.evaluate(profile, params, ctx) };
}

export const evaluateGates = (refs: GateRef[], profile: Profile, ctx: Ctx) => refs.map((r) => evaluateGate(r, profile, ctx));
