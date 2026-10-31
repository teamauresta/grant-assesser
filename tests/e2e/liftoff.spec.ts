import { expect, test, type Page } from '@playwright/test';
import { populatedWorkspace, seedStorage } from './helpers';

/**
 * The hero numbers, type links and celebrations in a real browser (from the Liftoff release; the file
 * keeps its name).
 *
 * Covered elsewhere, so not repeated here:
 * - content staying visible (opacity 1) when motion's features fail to load: motion.spec.ts;
 * - nothing left [data-reveal="hidden"] after scrolling, on every page: a11y.spec.ts;
 * - which moves cheer (submitted, awarded, declined, withdrawn, goals done, the outcome dialog),
 *   once per event, and confetti gated by Celebrations and reduced motion: tests/lib/celebrate.test.ts,
 *   tests/components/pipeline-board.test.tsx, goal-list.test.tsx and results-cheer.test.tsx.
 */

/** The confetti canvas: cheer() draws on its own aria-hidden canvas, appended to body. */
const confettiCanvases = (page: Page) => page.locator('body > canvas[aria-hidden="true"]');

/** The number shown for one of the hero's stats (the counting copy, not the hidden width holder). */
const stat = (page: Page, label: string) =>
  page.locator('dl > div').filter({ has: page.locator('dt', { hasText: label }) }).locator('dd [data-count]');

const grantCircle = (page: Page) => page.getByRole('region', { name: 'Browse by type' }).getByRole('link', { name: 'Grant', exact: true });

/** The directory filtered to grants: every listed card shows the Grant type. */
async function expectGrantDirectory(page: Page) {
  await expect(page).toHaveURL(/\/programs\/\?type=grant$/);
  // The directory reads the filter from the URL on the client; wait until it has applied it.
  await expect(page.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Grant', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const cards = page.getByRole('list').filter({ has: page.locator('article') }).locator(':scope > li');
  await expect.poll(() => cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all()) await expect(card.getByText(/· Grant$/)).toBeVisible();
}

test.describe('hero', () => {
  test('shows the promise, live numbers, and links each type to the directory', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: /^Find the funding/ })).toBeVisible();
    // "Open now" and "Closing in 30 days" depend on now, so they appear on the client only.
    await expect(stat(page, 'Open now')).toHaveText(/^\d+$/);
    await expect(stat(page, 'Closing in 30 days')).toHaveText(/^\d+$/);

    await page.getByRole('region', { name: 'Browse by type' }).scrollIntoViewIfNeeded();
    await grantCircle(page).click();
    await expectGrantDirectory(page);
  });

  test('the type circles work from the keyboard', async ({ page }) => {
    await page.goto('./');
    await grantCircle(page).focus();
    await expect(grantCircle(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expectGrantDirectory(page);
  });
});

test.describe('celebrations', () => {
  test.beforeEach(async ({ page }) => {
    await seedStorage(page, { workspace: populatedWorkspace() });
  });

  async function openPlan(page: Page) {
    await page.goto('plan/');
    await expect(page.getByRole('article', { name: 'CSIRO Kick-Start' })).toBeVisible();
  }

  async function moveKickStart(page: Page, stage: string) {
    await page.getByRole('button', { name: 'Move CSIRO Kick-Start to…' }).click();
    await page.getByRole('menuitem', { name: stage }).click();
  }

  test('Awarded shows its message and a link to the calendar', async ({ page }) => {
    await openPlan(page);
    await moveKickStart(page, 'Awarded');
    // Messages from the Billabong copy pass (design doc, section 7).
    await expect(page.getByText('Awarded! The platypus is doing laps. Add the reporting dates to your calendar.')).toBeVisible();
    const link = page.getByRole('link', { name: 'Open calendar' });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/plan\/\?tab=calendar$/);
    await expect(page.getByRole('tablist', { name: 'Plan views' }).getByRole('tab', { name: /^Calendar/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('Submitted bursts confetti on its own hidden canvas', async ({ page }) => {
    // The control for the next test: with Celebrations on, the canvas does appear.
    await openPlan(page);
    await expect(confettiCanvases(page)).toHaveCount(0);
    await moveKickStart(page, 'Submitted');
    await expect(page.getByText("Submitted! The hard part's done. Time for a cuppa.")).toBeVisible();
    await expect(confettiCanvases(page)).toHaveCount(1);
  });

  test('with Celebrations off, the message still shows but no confetti is drawn', async ({ page }) => {
    await page.goto('settings/');
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await page.getByRole('group', { name: /^Confetti on milestones/ }).getByRole('radio', { name: 'Off', exact: true }).check();
    // Saved before leaving the page, so plan/ loads with Celebrations off.
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('gn-workspace') ?? '{}').settings?.celebrations)).toBe(false);

    await openPlan(page);
    const before = await confettiCanvases(page).count();
    expect(before).toBe(0);
    await moveKickStart(page, 'Submitted');
    await expect(page.getByText("Submitted! The hard part's done. Time for a cuppa.")).toBeVisible();
    // A burst loads canvas-confetti with import() first, so wait for the network to settle before
    // checking that no canvas was added.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(await confettiCanvases(page).count()).toBe(before);
  });
});
