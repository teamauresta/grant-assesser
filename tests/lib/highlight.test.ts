import { afterEach, describe, it, expect, vi } from 'vitest';
import { splitHighlight } from '@/lib/highlight';
import { DEFAULT_RESULTS, PERSONA_RESULTS } from '@/lib/personas';

describe('splitHighlight', () => {
  it('splits a text around its phrase', () => {
    expect(splitHighlight('Start with what pays back quickly', 'pays back quickly')).toEqual(['Start with what ', 'pays back quickly', '']);
    expect(splitHighlight('Build eligibility before the round', 'eligibility')).toEqual(['Build ', 'eligibility', ' before the round']);
  });

  it('throws in development and tests when the phrase is missing, so a copy edit cannot drop the band silently', () => {
    expect(() => splitHighlight('Your results', 'funding')).toThrow();
    expect(() => splitHighlight('Your results', '')).toThrow();
  });

  describe('in production', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('degrades to the plain text, with no phrase, rather than breaking the page', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(splitHighlight('Your results', 'funding')).toEqual(['Your results', '', '']);
      expect(splitHighlight('Your results', '')).toEqual(['Your results', '', '']);
      expect(splitHighlight('Your results', 'results')).toEqual(['Your ', 'results', '']);
    });
  });
});

// The results heading carries one marker band (Billabong plan, Task 7; design doc section 4: at most
// once per heading). Each persona's phrase must be in its title, once.
describe('results headings', () => {
  for (const [name, copy] of [...Object.entries(PERSONA_RESULTS), ['default', DEFAULT_RESULTS] as const]) {
    it(`${name}: the highlighted phrase is part of the title, once`, () => {
      expect(copy.title.split(copy.highlight)).toHaveLength(2);
      expect(copy.highlight.trim()).toBe(copy.highlight);
      expect(copy.highlight.length).toBeLessThan(copy.title.length);
    });
  }
});
