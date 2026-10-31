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
  // Finite animations only (an infinite one, such as a spinner, would never finish).
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  await page.waitForTimeout(1_500);
}

async function capture(page: Page, name: string, project: string) {
  await settle(page);
  await page.screenshot({ path: join(OUT, `${name}-${project}.png`), fullPage: true });
}

/** Waits for every finite animation on the page to end. */
const finishAnimations = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations()
  .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
  .map((a) => a.finished.catch(() => undefined))));

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

    // The story as a visitor sees it, a screen at a time: the hero (with the diorama), the persona
    // cards, the sort, and How it works after the previews have played.
    // Turning motion back on restarts the headline's rise (motion-safe:), so let it finish first.
    await page.evaluate(() => window.scrollTo(0, 0));
    await frames(page);
    await finishAnimations(page);
    await homePart(page, 'hero', theme, project);
    await page.getByRole('region', { name: 'Where is your company today?' }).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await frames(page);
    await homePart(page, 'personas', theme, project);

    const stage = page.locator('[data-stage]');
    if (project !== 'desktop') {
      // The phone settle part-way: it starts when the stage comes into view and runs for 1.2s.
      await stage.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(500);
      await homePart(page, 'sort-mid', theme, project);
      await page.waitForTimeout(1_000);
      await homePart(page, 'sort-end', theme, project);
    } else {
      // The sort at the start, part-way and the end of its pinned range.
      for (const [part, k] of [['sort-start', 0], ['sort-mid', 0.4], ['sort-end', 1]] as const) {
        await scrollSort(page, k);
        await homePart(page, part, theme, project);
      }
    }
    await page.getByRole('region', { name: 'How it works' }).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await frames(page);
    await finishAnimations(page);
    await homePart(page, 'how', theme, project);
  });
}

// The plan (design doc section 11, Task 8): the pipeline's column windows, the goals and the
// calendar, then viewport shots of a dialog and of an open menu, light and dark.
for (const theme of ['light', 'dark'] as const) {
  test(`plan (${theme})`, async ({ page }, info) => {
    const project = info.project.name;
    await seedStorage(page, { workspace: populatedWorkspace(), theme });
    await page.goto('plan/');
    await expect(page.getByRole('article', { name: 'CSIRO Kick-Start' })).toBeVisible();
    await capture(page, `plan-pipeline-${theme}`, project);

    const card = page.getByRole('article', { name: 'R&D Tax Incentive' });
    await card.getByRole('button', { name: /^Move .* to…$/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Submitted' })).toBeVisible();
    await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: join(OUT, `plan-menu-${theme}-${project}.png`) });
    await page.keyboard.press('Escape');

    await card.getByRole('button', { name: /^More actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Edit notes' }).click();
    await expect(page.getByRole('dialog', { name: 'Notes' })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: join(OUT, `plan-dialog-notes-${theme}-${project}.png`) });
    await page.keyboard.press('Escape');

    await card.getByRole('button', { name: /^More actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Remove from pipeline' }).click();
    await expect(page.getByRole('dialog', { name: /^Remove/ })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: join(OUT, `plan-dialog-confirm-${theme}-${project}.png`) });
    await page.keyboard.press('Escape');

    await page.goto('plan/?tab=goals');
    await expect(page.getByText('Submit the Kick-Start EOI').first()).toBeVisible();
    await capture(page, `plan-goals-${theme}`, project);
    await page.getByRole('button', { name: 'Add goal' }).click();
    await expect(page.getByRole('dialog', { name: 'Add goal' })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: join(OUT, `plan-dialog-goal-${theme}-${project}.png`) });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Add to calendar: Submit the Kick-Start EOI' }).click();
    await expect(page.getByRole('menuitem', { name: /^Google Calendar/ })).toBeVisible();
    await page.screenshot({ path: join(OUT, `plan-menu-calendar-${theme}-${project}.png`) });
    await page.keyboard.press('Escape');

    await page.goto('plan/?tab=calendar');
    await expect(page.getByRole('button', { name: 'Export all to calendar (.ics)' })).toBeEnabled();
    await capture(page, `plan-calendar-${theme}`, project);
    // The seeded goals fall in the coming weeks; show the month with the most of them as pills.
    const month = (iso: string) => iso.slice(0, 7);
    const dates = populatedWorkspace().goals.flatMap((g) => (g.dueDate ? [month(g.dueDate)] : []));
    if (dates.some((d) => d > month(new Date().toISOString()))) {
      await page.getByRole('button', { name: 'Next month' }).click();
    }
    await page.getByRole('table').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: join(OUT, `plan-calendar-month-${theme}-${project}.png`) });
  });
}

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

// Results (design doc section 11, Task 7): the funding window, the suggested goal and the result
// cards, Not a fit cards quiet. Bootstrapped opens on Quick wins; then the Funding tab.
for (const theme of ['light', 'dark'] as const) {
  test(`results (${theme})`, async ({ page }, info) => {
    await seedStorage(page, { workspace: populatedWorkspace(), theme });
    await page.goto('assess/results/');
    await expect(page.getByRole('region', { name: /^Act now/ })).toBeVisible();
    await capture(page, `results-quick-wins-${theme}`, info.project.name);
    await page.getByRole('tablist', { name: 'Result tracks' }).getByRole('tab', { name: /^Funding/ }).click();
    await expect(page.getByRole('region', { name: /^Not a fit/ })).toBeVisible();
    await capture(page, `results-funding-${theme}`, info.project.name);
  });
}

// Settings, the 404 and the banners (design doc section 11, Task 9): the section windows with the
// backup reminder (exported a month ago), the reset dialog with its Close button focused (the outline
// drawn inside the bar's corner), the 404 window, and both storage warnings.
for (const theme of ['light', 'dark'] as const) {
  test(`settings, 404 and banners (${theme})`, async ({ page, context }, info) => {
    const project = info.project.name;
    const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    await seedStorage(page, { workspace: { ...populatedWorkspace(), createdAt: monthAgo, lastExportedAt: monthAgo }, theme });
    await page.goto('settings/');
    await expect(page.getByRole('complementary', { name: 'Backup reminder' })).toBeVisible();
    await capture(page, `settings-${theme}`, project);
    await page.getByRole('button', { name: 'Reset everything' }).click();
    await expect(page.getByRole('dialog', { name: 'Reset everything?' })).toBeVisible();
    await settle(page);
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.screenshot({ path: join(OUT, `settings-dialog-close-focus-${theme}-${project}.png`) });

    await page.goto('no-such-page/');
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await capture(page, `404-${theme}`, project);

    // Storage that cannot save (every write but the rescue copy fails) and a workspace that cannot be read.
    const banners = await context.newPage();
    await banners.addInitScript((t) => {
      localStorage.setItem('gn-theme', t);
      if (!sessionStorage.getItem('banners')) { sessionStorage.setItem('banners', '1'); localStorage.setItem('gn-workspace', '{"broken":'); }
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
        if (this === window.localStorage && !k.startsWith('gn-workspace-corrupt-') && k !== 'gn-theme') throw new Error('QuotaExceededError');
        set.call(this, k, v);
      };
    }, theme);
    await banners.goto('programs/');
    await expect(banners.getByRole('complementary', { name: 'Storage warning' })).toBeVisible();
    await expect(banners.getByRole('button', { name: 'Download the old data' })).toBeVisible();
    await banners.screenshot({ path: join(OUT, `banners-${theme}-${project}.png`) });
  });
}

// Every art slot with the real pictures (design doc section 11, Art landed): with an empty workspace,
// the program page's Eligibility window and the empty states, each slot's window or card close up;
// with a populated one, the results (celebrate, compass) and report (stamp) slots in the viewport.
// The hero, personas, How it works and 404 slots are in the shots above.
/** A close-up of the window or card around the first visible slot showing `art`. */
async function closeUp(page: Page, art: string, file: string) {
  const slot = page.locator(`[data-art="${art}"]:visible`).first();
  await expect(slot).toBeVisible();
  await slot.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await frames(page);
  const frame = slot.locator('xpath=ancestor::*[self::section or self::article][1]');
  await ((await frame.count()) ? frame : slot).screenshot({ path: join(OUT, file) });
}

for (const theme of ['light', 'dark'] as const) {
  test(`art slots (${theme})`, async ({ page }, info) => {
    const project = info.project.name;
    const shot = (name: string) => `art-${name}-${theme}-${project}.png`;
    await seedStorage(page, { theme });

    await page.goto('programs/rdti/');
    await settle(page);
    await closeUp(page, 'platypus-reading', shot('eligibility-reading'));

    await page.goto('programs/');
    await page.getByLabel('Search programs').fill('zzzz no such program');
    await expect(page.getByText('No programs match.')).toBeVisible();
    await settle(page);
    await closeUp(page, 'platypus-search', shot('directory-empty'));

    await page.goto('plan/');
    await settle(page);
    await capture(page, `art-plan-empty-${theme}`, project);
    await closeUp(page, 'prop-filing-cabinet', shot('plan-pipeline-empty'));
    await page.getByRole('tab', { name: /^Goals/ }).click();
    await settle(page);
    await closeUp(page, 'platypus-search', shot('plan-goals-empty'));

    await page.goto('./');
    await settle(page);
    await page.locator('header:visible').first().screenshot({ path: join(OUT, shot('top-bar')) });
  });

  test(`art slots, populated (${theme})`, async ({ page }, info) => {
    const project = info.project.name;
    const shot = (name: string) => `art-${name}-${theme}-${project}.png`;
    await seedStorage(page, { workspace: populatedWorkspace(), theme });
    await page.goto('assess/results/');
    await expect(page.getByRole('region', { name: /^Act now/ })).toBeVisible();
    await settle(page);
    // The compass shows from 640px only (on a phone the figures keep the width).
    for (const [name, art] of [['results-celebrate', 'platypus-celebrate'], ['results-compass', 'prop-compass']] as const) {
      const slot = page.locator(`[data-art="${art}"]:visible`).first();
      if (!(await slot.count())) continue;
      await slot.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await frames(page);
      await page.screenshot({ path: join(OUT, shot(name)) });
    }
    await page.goto('report/');
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
    await settle(page);
    await page.screenshot({ path: join(OUT, shot('report-stamp')) });
  });
}
