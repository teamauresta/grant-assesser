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

  const box = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  };

  /**
   * Tabs forward up to `max` times and returns each focused element that overlaps `cover` (a
   * selector for the fixed bar), outside the bar itself. Stops once focus reaches the bar.
   */
  async function hiddenFocus(page: Page, cover: string, max: number) {
    const hidden: string[] = [];
    for (let i = 0; i < max; i++) {
      await page.keyboard.press('Tab');
      await frames(page);
      const r = await page.evaluate((sel) => {
        const bar = document.querySelector(sel)!;
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return { done: false, hit: null };
        if (bar.contains(el)) return { done: true, hit: null };
        const a = el.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        const overlaps = a.bottom > b.top && a.top < b.bottom;
        return { done: false, hit: overlaps ? `${el.tagName} ${el.textContent?.trim().slice(0, 40)}` : null };
      }, cover);
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
    expect(await hiddenFocus(page, 'nav[aria-label="Primary"]:not(header nav)', 150)).toEqual([]);
  });

  test("tabbing through the wizard's fields never hides focus behind its footer", async ({ page }) => {
    for (let step = 1; step <= 6; step++) {
      await page.goto(`assess/?step=${step}`);
      await expect(page.getByText(`Step ${step} of 6`)).toBeVisible();
      expect(await hiddenFocus(page, '[data-wizard-footer]', 80), `step ${step}`).toEqual([]);
    }
  });
});
