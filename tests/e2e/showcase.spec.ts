import { expect, test, type Locator, type Page } from '@playwright/test';
import { GROUP_INFO, GROUP_ORDER } from '@/lib/groups';
import { SORT_END } from '@/lib/showcase';
import { populatedWorkspace, scrollSort, seedStorage } from './helpers';

/**
 * The Showcase home page in a real browser: the hero, the sorting story, the How it works previews,
 * the persona cards' borders (and the button ledge, the one uneven border allowed) and the absence
 * of gradient text. The contour lines and their pause button were removed with the WebGL hero
 * (Billabong design doc sections 5 and 8; section 11, Task 11), and their tests with them.
 *
 * Covered elsewhere, so not repeated here: the story's maths (tests/lib/showcase.test.ts), the
 * stage and its load failure (tests/components/sort-story.test.tsx), the previews' timings
 * (tests/components/previews.test.tsx), and axe on the home page (a11y.spec.ts).
 */

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

// The Billabong hero (design doc section 8: the diorama "to the right (below on phones)"): text and
// numbers left and the diorama right from md; on phones the diorama comes last, below the calls to
// action and the numbers. No sideways scroll now that nothing bleeds to the viewport's edges.
test('hero: the diorama sits beside the text on wide screens and below everything on phones', async ({ page }, info) => {
  await page.goto('./');
  const hero = page.getByRole('region', { name: /^Find the funding/ });
  const art = hero.locator('[data-art]');
  await expect(art).toHaveCount(1);
  await expect(art).toHaveAttribute('data-art', 'hero-diorama');
  const box = async (l: Locator) => (await l.boundingBox())!;
  const [a, h1, cta, stats] = await Promise.all([art, hero.getByRole('heading', { level: 1 }), hero.getByRole('link', { name: 'Start free assessment' }), hero.locator('dl')].map(box));
  expect(a.width).toBeGreaterThan(200);
  if (info.project.name === 'desktop') {
    expect(a.x).toBeGreaterThanOrEqual(h1.x + h1.width - 1);
    expect(a.x).toBeGreaterThanOrEqual(stats.x + stats.width - 1);
    expect(a.y).toBeLessThan(cta.y + cta.height);
  } else {
    expect(stats.y).toBeGreaterThanOrEqual(cta.y + cta.height);
    expect(a.y).toBeGreaterThanOrEqual(stats.y + stats.height);
  }
  expect(await noSideScroll(page)).toBe(true);
  // Removed with the contour hero: no canvas, no pause button.
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /background animation/ })).toHaveCount(0);
});

// The real dioramas (design doc section 11, Art landed): each theme downloads only its own picture,
// once, and from md the theme script preloads it (the pair is lazy, which would hold the fetch until
// layout); on a phone, where the diorama comes last, nothing is preloaded.
for (const theme of ['light', 'dark'] as const) {
  test(`hero (${theme}): only the ${theme === 'light' ? 'day' : 'dusk'} picture is fetched, preloaded from md`, async ({ page }, info) => {
    const art: string[] = [];
    page.on('request', (r) => {
      const name = r.url().split('/').pop() ?? '';
      if (name.startsWith('hero-diorama-')) art.push(name);
    });
    await seedStorage(page, { theme });
    await page.goto('./');
    const img = page.locator('[data-art="hero-diorama"] img:visible');
    await expect(img).toHaveCount(1);
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    // Settle before counting, so a late second fetch (the other theme's picture, another width) would
    // be seen rather than missed.
    await page.waitForLoadState('networkidle');
    const own = theme === 'light' ? 'hero-diorama-day-' : 'hero-diorama-dusk-';
    expect(art.length).toBe(1);
    expect(art[0].startsWith(own)).toBe(true);
    const preload = page.locator('link[rel="preload"][as="image"]');
    await expect(preload).toHaveCount(1);
    expect(await preload.getAttribute('imagesrcset')).toContain(own);
    expect(await preload.getAttribute('media')).toBe('(min-width: 48rem)');
    // Who fetched it: the preload link from md, the lazy <img> itself on a phone (the link's media fails).
    const entries = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => `${(e as PerformanceResourceTiming).initiatorType} ${e.name.split('/').pop()}`));
    const by = info.project.name === 'desktop' ? 'link' : 'img';
    expect(entries.filter((e) => e.includes('hero-diorama-'))).toEqual([expect.stringMatching(new RegExp(`^${by} ${own}`))]);
  });
}

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

type Borders = { colours: string[]; widths: string[]; ledge: boolean };

const borders = async (el: Locator): Promise<Borders> => {
  // Let border transitions (hover) finish, so the sides are read at rest.
  await el.evaluate((node) => Promise.all(node.getAnimations().map((a) => a.finished.catch(() => undefined))));
  return el.evaluate((node) => {
    const s = getComputedStyle(node);
    return {
      colours: [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor],
      widths: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
      ledge: node.classList.contains('ledge'),
    };
  });
};

/**
 * No coloured strip: every border side is the same colour and width. The one exception is the bottom
 * width of an element carrying the `ledge` utility: a chunky button's ledge is part of the control's
 * shape (docs/plans/2026-10-31-billabong-design.md, section 5). Its colour still matches the other
 * sides, so the ledge can never be a strip of another colour.
 */
const expectEven = ({ colours, widths, ledge }: Borders) => {
  expect(colours[0]).toBe(colours[3]);
  expect(new Set(colours).size).toBe(1);
  expect(widths[0]).toBe(widths[3]);
  expect(new Set(ledge ? [widths[0], widths[1], widths[3]] : widths).size).toBe(1);
};

test('persona cards have no coloured strip: every border side is the same colour and width', async ({ page }, info) => {
  // A saved persona, so one card shows its selected border too.
  await seedStorage(page, { workspace: populatedWorkspace() });
  await page.goto('./');
  const cards = page.getByRole('region', { name: 'Where is your company today?' }).locator('[data-spotlight]');
  await expect(cards).toHaveCount(3);
  await expect(cards.filter({ hasText: 'Your current persona' })).toHaveCount(1);

  for (const card of await cards.all()) {
    const sides = await borders(card);
    // Cards are not buttons: the ledge exception never applies to them.
    expect(sides.ledge).toBe(false);
    expectEven(sides);
  }

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

// The waving platypus on the first persona card (design doc section 8) overhangs its badge row rather
// than growing it: it stays inside its card and clear of the label under it, and on wide screens the
// three labels stay on one line.
test('persona cards: the platypus clears the first label and does not push it down', async ({ page }, info) => {
  await page.goto('./');
  const cards = page.getByRole('region', { name: 'Where is your company today?' }).locator('[data-spotlight]');
  await expect(cards).toHaveCount(3);
  const art = cards.first().locator('[data-art]');
  await expect(art).toHaveCount(1);
  await expect(art).toHaveAttribute('data-art', 'platypus-wave');
  // Every box is read in one frame: when the section starts below the first screen, Reveal lifts it
  // in with a 12px translate after hydration, and boxes read at different moments of that transition
  // would not line up. Each card's second child is its label row (the first is the badge row).
  const { tops, artBox, card } = await cards.evaluateAll((els) => {
    const box = (el: Element) => { const r = el.getBoundingClientRect(); return { y: r.top, height: r.height }; };
    return { tops: els.map((el) => el.children[1].getBoundingClientRect().top), artBox: box(els[0].querySelector('[data-art]')!), card: box(els[0]) };
  });
  if (info.project.name === 'desktop') expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
  expect(artBox.y).toBeGreaterThanOrEqual(card.y);
  expect(artBox.y + artBox.height).toBeLessThanOrEqual(tops[0] + 1);
});

// The button ledge (design doc section 5) is the only uneven border allowed, and only on buttons.
test('only buttons and links carry the ledge, and apart from its width every side matches', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('link', { name: 'Start free assessment' })).toBeVisible();
  const ledged = page.locator('.ledge');
  expect(await ledged.count()).toBeGreaterThan(0);
  const tags = await ledged.evaluateAll((els) => els.map((el) => el.tagName.toLowerCase()));
  expect(tags.filter((tag) => tag !== 'button' && tag !== 'a')).toEqual([]);
  for (const el of await ledged.all()) {
    const sides = await borders(el);
    expectEven(sides);
    expect(sides.widths[2]).toBe('3px');
  }
});
