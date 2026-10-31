import { expect, test, type Locator, type Page } from '@playwright/test';
import { frames, populatedWorkspace, seedStorage } from './helpers';

/**
 * Billabong's signature pieces in a real browser (docs/plans/2026-10-31-billabong-design.md,
 * section 4). Chunky buttons: the 3px ledge in a darker shade of the button, the press that moves the
 * button 2px down, and no movement under reduced motion. The top bar: sticky, inset, and clear of
 * in-page targets.
 *
 * Covered elsewhere, so not repeated here: the classes each variant carries
 * (tests/components/button.test.tsx), the ledge colours' contrast (tests/lib/tokens.test.ts), and the
 * coloured-strip check with its ledge exception (showcase.spec.ts).
 */

const startLink = (page: Page) => page.getByRole('link', { name: 'Start free assessment' });

/** A token's value as the browser computes a colour (rgb(...)), so it compares with computed borders. */
const tokenColour = (page: Page, name: string) =>
  page.evaluate((token) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);

const ledge = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return { width: s.borderBottomWidth, colour: s.borderBottomColor, top: s.borderTopWidth };
  });

/** Where the press shows: the translate property and the transform, which must both stay put. */
const movement = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return { translate: s.translate, transform: s.transform };
  });

/** Holds the mouse down on `el` (no release, so no click and no navigation). */
async function pressAndHold(page: Page, el: Locator) {
  const box = (await el.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

test.describe('chunky buttons', () => {
  test('a primary button has a 3px ledge in --primary-ledge over a 1px outline', async ({ page }) => {
    await page.goto('./');
    await expect(startLink(page)).toBeVisible();
    const { width, colour, top } = await ledge(startLink(page));
    expect(width).toBe('3px');
    expect(top).toBe('1px');
    expect(colour).toBe(await tokenColour(page, '--primary-ledge'));
  });

  test('a secondary button has a 3px ledge in --border-strong', async ({ page }) => {
    await page.goto('./');
    const browse = page.getByRole('link', { name: 'Browse programs' }).first();
    const { width, colour } = await ledge(browse);
    expect(width).toBe('3px');
    expect(colour).toBe(await tokenColour(page, '--border-strong'));
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`the danger button has a 3px ledge in --danger-ledge (${theme})`, async ({ page }) => {
      await seedStorage(page, { theme });
      await page.goto('./settings/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const reset = page.getByRole('button', { name: 'Reset everything' });
      await expect(reset).toBeVisible();
      const { width, colour } = await ledge(reset);
      expect(width).toBe('3px');
      expect(colour).toBe(await tokenColour(page, '--danger-ledge'));
      expect(colour).not.toBe(await tokenColour(page, '--danger'));
    });
  }

  test('pressing moves the button 2px down and shrinks the ledge', async ({ page }) => {
    await page.goto('./');
    const link = startLink(page);
    await expect(link).toBeVisible();
    expect((await movement(link)).translate).toBe('none');
    await pressAndHold(page, link);
    await expect.poll(async () => (await movement(link)).translate).toBe('0px 2px');
    await expect.poll(async () => (await ledge(link)).width).toBe('1px');
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  // The press moves the button 2px down. A press held near its top edge must still click: the hit
  // area stays where the button was (the pressed ::after in the ledge utility).
  test('a slow press near the top edge still clicks', async ({ page }) => {
    await page.goto('./');
    const link = startLink(page);
    await expect(link).toBeVisible();
    const box = (await link.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 1);
    await page.mouse.down();
    // Longer than the 150ms press transition, so the button has finished moving down.
    await page.waitForTimeout(250);
    await page.mouse.up();
    await expect(page).toHaveURL(/\/assess\/$/);
  });

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('pressing moves nothing', async ({ page }) => {
      await page.goto('./');
      const link = startLink(page);
      await expect(link).toBeVisible();
      const before = await movement(link);
      await pressAndHold(page, link);
      await frames(page);
      // Longer than the 150ms press transition, in case one ran anyway.
      await page.waitForTimeout(300);
      expect(await movement(link)).toEqual(before);
      expect(before).toEqual({ translate: 'none', transform: 'none' });
      expect((await ledge(link)).width).toBe('3px');
      await page.mouse.move(0, 0);
      await page.mouse.up();
    });
  });

  // The ledge is the only coloured edge allowed, and only on buttons (design doc section 5). On the
  // home page, showcase.spec.ts also checks every ledge's sides (the coloured-strip check).
  test('only buttons and links carry the ledge, on every page', async ({ page }) => {
    await seedStorage(page, { workspace: populatedWorkspace() });
    // The directory has no chunky buttons (its filters are toggle chips); every other page has some.
    const pages = ['./', 'programs/rdti/', 'assess/', 'assess/results/', 'plan/', 'report/', 'settings/'];
    for (const path of [...pages, 'programs/']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const carriers = () => page.evaluate(() => [...document.querySelectorAll('.ledge')].map((el) => el.tagName.toLowerCase()));
      // Some pages draw their buttons after reading the workspace on the client.
      if (pages.includes(path)) await expect.poll(async () => (await carriers()).length, { message: path }).toBeGreaterThan(0);
      expect((await carriers()).filter((tag) => tag !== 'button' && tag !== 'a'), path).toEqual([]);
    }
  });
});

// The top bar (design doc section 4): an inset, rounded bar that stays at the top while the page
// scrolls (the mobile header below 48rem, the desktop bar above), and never hides the skip link's
// target or an in-page anchor under itself.
test.describe('top bar', () => {
  /** The visible header: the desktop bar or the mobile one (the other is display: none). */
  const header = (page: Page) => page.getByRole('banner');

  test('stays on screen after scrolling 1,000px', async ({ page }) => {
    await page.goto('programs/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const before = (await header(page).boundingBox())!;
    expect(before.y).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeGreaterThan(1_000);
    await page.evaluate(() => window.scrollTo(0, 1_000));
    await frames(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(1_000);
    await expect(header(page)).toBeInViewport();
    const after = (await header(page).boundingBox())!;
    expect(after.y).toBe(0);
    expect(after.height).toBe(before.height);
    // The bar is inset from the page's edges by 8px, inside a full-width band.
    const bar = (await header(page).locator('> div').boundingBox())!;
    expect(bar.x).toBe(8);
    expect(bar.y).toBe(8);
    expect(after.width - (bar.x + bar.width)).toBe(8);
  });

  test("does not cover the skip link's target", async ({ page }) => {
    await page.goto('programs/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 1_000));
    await frames(page);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await frames(page);
    const bar = (await header(page).boundingBox())!;
    const main = (await page.locator('main').boundingBox())!;
    expect(main.y).toBeGreaterThanOrEqual(bar.y + bar.height);
  });

  test('does not cover an in-page anchor', async ({ page }) => {
    await page.goto('settings/#your-data');
    const heading = page.locator('#your-data-title');
    await expect(heading).toBeVisible();
    await frames(page);
    const bar = (await header(page).boundingBox())!;
    const target = (await heading.boundingBox())!;
    expect(target.y).toBeGreaterThanOrEqual(bar.y + bar.height);
  });
});

// The persona chip is drawn 36px tall to sit level with the bar's button, and a ::before stretches
// its target to 44px (design doc section 11, Task 3). The ::before is placed against the chip's
// padding box, inside its 1px border, so it must reach 5px past it to add 4px beyond each edge.
test('the persona chip keeps a 44px target in the bar', async ({ page }) => {
  await page.goto('programs/');
  const chip = page.getByRole('banner').getByRole('link', { name: 'Choose persona' });
  await expect(chip).toBeVisible();
  const box = (await chip.boundingBox())!;
  expect(box.height).toBe(36);
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  for (const dy of [-21, 21]) {
    const hit = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest('a')?.getAttribute('href') ?? el?.tagName ?? null;
    }, { x: centre.x, y: centre.y + dy });
    expect(hit, `${dy}px from the centre`).toMatch(/\/settings\/$/);
  }
});

// Phones (design doc section 11, Task 3 review): the fixed bottom nav, and the wizard's fixed footer
// above it, must never hide what has keyboard focus (WCAG 2.4.11) or each other.
test.describe('bottom bars on a phone', () => {
  test.use({ viewport: { width: 375, height: 700 } });

  /** The bottom nav: the Primary nav that is not the desktop header's (hidden on phones). */
  const BOTTOM_NAV = 'nav[aria-label="Primary"]:not(header nav)';

  const box = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  };

  /**
   * Tabs forward up to `max` times and returns each focused element that overlaps any of `covers`
   * (selectors for the fixed bars), outside the bars themselves. Stops once focus reaches a bar.
   */
  async function hiddenFocus(page: Page, covers: string[], max: number) {
    const hidden: string[] = [];
    for (let i = 0; i < max; i++) {
      await page.keyboard.press('Tab');
      await frames(page);
      const r = await page.evaluate((sels) => {
        const bars = sels.map((sel) => document.querySelector(sel)!);
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return { done: false, hit: null };
        if (bars.some((bar) => bar.contains(el))) return { done: true, hit: null };
        const a = el.getBoundingClientRect();
        const overlaps = bars.some((bar) => {
          const b = bar.getBoundingClientRect();
          return a.bottom > b.top && a.top < b.bottom;
        });
        return { done: false, hit: overlaps ? `${el.tagName} ${el.textContent?.trim().slice(0, 40)}` : null };
      }, covers);
      if (r.hit) hidden.push(r.hit);
      if (r.done) break;
    }
    return hidden;
  }

  test('the wizard footer sits above the bottom nav', async ({ page }) => {
    await page.goto('assess/');
    const footer = page.locator('[data-wizard-footer]');
    await expect(footer).toBeVisible();
    const f = await footer.evaluate(box);
    const nav = await page.getByRole('navigation', { name: 'Primary' }).evaluate(box);
    expect(f.bottom).toBeLessThanOrEqual(nav.top);
  });

  test('tabbing through the directory never hides focus behind the bottom nav', async ({ page }) => {
    await page.goto('programs/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await hiddenFocus(page, [BOTTOM_NAV], 150)).toEqual([]);
  });

  test("tabbing through the wizard's fields never hides focus behind its footer or the bottom nav", async ({ page }) => {
    for (let step = 1; step <= 6; step++) {
      await page.goto(`assess/?step=${step}`);
      await expect(page.getByText(`Step ${step} of 6`)).toBeVisible();
      expect(await hiddenFocus(page, ['[data-wizard-footer]', BOTTOM_NAV], 80), `step ${step}`).toEqual([]);
    }
  });

  // Enlarged text (WCAG 1.4.4, design doc section 11, Task 4 review): the footer grows upwards, and the
  // wizard measures it into --wizard-footer-h, so focus still clears it and the nav.
  test("at 200% text, the wizard's footer clears the nav and never hides focus", async ({ page }) => {
    for (let step = 1; step <= 6; step++) {
      await page.goto(`assess/?step=${step}`);
      await expect(page.getByText(`Step ${step} of 6`)).toBeVisible();
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      await frames(page);
      const footer = page.locator('[data-wizard-footer]');
      const f = await footer.evaluate(box);
      const nav = await page.locator(BOTTOM_NAV).evaluate(box);
      expect(f.bottom).toBeLessThanOrEqual(nav.top + 0.5);
      const measured = await page.evaluate(() => parseFloat(document.documentElement.style.getPropertyValue('--wizard-footer-h')));
      expect(measured).toBeCloseTo(f.bottom - f.top, 0);
      expect(await hiddenFocus(page, ['[data-wizard-footer]', BOTTOM_NAV], 120), `step ${step}`).toEqual([]);
    }
  });
});

// Marker highlights (design doc sections 2, 4 and 9).
test.describe('marker highlight', () => {
  type CssRule = { conditions: string[]; selectors: string[]; declarations: [string, string][] };

  /**
   * The style rules in a (minified) style sheet's text, with the at-rule preludes around each. A
   * small brace parser: it skips escapes and strings, which is all the built CSS needs.
   */
  function styleRules(text: string): CssRule[] {
    const rules: CssRule[] = [];
    const stack: string[] = [];
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\\') i++;
      else if (ch === '"' || ch === "'") {
        i = text.indexOf(ch, i + 1);
        // An unclosed quote: indexOf gives -1, and the loop would start again from 0, forever.
        if (i < 0) break;
      } else if (ch === '{') {
        // A statement at-rule (`@import …;`) can precede the prelude.
        stack.push(text.slice(start, i).split(';').pop()!.trim());
        start = i + 1;
      } else if (ch === '}') {
        const prelude = stack.pop() ?? '';
        if (!prelude.startsWith('@')) {
          const declarations = text.slice(start, i).split(';').map((d) => d.trim()).filter(Boolean)
            .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()] as [string, string]);
          // Conditions only: a cascade layer does not decide whether a rule applies.
          rules.push({ conditions: stack.filter((s) => /^@(supports|media|container)\b/.test(s)), selectors: prelude.split(',').map((s) => s.trim()), declarations });
        }
        start = i + 1;
      }
    }
    return rules;
  }

  /** Every `.highlight` rule in the page's style sheets, read from their raw text. */
  async function highlightRules(page: Page): Promise<CssRule[]> {
    const { hrefs, inline } = await page.evaluate(() => ({
      hrefs: [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((l) => l.href),
      inline: [...document.querySelectorAll('style')].map((s) => s.textContent ?? ''),
    }));
    const texts = [...inline];
    for (const href of hrefs) texts.push(await (await page.request.get(href)).text());
    return texts.flatMap(styleRules).filter((r) => r.selectors.includes('.highlight'));
  }

  // The minifier gives a color-mix() a fallback at the tone's full strength (--fg on that is under
  // 2:1 in dark), possibly inside the same rule, where the CSSOM would show only the last value. So
  // this reads the raw text: every background the built CSS gives .highlight is cleared, the guarded
  // color-mix(), or Mark in forced colours.
  test('the built CSS paints the band only through color-mix(), and Mark in forced colours', async ({ page }) => {
    await page.goto('./');
    const rules = await highlightRules(page);
    const backgrounds = (r: CssRule) => r.declarations.filter(([p]) => /^background(-color)?$/.test(p)).map(([, v]) => v);
    // `background: transparent` as minified (`0 0` is a position, leaving the colour transparent).
    const cleared = /^(transparent|#0000|#00000000|0 0|none)$/;

    const base = rules.filter((r) => r.conditions.length === 0);
    expect(base.length).toBeGreaterThan(0);
    expect(base.flatMap(backgrounds).length).toBeGreaterThan(0);
    for (const v of base.flatMap(backgrounds)) expect(v).toMatch(cleared);

    const conditional = rules.filter((r) => r.conditions.length > 0 && backgrounds(r).length > 0);
    expect(conditional.length).toBeGreaterThan(0);
    for (const r of conditional) {
      const at = r.conditions.join(' ');
      if (/forced-colors:\s*active/.test(at)) {
        expect(backgrounds(r), at).toEqual(['mark']);
        expect(r.declarations, at).toContainEqual(['color', 'marktext']);
      } else {
        expect(at).toMatch(/^@supports \(color:\s*color-mix\(/);
        // The minifier drops some spaces, so they are optional.
        for (const v of backgrounds(r)) expect(v, at).toMatch(/^color-mix\(in srgb, ?var\(--hl, ?var\(--hl-amber\)\) 35%, ?transparent\)$/);
      }
    }
  });

  /**
   * Paints a highlight inside muted text and returns its colours. TODO(Task 11): use the hero's
   * Highlight once the home page renders one, instead of this copy of the component's classes.
   */
  const paint = (page: Page) =>
    page.evaluate(() => {
      const p = document.createElement('p');
      p.className = 'text-muted-fg';
      const el = document.createElement('span');
      el.className = 'highlight [--hl:var(--hl-sky)]';
      el.textContent = 'key words';
      p.append(el);
      document.querySelector('main')!.prepend(p);
      const s = getComputedStyle(el);
      return { background: s.backgroundColor, color: s.color };
    });

  for (const theme of ['light', 'dark'] as const) {
    test(`a highlight is the tone at 35% behind --fg text, inside muted text (${theme})`, async ({ page }) => {
      await seedStorage(page, { theme });
      await page.goto('./');
      const fg = await tokenColour(page, '--fg');
      const sky = await tokenColour(page, '--hl-sky');
      const painted = await paint(page);
      expect(painted.color).toBe(fg);
      const [r, g, b] = sky.match(/\d+/g)!.map(Number);
      const m = painted.background.match(/^(?:rgba\((\d+), (\d+), (\d+), ([\d.]+)\)|color\(srgb ([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\))$/);
      expect(m, painted.background).not.toBeNull();
      const [pr, pg, pb, alpha] = m![1] ? m!.slice(1, 5).map(Number) : m!.slice(5, 9).map((v, i) => Number(v) * (i < 3 ? 255 : 1));
      expect(alpha).toBeCloseTo(0.35, 2);
      for (const [got, want] of [[pr, r], [pg, g], [pb, b]]) expect(Math.abs(got - want)).toBeLessThanOrEqual(1);
    });
  }

  // A text-colour class on the element (.text-fg comes later in the CSS) would beat the utility's
  // MarkText, leaving forced-colours text on the yellow Mark at about 1.07:1.
  test('forced colours paint MarkText on Mark', async ({ page }) => {
    await seedStorage(page, { theme: 'dark' });
    await page.emulateMedia({ forcedColors: 'active', colorScheme: 'dark' });
    await page.goto('./');
    const system = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'MarkText';
      probe.style.backgroundColor = 'Mark';
      document.body.append(probe);
      const s = getComputedStyle(probe);
      const out = { color: s.color, background: s.backgroundColor };
      probe.remove();
      return out;
    });
    expect(await paint(page)).toEqual(system);
  });
});

// The wizard's choice cards (Billabong plan, Task 6; design doc section 11): the checked card has an
// --accent border, a 2px inset ring and a check icon; keyboard focus is an outline 2px outside the
// card, so checked and focused stay two different marks.
test.describe('wizard choice cards', () => {
  const acn = (page: Page) => page.getByRole('group', { name: /^Do you have an Australian company with an ACN\?/ });
  /** The card around an option's input, by the input's value ('true' is Yes, 'false' is No). */
  const card = (page: Page, value: string) => acn(page).locator('label').filter({ has: page.locator(`input[value="${value}"]`) });

  /** The card's edge, outline and icon, once its 150ms transition has finished. */
  const look = (el: Locator) =>
    el.evaluate(async (node) => {
      await Promise.all(node.getAnimations().map((a) => a.finished.catch(() => undefined)));
      const s = getComputedStyle(node);
      return {
        border: s.borderTopColor,
        width: s.borderTopWidth,
        shadow: s.boxShadow,
        outline: s.outlineStyle,
        outlineColour: s.outlineColor,
        offset: s.outlineOffset,
        icon: node.querySelector('svg.lucide-check') !== null,
      };
    });

  test('a checked card has the accent border, an inset ring and a check icon; focus is an offset outline', async ({ page }) => {
    await page.goto('assess/?step=2');
    await expect(page.getByRole('heading', { level: 2, name: 'Step 2 of 6: Company' })).toBeVisible();
    const accent = await tokenColour(page, '--accent');

    const resting = await look(card(page, 'true'));
    expect(resting.border).toBe(await tokenColour(page, '--border-strong'));
    expect(resting.width).toBe('1px');
    expect(resting.icon).toBe(false);

    await acn(page).getByRole('radio', { name: /^Yes/ }).check();
    const checked = await look(card(page, 'true'));
    expect(checked.border).toBe(accent);
    expect(checked.shadow).toContain(accent);
    expect(checked.shadow).toContain('inset');
    expect(checked.shadow).toContain('2px');
    expect(checked.icon).toBe(true);
    expect(checked.outline).toBe('none');
    expect((await look(card(page, 'false'))).icon).toBe(false);

    // Back out of the group and in again with the keyboard: focus returns to the checked radio, and
    // the card gains the offset outline on top of its ring.
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(acn(page).getByRole('radio', { name: /^Yes/ })).toBeFocused();
    const focused = await look(card(page, 'true'));
    expect(focused.outline).toBe('solid');
    expect(focused.outlineColour).toBe(accent);
    expect(focused.offset).toBe('2px');
    expect(focused.shadow).toBe(checked.shadow);
  });
});

// The plan (Billabong plan, Task 8; design doc section 11): the pipeline's columns are windows that
// never clip a card gliding between them, and a cheer from the outcome dialog reaches assistive tech.
test.describe('plan', () => {
  test.beforeEach(async ({ page }) => {
    await seedStorage(page, { workspace: populatedWorkspace() });
    await page.goto('plan/');
    await expect(page.getByRole('article', { name: 'CSIRO Kick-Start' })).toBeVisible();
  });

  test('nothing between a card and the board clips it, so a moved card glides in view', async ({ page }) => {
    const clipped = await page.locator('[data-app-id="app-kick-start"]').evaluate((li) => {
      const board = li.closest('[data-board]')!;
      const found: string[] = [];
      for (let el = li.parentElement; el && el !== board; el = el.parentElement) {
        const s = getComputedStyle(el);
        if (s.overflowX !== 'visible' || s.overflowY !== 'visible' || s.contain.includes('paint')) found.push(`${el.tagName}.${el.className}`);
      }
      return found;
    });
    expect(clipped).toEqual([]);
    // The card sits in a column window: a region named by its title, in the window's frame.
    const column = page.getByRole('region', { name: /^Considering/ });
    await expect(column.getByRole('article', { name: 'CSIRO Kick-Start' })).toBeVisible();
    await expect(column).toHaveClass(/\bshadow-window\b/);
  });

  test('an award chosen in the outcome dialog is cheered once the page is live again', async ({ page }) => {
    // Record, as each toast is added, whether its live region is inert (as it is behind a dialog). The
    // exact moment is checked in tests/components/pipeline-board.test.tsx; this is the real browser.
    await page.evaluate(() => {
      const w = window as unknown as { toastSeen: { inert: boolean; dialog: boolean }[] };
      w.toastSeen = [];
      // Recorded only when the toaster gains a toast (its direct children), not for every node a
      // toast or the page adds.
      let count = 0;
      new MutationObserver(() => {
        const region = document.querySelector('[data-toaster]');
        const now = region?.childElementCount ?? 0;
        if (region && now > count) {
          w.toastSeen.push({ inert: region.closest('[inert]') !== null, dialog: document.querySelector('[role="dialog"]') !== null });
        }
        count = now;
      }).observe(document.body, { childList: true, subtree: true });
    });
    // Drop the card on Outcome (synthetic drag events: the grip arms the card on pointer down).
    const data = await page.evaluateHandle(() => new DataTransfer());
    const card = page.getByRole('article', { name: 'CSIRO Kick-Start' });
    await card.dispatchEvent('dragstart', { dataTransfer: data });
    const outcome = page.getByRole('region', { name: /^Outcome/ });
    await outcome.dispatchEvent('dragover', { dataTransfer: data });
    await expect(outcome).toHaveClass(/\bborder-accent\b/);
    await outcome.dispatchEvent('drop', { dataTransfer: data });
    const dialog = page.getByRole('dialog', { name: 'What was the outcome?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^Awarded/ }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Awarded. Add the reporting dates to your calendar.')).toBeVisible();
    const seen = await page.evaluate(() => (window as unknown as { toastSeen: unknown[] }).toastSeen);
    expect(seen.length).toBeGreaterThanOrEqual(1);
    for (const moment of seen) expect(moment).toEqual({ inert: false, dialog: false });
    // Its link is reachable: focus moves to it.
    const link = page.getByRole('link', { name: 'Open calendar' });
    await link.focus();
    await expect(link).toBeFocused();
    await expect(page.getByRole('region', { name: /^Outcome/ }).getByRole('article', { name: 'CSIRO Kick-Start' })).toBeVisible();
  });
});
