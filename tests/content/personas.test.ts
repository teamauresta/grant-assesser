import { describe, it, expect } from 'vitest';
import { PROGRAMS, getProgram } from '@/content/programs';
import { assessProgram, type Group } from '@/lib/assess';
import type { Profile } from '@/lib/schema';
import { PERSONA_NOW as now, bootstrappedVic, preRaiseVic, vcBackedSeed } from '@/tests/fixtures/personas';

const groupOf = (profile: Profile, slug: string) => {
  const program = getProgram(slug);
  if (!program) throw new Error(`Unknown program ${slug}`);
  return assessProgram(program, profile, now).group;
};

/** Every program's group, by slug. Closed programs are hidden from results, shown here as "closed". */
const groupMap = (profile: Profile): Record<string, Group | 'closed'> =>
  Object.fromEntries(
    [...PROGRAMS].sort((a, b) => a.slug.localeCompare(b.slug))
      .map((p) => [p.slug, assessProgram(p, profile, now).group ?? 'closed']),
  );

describe('bootstrappedVic', () => {
  it('lands where the gate rules say', () => {
    // Bootstrapped, so vc-funded is an unfixable fail.
    expect(groupOf(bootstrappedVic, 'google-cloud-ai')).toBe('not-a-fit');
    // 18 months old, has an MVP and no prior credits.
    expect(groupOf(bootstrappedVic, 'google-cloud-start')).toBe('act-now');
    // Cash match under $20K is a fixable fail.
    expect(groupOf(bootstrappedVic, 'csiro-kick-start')).toBe('prepare');
    // Experimental work, records kept, R&D spend over $20K, turnover under $20M: every check passes.
    expect(groupOf(bootstrappedVic, 'rdti')).toBe('act-now');
    // womenLed is "no", and women-led is a hard, unfixable check.
    expect(groupOf(bootstrappedVic, 'press-play')).toBe('not-a-fit');
    // Research-partner and industry-partner fails are fixable, and the status is unverified.
    expect(groupOf(bootstrappedVic, 'crc-p')).toBe('watch');
  });
});

describe('preRaiseVic', () => {
  it('lands where the gate rules say', () => {
    // The vc-funded and last-round-within fails are both fixable for Pre-raise (they apply once the round closes).
    expect(groupOf(preRaiseVic, 'google-cloud-ai')).toBe('prepare');
    // Open until 15 Nov; women-led; Victorian.
    expect(groupOf(preRaiseVic, 'press-play')).toBe('act-now');
  });
});

describe('vcBackedSeed', () => {
  it('lands where the gate rules say', () => {
    // VC-backed, seed round 17 months ago, uses GCP, no prior GCP credits.
    expect(groupOf(vcBackedSeed, 'google-cloud-ai')).toBe('act-now');
    // Incorporated 43 months ago: past the age limit, which cannot be fixed.
    expect(groupOf(vcBackedSeed, 'google-cloud-start')).toBe('not-a-fit');
    // The Victoria check is soft ("meaningful connection to Victoria"), so NSW founders can still ask.
    expect(groupOf(vcBackedSeed, 'iv-office-hours')).toBe('prepare');
    // A hard Victoria check (live in Victoria or a Victorian-based company); the program is still open on `now`.
    expect(groupOf(vcBackedSeed, 'iv-basecamp-ascent')).toBe('not-a-fit');
  });
});

describe('persona snapshots (regression net for program data edits)', () => {
  it('bootstrappedVic', () => {
    expect(groupMap(bootstrappedVic)).toMatchInlineSnapshot(`
      {
        "aea": "closed",
        "ai-adopt-centres": "prepare",
        "alice-anderson-fund": "not-a-fit",
        "apr-intern": "act-now",
        "arena-advancing-renewables": "not-a-fit",
        "aws-activate-founders": "act-now",
        "aws-activate-portfolio": "prepare",
        "brii": "closed",
        "claude-startups": "closed",
        "cloudflare-startups": "act-now",
        "crc-ai-accelerator": "watch",
        "crc-p": "watch",
        "csiro-innovate-to-grow": "watch",
        "csiro-kick-start": "prepare",
        "defence-industry-development": "not-a-fit",
        "emdg": "watch",
        "esic": "act-now",
        "google-cloud-ai": "not-a-fit",
        "google-cloud-start": "act-now",
        "industry-growth-program": "watch",
        "iv-basecamp-ascent": "act-now",
        "iv-office-hours": "act-now",
        "melbourne-accelerator-program": "closed",
        "microsoft-for-startups": "act-now",
        "monash-generator": "watch",
        "national-industry-phd": "closed",
        "nvidia-inception": "act-now",
        "openai-startups": "watch",
        "press-play": "not-a-fit",
        "rdti": "act-now",
        "rmit-launchhub": "closed",
        "startmate-summer-27": "act-now",
        "venture-growth-fund": "prepare",
        "victor-ai": "watch",
        "worksafe-rtw-trials": "not-a-fit",
      }
    `);
  });
  it('preRaiseVic', () => {
    expect(groupMap(preRaiseVic)).toMatchInlineSnapshot(`
      {
        "aea": "closed",
        "ai-adopt-centres": "prepare",
        "alice-anderson-fund": "watch",
        "apr-intern": "act-now",
        "arena-advancing-renewables": "not-a-fit",
        "aws-activate-founders": "act-now",
        "aws-activate-portfolio": "prepare",
        "brii": "closed",
        "claude-startups": "closed",
        "cloudflare-startups": "act-now",
        "crc-ai-accelerator": "watch",
        "crc-p": "watch",
        "csiro-innovate-to-grow": "watch",
        "csiro-kick-start": "act-now",
        "defence-industry-development": "not-a-fit",
        "emdg": "watch",
        "esic": "act-now",
        "google-cloud-ai": "prepare",
        "google-cloud-start": "act-now",
        "industry-growth-program": "watch",
        "iv-basecamp-ascent": "act-now",
        "iv-office-hours": "act-now",
        "melbourne-accelerator-program": "closed",
        "microsoft-for-startups": "act-now",
        "monash-generator": "watch",
        "national-industry-phd": "closed",
        "nvidia-inception": "act-now",
        "openai-startups": "watch",
        "press-play": "act-now",
        "rdti": "act-now",
        "rmit-launchhub": "closed",
        "startmate-summer-27": "act-now",
        "venture-growth-fund": "prepare",
        "victor-ai": "watch",
        "worksafe-rtw-trials": "not-a-fit",
      }
    `);
  });
  it('vcBackedSeed', () => {
    expect(groupMap(vcBackedSeed)).toMatchInlineSnapshot(`
      {
        "aea": "closed",
        "ai-adopt-centres": "prepare",
        "alice-anderson-fund": "not-a-fit",
        "apr-intern": "act-now",
        "arena-advancing-renewables": "not-a-fit",
        "aws-activate-founders": "act-now",
        "aws-activate-portfolio": "act-now",
        "brii": "closed",
        "claude-startups": "closed",
        "cloudflare-startups": "act-now",
        "crc-ai-accelerator": "watch",
        "crc-p": "watch",
        "csiro-innovate-to-grow": "watch",
        "csiro-kick-start": "act-now",
        "defence-industry-development": "not-a-fit",
        "emdg": "watch",
        "esic": "prepare",
        "google-cloud-ai": "act-now",
        "google-cloud-start": "not-a-fit",
        "industry-growth-program": "watch",
        "iv-basecamp-ascent": "not-a-fit",
        "iv-office-hours": "prepare",
        "melbourne-accelerator-program": "closed",
        "microsoft-for-startups": "act-now",
        "monash-generator": "watch",
        "national-industry-phd": "closed",
        "nvidia-inception": "act-now",
        "openai-startups": "watch",
        "press-play": "not-a-fit",
        "rdti": "act-now",
        "rmit-launchhub": "closed",
        "startmate-summer-27": "act-now",
        "venture-growth-fund": "prepare",
        "victor-ai": "not-a-fit",
        "worksafe-rtw-trials": "not-a-fit",
      }
    `);
  });
});
