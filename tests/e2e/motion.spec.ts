import { expect, test, type Page } from '@playwright/test';
import { populatedWorkspace, seedStorage } from './helpers';

/**
 * Motion's features (domMax) load in their own chunk after hydration. Until they arrive, and for
 * good if the chunk fails, an m.* element cannot animate, so nothing may start hidden. These tests
 * abort that chunk, then change what is shown, and check every new element is fully opaque.
 * (toBeVisible() passes at opacity 0, so check the computed opacity.)
 */
async function blockMotionFeatures(page: Page) {
  const blocked = { count: 0 };
  await page.route('**/_next/static/chunks/*.js', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    // A drag option only domMax carries; the m component and the rest of the app never include it.
    if (body.includes('dragSnapToOrigin')) {
      blocked.count += 1;
      return route.abort();
    }
    return route.fulfill({ response, body });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { blocked, errors };
}

test('directory cards stay visible when motion features fail to load', async ({ page }) => {
  const { blocked, errors } = await blockMotionFeatures(page);
  await page.goto('programs/');
  await page.waitForLoadState('networkidle');
  await expect.poll(() => blocked.count).toBeGreaterThan(0);

  const cards = page.getByRole('list').filter({ has: page.locator('article') }).locator(':scope > li');
  const before = await cards.count();
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect.poll(() => cards.count()).toBeGreaterThan(before);
  for (const card of await cards.all()) await expect(card).toHaveCSS('opacity', '1');
  expect(errors).toEqual([]);
});

test('report sections stay visible when motion features fail to load', async ({ page }) => {
  const { blocked, errors } = await blockMotionFeatures(page);
  await page.goto('report/');
  await page.waitForLoadState('networkidle');
  await expect.poll(() => blocked.count).toBeGreaterThan(0);

  const cover = page.getByRole('checkbox', { name: /^Cover/ });
  const section = page.getByRole('article', { name: 'Report preview' }).locator(':scope > div', { hasText: 'Funding report' });
  await expect(cover).toBeChecked();
  await cover.uncheck();
  await expect(section).toHaveCount(0);
  await cover.check();
  await expect(section).toHaveCSS('opacity', '1');
  expect(errors).toEqual([]);
});

test('pipeline cards stay visible, and glide-free, when motion features fail to load', async ({ page }) => {
  await seedStorage(page, { workspace: populatedWorkspace() });
  const { blocked, errors } = await blockMotionFeatures(page);
  await page.goto('plan/');
  await page.waitForLoadState('networkidle');
  await expect.poll(() => blocked.count).toBeGreaterThan(0);

  const cards = page.locator('li[data-app-id]');
  await expect(cards).toHaveCount(2);
  for (const card of await cards.all()) await expect(card).toHaveCSS('opacity', '1');

  await page.getByRole('button', { name: 'Move CSIRO Kick-Start to…' }).click();
  await page.getByRole('menuitem', { name: 'Submitted' }).click();
  const moved = page.getByRole('region', { name: /^Submitted/ }).locator('li[data-app-id="app-kick-start"]');
  await expect(moved).toHaveCount(1);
  await expect(moved).toHaveCSS('opacity', '1');
  await expect(moved.getByRole('article', { name: 'CSIRO Kick-Start' })).toBeFocused();
  expect(errors).toEqual([]);
});
