import { expect, test, type Locator, type Page } from '@playwright/test';
import { frames, populatedWorkspace, seedStorage } from './helpers';

/**
 * Billabong's signature pieces in a real browser (docs/plans/2026-10-31-billabong-design.md,
 * section 4). Chunky buttons: the 3px ledge in a darker shade of the button, the press that moves the
 * button 2px down, and no movement under reduced motion.
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

  // The ledge is the only coloured edge allowed, and only on buttons (design doc section 5).
  test('only buttons and links carry the ledge, on every page', async ({ page }) => {
    await seedStorage(page, { workspace: populatedWorkspace() });
    // The directory has no chunky buttons (its filters are toggle chips); every other page has some.
    const pages = ['./', 'programs/rdti/', 'assess/', 'assess/results/', 'plan/', 'report/', 'settings/'];
    for (const path of [...pages, 'programs/']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const carriers = () => page.evaluate(() => [...document.querySelectorAll('.ledge')].map((el) => el.tagName.toLowerCase()));
      // Some pages draw their buttons after reading the workspace on the client.
      if (pages.includes(path)) await expect.poll(async () => (await carriers()).length, { message: path }).toBeGreaterThan(0);
      expect((await carriers()).filter((tag) => tag !== 'button' && tag !== 'a'), path).toEqual([]);
    }
  });
});
