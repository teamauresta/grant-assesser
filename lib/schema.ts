import { z } from 'zod';
import { parseISODate, toISODate } from '@/lib/dates';

const isoDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((s) => toISODate(parseISODate(s)) === s, 'Not a real calendar date');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM between 00:00 and 23:59');
const httpUrl = z.url({ protocol: /^https?$/ });
const score = z.number().min(0).max(5);

export const PERSONAS = ['bootstrapped', 'pre-raise', 'vc-backed'] as const;
export const Persona = z.enum(PERSONAS);
export type Persona = z.infer<typeof Persona>;

export const STATES = ['vic', 'nsw', 'qld', 'wa', 'sa', 'tas', 'act', 'nt'] as const;
export const SECTORS = ['energy', 'health', 'manufacturing', 'construction', 'agriculture', 'defence', 'fintech', 'education', 'social-impact', 'other'] as const;
export const STACK = ['aws', 'azure', 'gcp', 'gemini', 'nvidia', 'cloudflare', 'openai', 'anthropic'] as const;
export const FUNDING_STAGES = ['none', 'angel', 'pre-seed', 'seed', 'series-a', 'series-b', 'series-c-plus'] as const;
export const RESEARCH_LEVELS = ['none', 'informal', 'active', 'formal'] as const;
export const EVIDENCE_LEVELS = ['none', 'interviews', 'pilots', 'revenue'] as const;
export const CREDIT_PROVIDERS = ['aws', 'azure', 'gcp'] as const;

export const GATE_IDS = [
  'au-entity', 'gst-registered', 'not-foreign-subsidiary', 'incorporated-within', 'turnover-under',
  'turnover-or-age', 'product-company', 'vc-funded', 'vc-or-accelerator', 'funding-stage-before',
  'last-round-within', 'prior-credits-max', 'cash-match', 'rd-spend-over', 'experimental-activities',
  'contemporaneous-records', 'research-partner', 'industry-partners', 'state-is', 'sector-any',
  'women-led', 'has-mvp', 'has-website', 'customer-evidence-at-least', 'uses-stack',
] as const;
export const GateId = z.enum(GATE_IDS);
export type GateId = z.infer<typeof GateId>;

const refOptions = {
  severity: z.enum(['hard', 'soft']).optional(),
  /** Appended to the gate's reason when it fails, e.g. why a soft gate matters for this program. */
  note: z.string().optional(),
};
/** Strict: unknown keys are rejected, so a typo in a param name fails validation. */
const params = <T extends z.ZodRawShape>(shape: T) => z.strictObject({ ...refOptions, ...shape });
const noParams = params({});
const positiveMonths = z.number().int().positive();

/** Params each gate accepts (excluding `id`). Gates without params accept only severity/note. */
export const GATE_PARAMS = {
  'au-entity': noParams,
  'gst-registered': noParams,
  'not-foreign-subsidiary': noParams,
  'incorporated-within': params({ months: positiveMonths }),
  'turnover-under': params({ aud: z.number().positive() }),
  'turnover-or-age': params({ turnoverUnder: z.number().positive(), yearsUnder: z.number().int().positive() }),
  'product-company': noParams,
  'vc-funded': noParams,
  'vc-or-accelerator': noParams,
  'funding-stage-before': params({ stage: z.enum(FUNDING_STAGES) }),
  'last-round-within': params({
    rules: z.array(z.strictObject({ stages: z.array(z.enum(FUNDING_STAGES)).min(1), months: positiveMonths })).min(1),
  }),
  'prior-credits-max': params({ provider: z.enum(CREDIT_PROVIDERS), usd: z.number().nonnegative() }),
  'cash-match': params({ min: z.number().positive() }),
  'rd-spend-over': params({ aud: z.number().positive() }),
  'experimental-activities': noParams,
  'contemporaneous-records': noParams,
  'research-partner': params({ min: z.enum(RESEARCH_LEVELS) }),
  'industry-partners': params({ count: z.number().int().min(1) }),
  'state-is': params({ state: z.enum(STATES) }),
  'sector-any': params({ sectors: z.array(z.enum(SECTORS)).min(1) }),
  'women-led': noParams,
  'has-mvp': noParams,
  'has-website': noParams,
  'customer-evidence-at-least': params({ level: z.enum(EVIDENCE_LEVELS) }),
  'uses-stack': params({ tech: z.enum(STACK) }),
} satisfies Record<GateId, z.ZodType>;
export type GateParams<G extends GateId> = z.infer<(typeof GATE_PARAMS)[G]>;

export const GateRefSchema = z.union([
  GateId,
  z.looseObject({ id: GateId, ...refOptions }),
]).superRefine((ref, ctx) => {
  const { id, ...rest } = typeof ref === 'string' ? { id: ref } : ref;
  const r = GATE_PARAMS[id].safeParse(rest);
  if (r.success) return;
  for (const issue of r.error.issues) {
    ctx.addIssue({ code: 'custom', message: `${id}: ${issue.message}`, path: typeof ref === 'string' ? [] : issue.path });
  }
});
export type GateRef = z.infer<typeof GateRefSchema>;

const AbsoluteDeadline = z.object({
  label: z.string(), kind: z.enum(['close', 'milestone']), date: isoDate,
  time: hhmm.optional(), tz: z.string().optional(),
});
const RelativeDeadline = z.object({
  label: z.string(), kind: z.enum(['close', 'milestone']), relative: z.literal('fyEnd+10m'),
});
export const DeadlineSchema = z.union([AbsoluteDeadline, RelativeDeadline]);
export type Deadline = z.infer<typeof DeadlineSchema>;

export const ProgramSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  provider: z.string(),
  level: z.enum(['federal', 'vic', 'industry', 'university']),
  type: z.enum(['tax-incentive', 'grant', 'voucher', 'credits', 'accelerator', 'capital', 'service', 'investor-incentive']),
  benefit: z.object({
    kind: z.enum(['cash', 'tax-offset', 'credits', 'equity', 'debt', 'service', 'investor']),
    min: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
    currency: z.enum(['AUD', 'USD']),
    note: z.string(),
    consortium: z.boolean().optional(),   // award goes to a consortium; never counted as company cash
    estimator: z.literal('rdti').optional(),
  }),
  status: z.object({
    state: z.enum(['open', 'rolling', 'upcoming', 'paused', 'closed', 'unverified']),
    note: z.string().optional(),
  }),
  deadlines: z.array(DeadlineSchema),
  gates: z.array(GateRefSchema),
  scores: z.object({ funding: score, value: score, effort: score, speed: score }),
  personas: z.partialRecord(Persona, z.string()).default({}),
  goalTemplate: z.array(z.object({
    title: z.string(),
    offsetDays: z.number().int().optional(),
    beforeDeadlineBusinessDays: z.number().int().optional(),
  })).default([]),
  stacking: z.array(z.object({ with: z.string(), note: z.string() })).default([]),
  content: z.object({
    summary: z.string(),
    howToApply: z.array(z.string()),
    prepare: z.array(z.string()),
    mistakes: z.array(z.string()),
    caveats: z.array(z.string()).default([]),  // e.g. contradictory official wording
  }),
  verification: z.object({
    lastVerified: isoDate,
    sources: z.array(z.object({ url: httpUrl, title: z.string(), official: z.boolean() })).min(1),
  }),
  changelog: z.array(z.object({ date: isoDate, note: z.string() })).default([]),
});
export type Program = z.infer<typeof ProgramSchema>;
export type ProgramInput = z.input<typeof ProgramSchema>;

export const ProfileSchema = z.object({
  persona: Persona.optional(),
  companyName: z.string().optional(),
  hasAcn: z.boolean().optional(),
  gstRegistered: z.boolean().optional(),
  incorporatedOn: isoDate.optional(),
  foreignSubsidiary: z.boolean().optional(),
  state: z.enum(STATES).optional(),
  fyEndMonth: z.number().int().min(1).max(12).optional(),
  turnover: z.enum(['under-1m', '1m-10m', '10m-20m', '20m-50m', 'over-50m']).optional(),
  rdSpend: z.enum(['under-20k', '20k-100k', '100k-500k', 'over-500k']).optional(),
  experimental: z.boolean().optional(),
  contemporaneousRecords: z.boolean().optional(),
  businessModel: z.enum(['product', 'services', 'mixed']).optional(),
  hasMvp: z.boolean().optional(),
  hasWebsite: z.boolean().optional(),
  stack: z.array(z.enum(STACK)).optional(),
  fundingStage: z.enum(FUNDING_STAGES).optional(),
  vcBacked: z.boolean().optional(),
  acceleratorMember: z.boolean().optional(),
  lastRoundOn: isoDate.optional(),
  priorCreditsUsd: z.object({ aws: z.number().optional(), azure: z.number().optional(), gcp: z.number().optional() }).optional(),
  cashMatch: z.enum(['none', 'under-20k', '20k-60k', '60k-250k', 'over-250k']).optional(),
  researchPartner: z.enum(RESEARCH_LEVELS).optional(),
  industryPartners: z.number().int().min(0).optional(),
  sectors: z.array(z.enum(SECTORS)).optional(),
  customerEvidence: z.enum(EVIDENCE_LEVELS).optional(),
  founderHoursPerWeek: z.enum(['under-2', '2-5', '5-10', 'over-10']).optional(),
  urgency: z.enum(['now', '3-6m', '6-12m', 'none']).optional(),
  womenLed: z.enum(['yes', 'no', 'prefer-not']).optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const STAGES = ['considering', 'preparing', 'submitted', 'awarded', 'declined', 'withdrawn'] as const;
const timestamps = { createdAt: z.string(), updatedAt: z.string() };

export const ApplicationSchema = z.object({
  id: z.string(), programSlug: z.string().optional(), customName: z.string().optional(),
  stage: z.enum(STAGES), expectedAmount: z.number().optional(), notes: z.string().default(''), ...timestamps,
});
export type Application = z.infer<typeof ApplicationSchema>;

export const GoalSchema = z.object({
  id: z.string(), applicationId: z.string().optional(), title: z.string(), dueDate: isoDate.optional(),
  status: z.enum(['todo', 'doing', 'done', 'blocked']),
  steps: z.array(z.object({ id: z.string(), title: z.string(), done: z.boolean() })).default([]),
  reminderOffsetsDays: z.array(z.number().int().nonnegative()).default([7, 1]),
  source: z.enum(['template', 'user', 'persona']), sequence: z.number().int().default(0), ...timestamps,
});
export type Goal = z.infer<typeof GoalSchema>;

export const WorkspaceSchema = z.object({
  schemaVersion: z.literal(1),
  workspaceId: z.string(),
  profile: ProfileSchema,
  pipeline: z.array(ApplicationSchema),
  goals: z.array(GoalSchema),
  settings: z.object({
    theme: z.enum(['system', 'light', 'dark']).default('system'),
    remindersDefault: z.array(z.number().int()).default([7, 1]),
  }),
  lastExportedAt: z.string().optional(),
  lastCalendarExportAt: z.string().optional(),
  changesSinceCalendarExport: z.number().int().default(0),
  ...timestamps,
});
export type Workspace = z.infer<typeof WorkspaceSchema>;
