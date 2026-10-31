import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { frames, populatedWorkspace, scrollSort, seedStorage } from './helpers';

/**
 * Review screenshots for the owner, not a test baseline: nothing is compared. Run with
 * `SCREENS=1 pnpm e2e tests/e2e/screens.spec.ts`; files land in test-results/screens/ (gitignored,
 * and cleared by Playwright at the start of every run).
 */
test.skip(!process.env.SCREENS, 'Set SCREENS=1 to capture review screenshots');

const OUT = join(import.meta.dirname, '../../test-results/screens');

/** Scrolls through the page so scroll reveals show, lets entrances finish, then lets the hero settle. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await page.evaluate(async () => {
    const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await frames();
    }
    window.scrollTo(0, 0);
    await frames();
  });
  // Finite animations only: the aurora is drawn on requestAnimationFrame, not a CSS animation, so
  // it never appears here and never holds this up.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  await page.waitForTimeout(1_500);
}

async function capture(page: Page, name: string, project: string) {
  await settle(page);
  await page.screenshot({ path: join(OUT, `${name}-${project}.png`), fullPage: true });
}

/** A viewport (not full-page) shot of one part of the home page. */
const homePart = (page: Page, part: string, theme: string, project: string) =>
  page.screenshot({ path: join(OUT, `home-${part}-${theme}-${project}.png`) });

for (const theme of ['light', 'dark'] as const) {
  test(`home (${theme})`, async ({ page }, info) => {
    const project = info.project.name;
    await seedStorage(page, { workspace: populatedWorkspace(), theme });
    await page.goto('./');
    await expect(page.getByText('Pick up where you left off')).toBeVisible();
    // The full page under reduced motion: the sorting story's pinned range collapses to the sorted
    // layout. With motion, a full-page capture draws the pinned section flat: the pile, then a gap.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await capture(page, `home-${theme}`, project);
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    const stage = page.locator('[data-stage]');
    if (project !== 'desktop') {
      // The phone settle part-way: it starts when the stage comes into view and runs for 1.2s.
      await stage.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(500);
      await homePart(page, 'sort-mid', theme, project);
      return;
    }

    // The story as a visitor sees it, a screen at a time: the hero with the aurora drawing, the
    // sort at the start, part-way and the end of its pinned range, and How it works after the
    // previews have played.
    await page.evaluate(() => window.scrollTo(0, 0));
    const canvas = page.locator('[data-hero-aurora] canvas');
    const drawn = Number(await canvas.getAttribute('data-frame'));
    await expect.poll(async () => Number(await canvas.getAttribute('data-frame')), { timeout: 10_000 }).toBeGreaterThan(drawn);
    await homePart(page, 'hero', theme, project);
    for (const [part, k] of [['sort-start', 0], ['sort-mid', 0.4], ['sort-end', 1]] as const) {
      await scrollSort(page, k);
      await homePart(page, part, theme, project);
    }
    await page.getByRole('region', { name: 'How it works' }).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await frames(page);
    await page.evaluate(() => Promise.all(document.getAnimations()
      .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
      .map((a) => a.finished.catch(() => undefined))));
    await homePart(page, 'how', theme, project);
  });
}

test('plan', async ({ page }, info) => {
  await seedStorage(page, { workspace: populatedWorkspace() });
  await page.goto('plan/');
  await expect(page.getByRole('article', { name: 'CSIRO Kick-Start' })).toBeVisible();
  await capture(page, 'plan', info.project.name);
});

// The wizard in its window (design doc section 11, Task 6): the first, a middle and the last step with
// the bootstrappedVic answers, so checked cards show; then keyboard focus on a checked card.
for (const theme of ['light', 'dark'] as const) {
  test(`wizard (${theme})`, async ({ page }, info) => {
    const project = info.project.name;
    await seedStorage(page, { workspace: populatedWorkspace(), theme });
    for (const step of [1, 2, 6]) {
      await page.goto(`assess/?step=${step}`);
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^Step ${step} of 6`) })).toBeVisible();
      await capture(page, `wizard-${step}-${theme}`, project);
    }
    await page.goto('assess/?step=2');
    const yes = page.getByRole('group', { name: /^Do you have an Australian company with an ACN\?/ }).getByRole('radio', { name: /^Yes/ });
    await expect(yes).toBeChecked();
    await yes.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(yes).toBeFocused();
    await page.screenshot({ path: join(OUT, `wizard-focus-${theme}-${project}.png`) });
  });
}

// The report builder: most section cards start checked, drawn quiet (accent border and icon, no ring).
for (const theme of ['light', 'dark'] as const) {
  test(`report (${theme})`, async ({ page }, info) => {
    await seedStorage(page, { workspace: populatedWorkspace(), theme });
    await page.goto('report/');
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
    await capture(page, `report-${theme}`, info.project.name);
  });
}

test('results', async ({ page }, info) => {
  await seedStorage(page, { workspace: populatedWorkspace() });
  await page.goto('assess/results/');
  await expect(page.getByRole('region', { name: /^Act now/ })).toBeVisible();
  await capture(page, 'results', info.project.name);
});
