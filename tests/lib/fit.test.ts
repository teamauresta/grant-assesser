import { describe, it, expect } from 'vitest';
import { PROGRAMS } from '@/content/programs';
import { notAFitReasons, shortReason } from '@/lib/programs/fit';

const now = new Date('2026-10-27T00:00:00Z');

describe('notAFitReasons', () => {
  it('is empty without a persona, even with other answers', () => {
    expect(notAFitReasons(PROGRAMS, undefined, now).size).toBe(0);
    expect(notAFitReasons(PROGRAMS, { vcBacked: false, foreignSubsidiary: true }, now).size).toBe(0);
  });
  it('rules out VC-gated programs for a bootstrapped company, with a short reason', () => {
    const r = notAFitReasons(PROGRAMS, { persona: 'bootstrapped', vcBacked: false }, now);
    expect(r.get('google-cloud-ai')).toBe('Needs institutional VC funding');
    for (const reason of r.values()) expect(reason).not.toMatch(/[;]|\.$/);
  });
  it('keeps fixable failures (pre-raise can still raise) and passes for VC-backed', () => {
    expect(notAFitReasons(PROGRAMS, { persona: 'pre-raise', vcBacked: false }, now).has('google-cloud-ai')).toBe(false);
    expect(notAFitReasons(PROGRAMS, { persona: 'vc-backed', vcBacked: true }, now).has('google-cloud-ai')).toBe(false);
  });
});

describe('shortReason', () => {
  it('keeps the first clause', () => {
    expect(shortReason('Needs X; angel money does not count. Note')).toBe('Needs X');
    expect(shortReason('Only for women-led startups. Some note')).toBe('Only for women-led startups');
    expect(shortReason('Sector does not match')).toBe('Sector does not match');
  });
});
