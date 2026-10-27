import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { populatedWorkspace, seedStorage } from './helpers';

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
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  await page.waitForTimeout(1_500);
}

async function capture(page: Page, name: string, project: string) {
  await settle(page);
  await page.screenshot({ path: join(OUT, `${name}-${project}.png`), fullPage: true });
}

for (const theme of ['light', 'dark'] as const) {
  test(`home (${theme})`, async ({ page }, info) => {
    await seedStorage(page, { workspace: populatedWorkspace(), theme });
    await page.goto('./');
    await expect(page.getByText('Pick up where you left off')).toBeVisible();
    await capture(page, `home-${theme}`, info.project.name);
  });
}

test('plan', async ({ page }, info) => {
  await seedStorage(page, { workspace: populatedWorkspace() });
  await page.goto('plan/');
  await expect(page.getByRole('article', { name: 'CSIRO Kick-Start' })).toBeVisible();
  await capture(page, 'plan', info.project.name);
});

test('results', async ({ page }, info) => {
  await seedStorage(page, { workspace: populatedWorkspace() });
  await page.goto('assess/results/');
  await expect(page.getByRole('region', { name: /^Act now/ })).toBeVisible();
  await capture(page, 'results', info.project.name);
});
