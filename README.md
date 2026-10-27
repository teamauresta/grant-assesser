# Grant Navigator

A free tool that helps Australian AI startups find the grants, tax incentives, credits and accelerators they can use, and plan the work to apply for them.

## What it does

- **Personas.** Start as Bootstrapped, Pre-raise or VC-backed. The persona sets sensible defaults and tailors the advice on each program.
- **Verified program directory.** 35 federal, Victorian, industry and university programs, each with its sources, a last-verified date and a changelog. Search and filter by status, type and level, see what closes soon, and browse a deadline calendar.
- **Assessment.** A short wizard checks your answers against each program's eligibility rules. Each program lands in one of four groups: Act now, Prepare, Watch or Not a fit. Each group comes with reasons and fixes, and you get an estimate of the funding you could reach.
- **Plan and calendar.** Track applications on a pipeline board, work through goals generated from each program, and add deadlines to Google Calendar or Outlook, or download them as `.ics` files.
- **PDF report.** Build a report of your results and plan, preview it and download it as a PDF.
- **Motion and celebrations.** A drifting particle hero, gentle transitions, a plan progress ring and a short burst of confetti when you finish the assessment or submit or win an application. All motion stops when your device is set to reduce motion, and confetti can be turned off in **Settings**.

Program status (open, closing soon, closed) is worked out in your browser from today's date, so it never goes stale between deploys.

## Privacy

Everything stays in your browser. Your answers, pipeline and goals are saved in `localStorage` on this device only. Nothing is sent to a server, and there are no accounts and no analytics. Use **Settings** to export a backup file, import one on another device, or reset everything.

## Local development

You need Node (version in `.nvmrc`) and pnpm.

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000/grant-assesser/ (the app is served under the `/grant-assesser` base path, as on GitHub Pages).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server on port 3000 |
| `pnpm test` | Unit, component, content and persona snapshot tests (Vitest) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm e2e` | End-to-end journey and axe accessibility tests (Playwright), at 375px and 1280px. Builds and serves the static export first unless a server is already running on port 4173 |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm build` | Static export into `out/` |
| `pnpm serve` | Serves `out/` the way GitHub Pages does, at http://localhost:4173/grant-assesser/ |
| `pnpm size` | Checks the home page's first-load JavaScript (gzipped) against its budget. Run after `pnpm build` |
| `pnpm freshness` | Prints a Markdown report of stale program data, closes within 30 days, past closes that need a decision, and broken or blocked source links |

Before the first `pnpm e2e`, install the browser once with `pnpm exec playwright install chromium`. `SCREENS=1 pnpm e2e tests/e2e/screens.spec.ts` saves review screenshots of the home, plan and results pages to `test-results/screens/`.

## Updating a program

Each program is a single typed record in `content/programs/<slug>.ts`, validated by the Zod schema in `lib/schema.ts` when the app loads it.

1. Edit `content/programs/<slug>.ts`. Check every fact against the provider's own pages.
2. A program can only be `open` or `rolling` if it cites at least one source with `official: true`. Use `unverified` when you cannot confirm the status officially.
3. Set `verification.lastVerified` to today's date. Programs not verified within 60 days are flagged as stale in the app and in the freshness report.
4. Add a `changelog` entry with today's date and a one-line note of what changed.
5. Run `pnpm test`. The persona snapshot tests in `tests/content/personas.test.ts` show how three sample companies are grouped for every program. If your change moves a program between groups, the snapshot fails: check that the new result is right, then update it with `pnpm vitest run tests/content/personas.test.ts -u`.

To add a program, create a new file and register it in `content/programs/index.ts`.

## Deployment

The site is deployed by GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`: it runs `pnpm build` and publishes the static export in `out/`.

**One-time setup (repo owner):**

- Go to **Settings** > **Pages** > **Build and deployment** and set **Source** to **GitHub Actions**. The workflow does not change this setting itself.
- Keep **Issues** enabled for the repository, so the freshness workflow can post its report.

Other workflows:

- `.github/workflows/ci.yml` runs type check, lint, unit tests and end-to-end tests on pull requests and pushes to other branches.
- `.github/workflows/freshness.yml` runs `pnpm freshness` every Monday morning (Melbourne) and updates a single "Program data freshness" issue listing stale programs, closes within 30 days, past closes that need a decision, and broken or blocked source links. It never changes the site.

### Custom domain (optional)

1. Add a `CNAME` file with your domain name to `public/`, so it ships in `out/`.
2. Configure DNS with your domain provider.
3. Enable HTTPS in the GitHub Pages settings.

A custom domain serves the site from `/`, so `basePath` in `next.config.ts` would also need to change.

## Project structure

```
app/                 Routes: home, programs, programs/[slug], assess, assess/results, plan, report, settings, 404
components/          UI by feature: ui, layout, home, programs, assess, results, plan, calendar, report, settings
content/programs/    One verified record per program, plus index.ts that validates and exports them
content/verification Fact-check evidence behind the launch data
lib/                 Logic: schema, gates, status, scoring, assessment, plan, calendar, store, pdf, dates
scripts/             serve-out.mjs (local static server), check-freshness.ts (weekly data check), js-size.mjs (JS budget)
tests/               Vitest unit, component and content tests; Playwright e2e and axe tests in tests/e2e
docs/plans/          Design document and implementation plan
public/              Static files copied into out/ (fonts, .nojekyll)
legacy/              The previous single-file React app, kept for reference
```

## Legacy app

The original single-file app (`index.html`, `base.jsx` and its `404.html`) is in `legacy/`. It is not built, linted, type-checked or deployed, and its program data is out of date.

## Tech stack

Next.js 16 (static export), React 19, TypeScript, Tailwind CSS 4, Zod 4, Zustand 5, Lucide icons, `@react-pdf/renderer`, `motion`, tsParticles, `canvas-confetti`, Vitest and Playwright with axe.

## License

MIT
