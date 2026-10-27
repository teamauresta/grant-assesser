import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

/** Escapes a label for use at the start of a RegExp. */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Option labels include their description, so match the label at the start, as a whole word. */
const startsWith = (label: string) => new RegExp(`^${escape(label)}(\\s|$)`);

/** A question rendered as a fieldset: its legend is the group's name. */
const question = (page: Page, legend: string) => page.getByRole('group', { name: startsWith(legend) });

async function choose(page: Page, legend: string, option: string) {
  await question(page, legend).getByRole('radio', { name: startsWith(option) }).check();
}

async function tick(page: Page, legend: string, option: string) {
  await question(page, legend).getByRole('checkbox', { name: startsWith(option) }).check();
}

async function next(page: Page, step: number) {
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText(`Step ${step} of 6`)).toBeVisible();
}

/** A section (board column or results group) found by its heading, which ends in a count. */
const region = (scope: Page | Locator, name: string) => scope.getByRole('region', { name: startsWith(name) });

// The journey checks behaviour, not animation: reduced motion keeps it fast and stable (no
// count-ups, glides, fades or confetti to wait for). tests/e2e/liftoff.spec.ts covers the motion.
test.use({ reducedMotion: 'reduce' });

test('assessment to plan, calendar, report and backup', async ({ page }) => {
  // 1. Home: choose Bootstrapped; the wizard opens at step 1 with it selected.
  await page.goto('./');
  await page.getByRole('link', { name: /^Bootstrapped/ }).click();
  await expect(page).toHaveURL(/\/assess\/\?persona=bootstrapped/);
  await expect(page.getByText('Step 1 of 6')).toBeVisible();
  await expect(question(page, 'Which best describes your company?').getByRole('radio', { name: startsWith('Bootstrapped') })).toBeChecked();

  // 2. The bootstrappedVic answers, step by step.
  await next(page, 2);
  await choose(page, 'Do you have an Australian company with an ACN?', 'Yes');
  await choose(page, 'Is the company registered for GST?', 'Yes');
  await page.getByLabel('When was the company incorporated?').fill('2025-04-27');
  await choose(page, 'Is the company a subsidiary of a foreign company?', 'No');
  await choose(page, 'Where is the company based?', 'Victoria');

  await next(page, 3);
  await choose(page, 'Aggregated annual turnover', 'Under $1M');
  await choose(page, 'Latest funding round', 'None yet');
  await choose(page, 'Is an institutional venture capital fund an investor?', 'No');
  await choose(page, 'Cash you could put towards a matched grant', 'Under $20K');
  const credits = question(page, 'Cloud credits already received');
  for (const provider of ['AWS', 'Azure', 'Google Cloud']) await credits.getByLabel(startsWith(provider)).fill('0');

  await next(page, 4);
  await choose(page, 'How do you make money?', 'Our own product');
  await choose(page, 'Do you have a working MVP?', 'Yes');
  await choose(page, 'Do you have a working website on your company domain?', 'Yes');
  await choose(page, 'Is some of your work genuinely experimental?', 'Yes');
  await choose(page, 'R&D spend this financial year', '$20K to $100K');
  await choose(page, 'Do you record R&D as it happens?', 'Yes');

  await next(page, 5);
  await choose(page, 'Relationship with a university or research organisation', 'None');
  await page.getByLabel('Committed industry partners').fill('0');
  await tick(page, 'Which sectors do you serve?', 'Other');
  await choose(page, 'Strongest evidence from customers', 'Pilots');
  await choose(page, 'Is the company women-led?', 'No');

  await next(page, 6);
  await choose(page, 'Founder hours per week for applications', '2 to 5 hours');
  await choose(page, 'When do you need the funding?', 'Now');
  await page.getByRole('button', { name: 'See results' }).click();

  // 3. Results: R&D Tax Incentive is in Act now (funding); Google Cloud AI is Not a fit (quick wins).
  await expect(page).toHaveURL(/\/assess\/results\/$/);
  const tracks = page.getByRole('tablist', { name: 'Result tracks' });
  await tracks.getByRole('tab', { name: /^Funding/ }).click();
  await expect(region(page, 'Act now').getByRole('link', { name: 'R&D Tax Incentive' })).toBeVisible();
  await tracks.getByRole('tab', { name: /^Quick wins/ }).click();
  await expect(region(page, 'Not a fit').getByRole('link', { name: /^Google for Startups Cloud.*AI/ })).toBeVisible();

  // 4. Add CSIRO Kick-Start to the pipeline; it lands in Considering with its template goals.
  await tracks.getByRole('tab', { name: /^Funding/ }).click();
  // The button's visible text is "Add to pipeline"; the program name is screen-reader only.
  await page.getByRole('button', { name: /^Add to pipeline\W+CSIRO Kick-Start$/ }).click();
  const kickStartRow = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'CSIRO Kick-Start' }) });
  await kickStartRow.getByRole('link', { name: 'View plan' }).click();
  await expect(page).toHaveURL(/\/plan\/$/);
  const card = (column: string) => region(page, column).getByRole('article', { name: 'CSIRO Kick-Start' });
  await expect(card('Considering')).toBeVisible();

  const views = page.getByRole('tablist', { name: 'Plan views' });
  await views.getByRole('tab', { name: /^Goals/ }).click();
  await expect(page.getByText('Submit the Kick-Start EOI').first()).toBeVisible();

  // 5. Move the card to Preparing with the Move to… menu.
  await views.getByRole('tab', { name: /^Pipeline/ }).click();
  await page.getByRole('button', { name: 'Move CSIRO Kick-Start to…' }).click();
  await page.getByRole('menuitem', { name: 'Preparing' }).click();
  await expect(card('Preparing')).toBeVisible();
  await expect(card('Considering')).toHaveCount(0);

  // 6. Calendar: Export all downloads an .ics file with events.
  await views.getByRole('tab', { name: /^Calendar/ }).click();
  const [ics] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export all to calendar (.ics)' }).click(),
  ]);
  expect(ics.suggestedFilename()).toMatch(/\.ics$/);
  expect(await readFile(await ics.path(), 'utf8')).toContain('BEGIN:VEVENT');

  // 7. Report: Download PDF gives a real PDF.
  await page.goto('report/');
  const [pdf] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.getByRole('button', { name: 'Download PDF' }).click(),
  ]);
  const pdfBytes = await readFile(await pdf.path());
  expect(pdfBytes.byteLength).toBeGreaterThan(5 * 1024);
  expect(pdfBytes.subarray(0, 4).toString('latin1')).toBe('%PDF');

  // 8. Settings: export, reset, import the exported file; the pipeline card is back.
  await page.goto('settings/');
  const [backup] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export workspace (.json)' }).click(),
  ]);
  const backupPath = await backup.path();

  await page.getByRole('button', { name: 'Reset everything' }).click();
  const resetDialog = page.getByRole('dialog', { name: 'Reset everything?' });
  await resetDialog.getByLabel('Type reset to confirm').fill('reset');
  await resetDialog.getByRole('button', { name: 'Reset everything' }).click();
  await expect(page.getByRole('status').getByText('Your workspace was reset.')).toBeVisible();

  await page.goto('plan/');
  await expect(page.getByRole('article', { name: 'CSIRO Kick-Start' })).toHaveCount(0);

  await page.goto('settings/');
  await page.getByLabel('Choose a workspace file (.json)').setInputFiles(backupPath);
  await page.getByRole('dialog', { name: 'Replace your workspace?' }).getByRole('button', { name: 'Replace workspace' }).click();
  await expect(page.getByRole('status').getByText(/^Workspace imported/)).toBeVisible();

  await page.goto('plan/');
  await expect(card('Preparing')).toBeVisible();
});
