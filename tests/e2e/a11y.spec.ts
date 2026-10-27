import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { populatedWorkspace, seedStorage } from './helpers';

const PAGES = ['', 'programs/', 'programs/csiro-kick-start/', 'assess/', 'assess/results/', 'plan/', 'report/', 'settings/'];

/** Opens a page, waits for client content (skeletons are aria-busy) and runs axe for WCAG 2 A/AA. */
async function expectNoViolations(page: Page, path: string, ready?: (page: Page) => Promise<void>) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await ready?.(page);
  // Scroll down a screen at a time and back, so content that reveals on scroll (<Reveal>) is shown
  // and axe checks it too.
  await page.evaluate(async () => {
    const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await frames();
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await frames();
    window.scrollTo(0, 0);
    await frames();
  });
  await expect(page.locator('[data-reveal="hidden"]')).toHaveCount(0);
  // Let entrance animations and transitions (route fade, dialog scale-in, reveals) finish, so axe
  // checks the settled colours rather than a half-faded frame. Infinite ones (spinners) keep running.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  // Summarise so a failure says what and where, not just "expected [] to equal [...]".
  expect(violations.map((v) => ({ rule: v.id, help: v.help, targets: v.nodes.map((n) => n.target.join(' ')) }))).toEqual([]);
}

test.describe('axe: empty workspace, system theme', () => {
  for (const path of PAGES) {
    test(`/${path}`, async ({ page }) => {
      await expectNoViolations(page, path);
    });
  }
});

test.describe('axe: dark theme', () => {
  for (const path of ['', 'programs/']) {
    test(`/${path}`, async ({ page }) => {
      await seedStorage(page, { theme: 'dark' });
      await expectNoViolations(page, path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });
  }
});

/** What each populated page must show before axe runs, so the check covers real content, not an empty state. */
const POPULATED: { path: string; ready: (page: Page) => Promise<void> }[] = [
  { path: 'plan/', ready: async (page) => {
    await expect(page.getByRole('article', { name: 'CSIRO Kick-Start' })).toBeVisible();
    // Open the Move to… menu so its items are checked too.
    await page.getByRole('button', { name: 'Move CSIRO Kick-Start to…' }).click();
    await expect(page.getByRole('menuitem', { name: 'Preparing' })).toBeVisible();
  } },
  { path: 'plan/?tab=goals', ready: async (page) => {
    await expect(page.getByText('Submit the Kick-Start EOI').first()).toBeVisible();
  } },
  { path: 'plan/?tab=calendar', ready: async (page) => {
    await expect(page.getByRole('button', { name: 'Export all to calendar (.ics)' })).toBeEnabled();
  } },
  { path: 'assess/results/', ready: async (page) => {
    await expect(page.getByRole('region', { name: /^Act now/ })).toBeVisible();
    // Expand the first row's score breakdown and checks.
    await page.getByRole('button', { name: /^Why\?/ }).first().click();
    await page.getByRole('button', { name: /checks? pass/ }).first().click();
    await expect(page.getByRole('table').first()).toBeVisible();
    await expect(page.locator('button[aria-expanded="true"]')).toHaveCount(2);
  } },
  { path: 'assess/?step=3', ready: async (page) => {
    await expect(page.getByLabel(/^AWS/)).toHaveValue('0');
  } },
  { path: 'assess/?step=5', ready: async (page) => {
    await expect(page.getByLabel('Committed industry partners')).toHaveValue('0');
  } },
  { path: 'programs/csiro-kick-start/', ready: async (page) => {
    await expect(page.getByRole('heading', { level: 1, name: 'CSIRO Kick-Start' })).toBeVisible();
  } },
  { path: 'report/', ready: async (page) => {
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
  } },
  { path: 'settings/', ready: async (page) => {
    await expect(page.getByText(/^Last exported/)).toBeVisible();
    // Check the reset dialog as well as the page behind it.
    await page.getByRole('button', { name: 'Reset everything' }).click();
    await expect(page.getByRole('dialog', { name: 'Reset everything?' })).toBeVisible();
  } },
];

test.describe('axe: populated workspace', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const { path, ready } of POPULATED) {
      test(`/${path} (${theme})`, async ({ page }) => {
        await seedStorage(page, { workspace: populatedWorkspace(), theme });
        await expectNoViolations(page, path, ready);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      });
    }
  }
});
