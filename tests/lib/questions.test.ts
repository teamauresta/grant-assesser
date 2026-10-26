import { describe, it, expect } from 'vitest';
import { ProfileSchema, type Profile } from '@/lib/schema';
import { QUESTIONS, STEPS, STEP_COUNT, parseStep, visibleQuestions, hasUnsure } from '@/lib/assessment/questions';

const shape = ProfileSchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

describe('assessment questions', () => {
  it('uses only profile fields, each asked once', () => {
    for (const q of QUESTIONS) expect(Object.keys(ProfileSchema.shape)).toContain(q.id);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });

  it('asks every profile field somewhere', () => {
    expect(new Set(QUESTIONS.map((q) => q.id))).toEqual(new Set(Object.keys(ProfileSchema.shape)));
  });

  it('has option values that parse with the field schema', () => {
    for (const q of QUESTIONS) {
      for (const o of q.options ?? []) {
        // A multi-choice field stores a list, so each option must parse as a one-item list.
        const value = q.type === 'multi' ? [o.value] : o.value;
        expect(shape[q.id].safeParse(value).success, `${q.id}: ${String(o.value)}`).toBe(true);
      }
    }
  });

  it('gives choice questions options, and every question a label and help', () => {
    for (const q of QUESTIONS) {
      expect(q.label.length).toBeGreaterThan(0);
      expect(q.help?.length ?? 0, q.id).toBeGreaterThan(0);
      if (q.type === 'single' || q.type === 'multi' || q.type === 'boolean' || q.type === 'month') {
        expect(q.options?.length ?? 0, q.id).toBeGreaterThan(1);
      }
    }
  });

  it('has six non-empty steps with titles', () => {
    expect(STEP_COUNT).toBe(6);
    expect(STEPS.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const s of STEPS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(QUESTIONS.some((q) => q.step === s.step), `step ${s.step}`).toBe(true);
    }
  });

  it('follows the step table', () => {
    const at = (step: number) => QUESTIONS.filter((q) => q.step === step).map((q) => q.id);
    expect(at(1)).toEqual(['persona', 'companyName']);
    expect(at(3)).toContain('priorCreditsUsd');
    expect(at(5)).toContain('womenLed');
    expect(at(6)).toEqual(['founderHoursPerWeek', 'urgency']);
  });

  it('marks women-led optional with "Prefer not to say" and explains its use', () => {
    const q = QUESTIONS.find((x) => x.id === 'womenLed')!;
    expect(q.optional).toBe(true);
    expect(q.options!.map((o) => o.value)).toContain('prefer-not');
    expect(q.help).toMatch(/Press Play/);
  });

  it('offers "Not sure" on single choices except where another option already covers it', () => {
    expect(hasUnsure(QUESTIONS.find((q) => q.id === 'turnover')!)).toBe(true);
    expect(hasUnsure(QUESTIONS.find((q) => q.id === 'hasAcn')!)).toBe(true);
    expect(hasUnsure(QUESTIONS.find((q) => q.id === 'womenLed')!)).toBe(false);
    expect(hasUnsure(QUESTIONS.find((q) => q.id === 'stack')!)).toBe(false);
  });
});

describe('visibleQuestions', () => {
  const ids = (p: Profile) => visibleQuestions(3, p).map((q) => q.id);
  it('asks for the last round date only once a round has been raised', () => {
    expect(ids({})).not.toContain('lastRoundOn');
    expect(ids({ fundingStage: 'none' })).not.toContain('lastRoundOn');
    expect(ids({ fundingStage: 'seed' })).toContain('lastRoundOn');
  });
});

describe('parseStep', () => {
  it('defaults to 1 and clamps to the six steps', () => {
    expect(parseStep(null)).toBe(1);
    expect(parseStep('3')).toBe(3);
    expect(parseStep('0')).toBe(1);
    expect(parseStep('9')).toBe(6);
    expect(parseStep('two')).toBe(1);
    expect(parseStep('2.5')).toBe(1);
  });
});
