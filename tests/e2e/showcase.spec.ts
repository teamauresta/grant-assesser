import { expect, test, type Page } from '@playwright/test';
import { GROUP_INFO, GROUP_ORDER } from '@/lib/groups';
import { SORT_END } from '@/lib/showcase';

/**
 * The Showcase home page in a real browser: the aurora's pause button, the sorting story, the How
 * it works previews and the persona cards' borders.
 *
 * Covered elsewhere, so not repeated here: the story's maths (tests/lib/showcase.test.ts), the
 * stage and its load failure (tests/components/sort-story.test.tsx), the previews' timings
 * (tests/components/previews.test.tsx), and axe on the home page (a11y.spec.ts).
 */

const pauseButton = (page: Page) => page.getByRole('button', { name: 'Pause background animation' });
const auroraCanvas = (page: Page) => page.locator('[data-hero-aurora] canvas');
/** The canvas writes its frame count every 30 frames; the tests only need it as a number. */
const frameCount = (page: Page) => auroraCanvas(page).evaluate((el) => Number((el as HTMLElement).dataset.frame ?? NaN));
/** Two animation frames: enough for a scroll handler's frame (or a last queued tick) to run. */
const frames = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const sortSection = (page: Page) => page.locator('section[aria-labelledby="sort-heading"]');
const stage = (page: Page) => page.locator('[data-stage]');
const chips = (page: Page) => stage(page).locator('[data-chip]');

/** A chip is at rest (in its sorted place) when its computed transform is none or the identity. */
const AT_REST = ['none', 'matrix(1, 0, 0, 1, 0, 0)'];
const chipTransforms = (page: Page) => chips(page).evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
const restingShare = async (page: Page) => {
  const all = await chipTransforms(page);
  return all.filter((t) => AT_REST.includes(t)).length / all.length;
};

/** Waits for the story (it loads with import() once "now" is known) to fill the stage. */
async function openStory(page: Page) {
  await page.goto('./');
  await expect.poll(() => chips(page).count()).toBeGreaterThan(0);
}

/** Every chip at rest, every visible count equal to its list's links, and each list named with that count. */
async function expectSorted(page: Page) {
  expect((await chipTransforms(page)).filter((t) => !AT_REST.includes(t))).toEqual([]);
  for (const g of GROUP_ORDER) {
    const links = await stage(page).locator(`ul[aria-labelledby="sort-${g}"] a`).count();
    await expect(stage(page).locator(`[data-landed="${g}"]`)).toHaveText(String(links));
    await expect(stage(page).getByRole('list', { name: `${GROUP_INFO[g].label} (${links})`, exact: true })).toHaveCount(1);
  }
}

const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('aurora', () => {
  test('plays, pauses, and remembers the pause', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('[data-aurora-fallback]')).toHaveCount(0);
    await expect(auroraCanvas(page)).toHaveCount(1);
    // Headless Chromium can take a moment before its first 30 frames: poll rather than sample.
    await expect.poll(() => frameCount(page), { timeout: 10_000 }).toBeGreaterThan(0);

    await pauseButton(page).click();
    await expect(pauseButton(page)).toHaveAttribute('aria-pressed', 'true');
    // A tick already queued when the button was pressed may still run once.
    await frames(page);
    const paused = await frameCount(page);
    await page.waitForTimeout(1_500);
    expect(await frameCount(page)).toBe(paused);

    await page.reload();
    await expect(pauseButton(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(auroraCanvas(page)).toHaveAttribute('data-frame', '0');
    await page.waitForTimeout(1_500);
    await expect(auroraCanvas(page)).toHaveAttribute('data-frame', '0');

    await pauseButton(page).click();
    await expect(pauseButton(page)).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => frameCount(page), { timeout: 10_000 }).toBeGreaterThan(0);
  });

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('draws one still frame and offers no pause button', async ({ page }) => {
      await page.goto('./');
      // Wait until the client has decided: the canvas has drawn its frame, or the fallback shows.
      const settled = page.locator('[data-hero-aurora] canvas[data-frame], [data-aurora-fallback]');
      await expect(settled).toHaveCount(1);
      await page.waitForTimeout(1_500);
      await expect(pauseButton(page)).toHaveCount(0);
      if (await auroraCanvas(page).count()) await expect(auroraCanvas(page)).toHaveAttribute('data-frame', '0');
    });
  });
});

test.describe('sorting story', () => {
  test('desktop: scrolling through the pinned section sorts every chip', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'The pinned scroll is for wide screens');
    await openStory(page);
    const section = sortSection(page);
    const top = await section.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const range = await section.evaluate((el: HTMLElement) => el.offsetHeight - window.innerHeight);
    expect(range).toBeGreaterThan(0);

    await page.evaluate((y) => window.scrollTo(0, y), top);
    await frames(page);
    // At the start of the pinned range the chips lie in the pile.
    await expect.poll(() => restingShare(page)).toBeLessThanOrEqual(0.5);
    expect(await noSideScroll(page)).toBe(true);

    await page.evaluate((y) => window.scrollTo(0, y), top + range * 0.4);
    await frames(page);
    expect(await noSideScroll(page)).toBe(true);

    // The section's end minus one viewport: the end of the pinned range.
    await page.evaluate((y) => window.scrollTo(0, y), top + range);
    await expect.poll(() => restingShare(page)).toBe(1);
    await expectSorted(page);
    expect(await noSideScroll(page)).toBe(true);
  });

  test('phone: the stage settles once it comes into view', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'The one-off settle is for narrow screens');
    await openStory(page);
    // Below the first screen, so it has not settled yet: the chips lie jumbled in their lists.
    expect(await restingShare(page)).toBeLessThanOrEqual(0.5);

    await stage(page).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(() => restingShare(page), { timeout: 3_000 }).toBe(1);
    await expectSorted(page);
    expect(await noSideScroll(page)).toBe(true);
  });

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('shows the sorted result without scrolling', async ({ page }) => {
      await openStory(page);
      await expectSorted(page);
      expect(await noSideScroll(page)).toBe(true);
    });
  });

  test('chips are links: a focused chip shows the stage sorted, and Enter opens the program', async ({ page }, info) => {
    await openStory(page);
    if (info.project.name === 'desktop') {
      // Start the pinned section in its pile, so the focus is what sorts it.
      const top = await sortSection(page).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
      await page.evaluate((y) => window.scrollTo(0, y), top);
      await frames(page);
      await expect.poll(() => restingShare(page)).toBeLessThanOrEqual(0.5);
    }
    // The last link before the stage, then Tab into it.
    await page.getByRole('region', { name: 'Where is your company today?' }).getByRole('link', { name: /^Browse all \d+ programs$/ }).focus();
    await page.keyboard.press('Tab');
    const focused = stage(page).locator('[data-chip] a:focus');
    await expect(focused).toHaveCount(1);
    if (info.project.name === 'desktop') {
      // Moving focus scrolled the page a little, but not far enough to sort the chips by scrolling.
      const progress = await sortSection(page).evaluate((el: HTMLElement) => -el.getBoundingClientRect().top / (el.offsetHeight - window.innerHeight));
      expect(progress).toBeLessThan(SORT_END);
    }
    await expectSorted(page);

    const slug = await focused.evaluate((a) => (a.closest('[data-chip]') as HTMLElement).dataset.slug);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/programs/${slug}/$`));
  });
});

test('How it works previews play once when scrolled to, then rest', async ({ page }) => {
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  const previews = page.getByRole('region', { name: 'How it works' }).locator('[data-preview]');
  await expect(previews).toHaveCount(3);
  // Below the first screen, so each holds its start state until it is scrolled to.
  for (const preview of await previews.all()) await expect(preview).toHaveAttribute('data-play', 'ready');
  for (const preview of await previews.all()) {
    await preview.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect(preview).toHaveAttribute('data-play', 'run');
  }
  await page.waitForTimeout(2_000);
  const animations = await page.evaluate(() => document.getAnimations()
    .filter((a) => a.effect instanceof KeyframeEffect && a.effect.target instanceof Element && a.effect.target.closest('[data-preview]'))
    .map((a) => a.playState));
  // They did play (finished animations that fill forwards are still listed), and none is still going.
  expect(animations.length).toBeGreaterThan(0);
  expect(animations.filter((s) => s !== 'finished')).toEqual([]);
});

test('persona cards have no coloured strip: every border side is the same colour', async ({ page }) => {
  await page.goto('./');
  const cards = page.getByRole('region', { name: 'Where is your company today?' }).locator('[data-spotlight]');
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
    const sides = await card.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor];
    });
    expect(sides[0]).toBe(sides[3]);
    expect(new Set(sides).size).toBe(1);
  }
});
