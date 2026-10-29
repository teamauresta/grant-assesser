import { expect, test, type Locator, type Page } from '@playwright/test';
import { GROUP_INFO, GROUP_ORDER } from '@/lib/groups';
import { SORT_END } from '@/lib/showcase';
import { frames, populatedWorkspace, scrollSort, seedStorage } from './helpers';

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
/**
 * How long a still counter must stay still. Each test that uses it first shows a moving counter
 * advancing within the same window, so a still one is a real stop, not a slow frame rate.
 */
const STILL_WINDOW = 1_500;
const advancesWithin = (page: Page, from: number, timeout: number) =>
  expect.poll(() => frameCount(page), { timeout, intervals: [100] }).toBeGreaterThan(from);

const stage = (page: Page) => page.locator('[data-stage]');
const chips = (page: Page) => stage(page).locator('[data-chip]');

/** A chip is at rest (in its sorted place) when its computed transform is none or the identity. */
const AT_REST = ['none', 'matrix(1, 0, 0, 1, 0, 0)'];
const chipTransforms = (page: Page) => chips(page).evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
const restingCount = async (page: Page) => (await chipTransforms(page)).filter((t) => AT_REST.includes(t)).length;
/** How far (px) each chip is from its sorted place: the translation alone, so a tilt does not count. */
const chipOffsets = (page: Page) => chips(page).evaluateAll((els) => els.map((el) => {
  const m = new DOMMatrix(getComputedStyle(el).transform);
  return Math.hypot(m.e, m.f);
}));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** The visible counts summed: chips that have landed. */
const landedTotal = (page: Page) => stage(page).locator('[data-landed]').evaluateAll((els) => els.reduce((n, el) => n + Number(el.textContent), 0));

/** Waits for the story (it loads with import() once "now" is known) to fill the stage. */
async function openStory(page: Page) {
  await page.goto('./');
  await expect.poll(() => chips(page).count()).toBeGreaterThan(0);
}

/** The unsorted pile: no chip at rest, every chip moved off its sorted place (not only tilted), no count landed. */
async function expectPile(page: Page) {
  await expect.poll(() => restingCount(page)).toBe(0);
  expect(Math.min(...await chipOffsets(page))).toBeGreaterThan(1);
  expect(await landedTotal(page)).toBe(0);
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

// The second line rises 80ms after the first. A delay written before the animation shorthand in the
// built CSS is reset by it, so check the computed values rather than the class names.
test('hero headline: the second line rises 80ms after the first', async ({ page }) => {
  await page.goto('./');
  const delays = await page.locator('#hero-heading > span').evaluateAll((els) => els.map((el) => getComputedStyle(el).animationDelay));
  expect(delays).toEqual(['0s', '0.08s']);
});

test.describe('aurora', () => {
  test('plays, pauses, and remembers the pause', async ({ page }) => {
    await page.goto('./');
    await expect(auroraCanvas(page)).toHaveCount(1);
    // Headless Chromium can take a moment before its first 30 frames: poll rather than sample.
    await expect.poll(() => frameCount(page), { timeout: 10_000 }).toBeGreaterThan(0);
    // Drawing, so WebGL works here and the still gradient is not standing in for the canvas.
    await expect(page.locator('[data-aurora-fallback]')).toHaveCount(0);
    // Running, the counter moves within the window the paused checks below use.
    await advancesWithin(page, await frameCount(page), STILL_WINDOW);

    await pauseButton(page).click();
    await expect(pauseButton(page)).toHaveAttribute('aria-pressed', 'true');
    // A tick already queued when the button was pressed may still run once.
    await frames(page);
    const paused = await frameCount(page);
    await page.waitForTimeout(STILL_WINDOW);
    expect(await frameCount(page)).toBe(paused);

    await page.reload();
    await expect(pauseButton(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(auroraCanvas(page)).toHaveAttribute('data-frame', '0');
    await page.waitForTimeout(STILL_WINDOW);
    await expect(auroraCanvas(page)).toHaveAttribute('data-frame', '0');

    await pauseButton(page).click();
    await expect(pauseButton(page)).toHaveAttribute('aria-pressed', 'false');
    await advancesWithin(page, 0, STILL_WINDOW);
  });

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('draws one still frame and offers no pause button', async ({ page }) => {
      await page.goto('./');
      // Wait until the client has decided: the canvas has drawn its frame, or the fallback shows.
      await expect(page.locator('[data-hero-aurora] canvas[data-frame], [data-aurora-fallback]')).toHaveCount(1);
      await page.waitForTimeout(STILL_WINDOW);
      await expect(pauseButton(page)).toHaveCount(0);
      if (!(await auroraCanvas(page).count())) return;
      await expect(auroraCanvas(page)).toHaveAttribute('data-frame', '0');

      // The control: with motion allowed again, the same canvas moves within the same window and
      // the button comes back, so the still counter above was not a slow one.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(pauseButton(page)).toHaveAttribute('aria-pressed', 'false');
      await advancesWithin(page, 0, STILL_WINDOW);
    });
  });
});

test.describe('sorting story', () => {
  test('desktop: scrolling through the pinned section sorts every chip', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'The pinned scroll is for wide screens');
    await openStory(page);
    const range = await page.locator('section[aria-labelledby="sort-heading"]').evaluate((el: HTMLElement) => el.offsetHeight - window.innerHeight);
    expect(range).toBeGreaterThan(0);

    // The start of the pinned range: the chips lie in the pile.
    await scrollSort(page, 0);
    await expectPile(page);
    const start = mean(await chipOffsets(page));
    expect(await noSideScroll(page)).toBe(true);

    // Part-way: the scroll scrubs the sort, so some chips have landed and some have not.
    await scrollSort(page, 0.4);
    const total = await chips(page).count();
    const landed = await landedTotal(page);
    expect(landed).toBeGreaterThan(0);
    expect(landed).toBeLessThan(total);
    const mid = mean(await chipOffsets(page));
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(start);
    expect(await noSideScroll(page)).toBe(true);

    // The section's end minus one viewport: the end of the pinned range.
    await scrollSort(page, 1);
    await expect.poll(() => restingCount(page)).toBe(total);
    await expectSorted(page);
    expect(await noSideScroll(page)).toBe(true);
  });

  test('phone: the stage settles once it comes into view', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'The one-off settle is for narrow screens');
    await openStory(page);
    // Below the first screen, so it has not settled yet: the chips lie jumbled in their lists.
    await expectPile(page);

    await stage(page).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    const total = await chips(page).count();
    await expect.poll(() => restingCount(page), { timeout: 3_000 }).toBe(total);
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
    // The last link before the stage. Focusing it scrolls it into view, above the sorting story's
    // pinned range (desktop) or its settle line (phone), so the chips still lie in the pile.
    await page.getByRole('region', { name: 'Where is your company today?' }).getByRole('link', { name: /^Browse all \d+ programs$/ }).focus();
    await expectPile(page);

    await page.keyboard.press('Tab');
    const focused = stage(page).locator('[data-chip] a:focus');
    await expect(focused).toHaveCount(1);
    if (info.project.name === 'desktop') {
      // Moving focus scrolled the page, but not far enough to sort the chips by scrolling.
      const progress = await page.locator('section[aria-labelledby="sort-heading"]')
        .evaluate((el: HTMLElement) => -el.getBoundingClientRect().top / (el.offsetHeight - window.innerHeight));
      expect(progress).toBeLessThan(SORT_END);
    }
    // At once: on phones the focus also starts the 1.2s settle, which would take longer.
    await expectSorted(page);

    const slug = await focused.evaluate((a) => (a.closest('[data-chip]') as HTMLElement).dataset.slug);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/programs/${slug}/$`));
  });
});

test('How it works previews play once when scrolled to, then rest', async ({ page }) => {
  await page.goto('./');
  const previews = page.getByRole('region', { name: 'How it works' }).locator('[data-preview]');
  await expect(previews).toHaveCount(3);
  // Below the first screen, so each holds its start state until it is scrolled to.
  for (const preview of await previews.all()) await expect(preview).toHaveAttribute('data-play', 'ready');
  for (const preview of await previews.all()) {
    await preview.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect(preview).toHaveAttribute('data-play', 'run');
  }
  const states = () => page.evaluate(() => document.getAnimations()
    .filter((a) => a.effect instanceof KeyframeEffect && a.effect.target instanceof Element && a.effect.target.closest('[data-preview]'))
    .map((a) => a.playState));
  // They play (finished animations that fill forwards stay listed), and every part ends within 1.5s.
  await expect.poll(async () => (await states()).length).toBeGreaterThan(0);
  await expect.poll(async () => (await states()).filter((s) => s !== 'finished'), { timeout: 2_500 }).toEqual([]);
});

// Eucalyptus has no gradient text (design doc, section 2): every heading, number and phrase is a
// solid colour.
test('no gradient text on the home page', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((el) => {
        const s = getComputedStyle(el);
        return s.backgroundClip === 'text' || s.getPropertyValue('-webkit-background-clip') === 'text';
      })
      .map((el) => `${el.tagName.toLowerCase()} ${el.getAttribute('class') ?? ''}`),
  );
  expect(clipped).toEqual([]);
});

test('persona cards have no coloured strip: every border side is the same colour and width', async ({ page }, info) => {
  // A saved persona, so one card shows its selected border too.
  await seedStorage(page, { workspace: populatedWorkspace() });
  await page.goto('./');
  const cards = page.getByRole('region', { name: 'Where is your company today?' }).locator('[data-spotlight]');
  await expect(cards).toHaveCount(3);
  await expect(cards.filter({ hasText: 'Your current persona' })).toHaveCount(1);

  const borders = async (card: Locator) => {
    // Let border transitions (hover) finish, so the sides are read at rest.
    await card.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined))));
    return card.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        colours: [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor],
        widths: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
      };
    });
  };
  const expectEven = ({ colours, widths }: { colours: string[]; widths: string[] }) => {
    expect(colours[0]).toBe(colours[3]);
    expect(new Set(colours).size).toBe(1);
    expect(widths[0]).toBe(widths[3]);
    expect(new Set(widths).size).toBe(1);
  };

  for (const card of await cards.all()) expectEven(await borders(card));

  if (info.project.name === 'desktop') {
    const card = cards.filter({ hasNotText: 'Your current persona' }).first();
    const resting = await borders(card);
    await card.hover();
    const hovered = await borders(card);
    // The hover border is on: the check below reads the hovered state, not the resting one.
    expect(hovered.colours[0]).not.toBe(resting.colours[0]);
    expectEven(hovered);
  }
});
