# Grant Navigator — Design

**Date:** 27 October 2026 (fact-checks run 26 October 2026)
**Branch:** `rebuild/grant-navigator`
**Status:** Approved in brainstorming session

## Purpose

Rebuild the grant assessment tool as a web app that lets Australian tech startups:

1. Browse a verified directory of grants, tax incentives, credits, accelerators and capital programs.
2. Self-assess eligibility under one of three personas: **Bootstrapped**, **Pre-raise**, **VC-backed**.
3. Track applications in a pipeline, with goals beneath each application.
4. Push goals and deadlines to their own calendar with reminders.
5. Export a PDF report at any time for themselves, a board, investors or advisers.

The 26 October 2026 research report (`australian-ai-startup-funding-report.md`) was fact-checked against official sources before use. The results are in the appendix and are the seed data. The report itself is not the source of truth.

## Decisions

| Topic | Decision |
|---|---|
| Hosting and data | Static site. Data lives in the browser behind an async storage interface, so accounts and sync can be added later without a rewrite. |
| Stack | Next.js (App Router) with `output: 'export'`, TypeScript, Tailwind CSS. |
| Personas | Bootstrapped, Pre-raise, VC-backed. Can be switched at any time. |
| Tracking | Pipeline board (applications), with goals and steps underneath. Users can add their own goals. |
| Program data | One typed file per program in the repo, validated with Zod at build. |
| Coverage | Federal, industry/credits, national accelerators and full Victorian coverage. Other states later, as data only. |
| PDF | One report with selectable sections, readable by founders, boards and advisers. |
| Design | Modern minimalism (Swiss): neutral palette, a single teal accent, Geist type, 1px borders, no shadows or gradients. |

## 1. Screens and navigation

```
/                    Home: persona picker → start; "Closing soon" strip; "Due this week" strip
/programs            Directory: search + filters (status · type · level · persona fit · deadline).
                     Default filter is Open + Upcoming.
/programs/[slug]     Program page: what it is, amounts, eligibility checks, how to apply, prepare
                     list, mistakes, stacking, sources, verified date, change log.
                     Actions: Add to pipeline, Add deadline to calendar
/assess              Wizard: persona first, then ~6 short steps, autosaved
/assess/results      Groups: Act now · Prepare · Watch · Not a fit.
                     Two tracks: Funding (cash/tax) and Quick wins (credits/free services)
/plan                Tabs: Pipeline (board) · Goals · Calendar (month + agenda; export)
/report              Tick sections → preview → download PDF
/settings            Persona, financial-year end, export/import workspace, reset
```

- Desktop has a top bar (Programs · Assess · My Plan · Report, plus a persona chip). Mobile has a bottom bar with the same four items, each with an icon and a label.
- Every program and goal has its own URL, used as the link back from calendar events.
- **Persona effects:**
  - Visibility: programs that need VC funding are shown greyed out with the reason, never hidden.
  - Ranking weights.
  - Wording and default plan: bootstrapped leads with customer-funded pilots; VC-backed leads with VC-gated credits.

### Visual system — modern minimalism

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FFFFFF` | `#09090B` | Page |
| `--surface` | `#FAFAFA` | `#18181B` | Cards, panels |
| `--border` | `#E4E4E7` | `#27272A` | All separation; no shadows |
| `--fg` | `#09090B` | `#FAFAFA` | Text |
| `--muted-fg` | `#52525B` | `#A1A1AA` | Secondary text (AA contrast) |
| `--primary` | `#18181B` | `#FAFAFA` | The one primary button per screen |
| `--on-primary` | `#FFFFFF` | `#09090B` | Text on primary |
| `--accent` | `#0F766E` | `#2DD4BF` | Links, focus ring, progress, selected state |

- **Status colours:** used only on status pills, which always carry an icon and a label.
  - Open: green
  - Closing in ≤14 days: amber
  - Upcoming / unverified: grey outline
  - Paused / closed: grey, with the date struck through

  The accent is never used for status.
- **Type:** Geist Sans for text and Geist Mono for amounts, dates and countdowns (tabular figures).
  - Scale: 12/14/16/20/24/32/48.
  - Headings: weight 600, slightly tight tracking.
  - Body: line-height 1.6.
- **Layout:** 4px spacing scale; 12-column grid, max width 1120px.
- **Shape:** radius 8px on cards, 6px on inputs and buttons.
- **Icons:** Lucide, 1.5px stroke, 16 and 20px. No emoji.
- **Motion:** 150–200ms opacity and transform only, disabled under `prefers-reduced-motion`.
- **Accessibility:**
  - WCAG AA contrast and visible focus rings.
  - Skip link.
  - Touch targets of at least 44px.
  - The pipeline works from the keyboard: each card has a "Move to…" menu as an alternative to dragging.
  - Light and dark themes are designed together.

## 2. Program data and eligibility rules

### Program schema (`content/programs/<slug>.ts`, validated by `content/schema.ts`)

```ts
{
  slug, name, provider,
  level: 'federal' | 'vic' | 'industry' | 'university',
  type: 'tax-incentive' | 'grant' | 'voucher' | 'credits' | 'accelerator' | 'capital' | 'service' | 'investor-incentive',
  benefit: { kind: 'cash' | 'tax-offset' | 'credits' | 'equity' | 'in-kind' | 'service',
             min?, max?, currency: 'AUD' | 'USD', note },
  status: { state: 'open' | 'rolling' | 'upcoming' | 'paused' | 'closed' | 'unverified', note? },
  deadlines: Array<{ label, date, time?, tz? } | { label, relative: 'fyEnd+10m' }>,
  gates: Array<GateRef>,            // 'au-entity' | { id: 'incorporated-within', months: 24 } ...
  scores: { funding, value, effort, speed },   // 0–5 program baselines
  personas: Partial<Record<Persona, string>>,  // persona-specific note
  goalTemplate: Array<{ title, offsetDays?, beforeDeadlineBusinessDays? }>,
  stacking: Array<{ with: slug, note }>,
  content: { summary, howToApply: string[], prepare: string[], mistakes: string[] },
  verification: { lastVerified: 'YYYY-MM-DD', sources: Array<{ url, title, official: boolean }> },
  changelog: Array<{ date, note }>,
}
```

### Eligibility checks (`lib/gates/`)

- Each check is a named, parameterised function that returns `{ result: 'pass' | 'fail' | 'unknown', reason, fix? }`, with a severity of `hard` or `soft`.
- An unanswered question always gives `unknown`, never `pass`.
- **Starting set:**
  - `au-entity`, `gst-registered`, `not-foreign-subsidiary`
  - `incorporated-within{months}`, `turnover-under{aud}`, `turnover-or-age{turnoverUnder, yearsUnder}`
  - `product-company`, `vc-funded`, `funding-stage-before{stage}`, `last-round-within{months, stage}`
  - `prior-credits-max{provider, usd}`, `cash-match{min}`
  - `rd-spend-over{aud}`, `experimental-activities`
  - `research-partner`, `industry-partners{count}`
  - `state-is{state}`, `sector-any{sectors}`, `women-led`

### Result groups

- **Act now:** status is open or rolling, and every hard check passes.
- **Prepare:** open or rolling, but a hard check is unknown or fixable (for example cash match not yet available), or a soft check fails.
- **Watch:** status is upcoming, paused or unverified.
- **Not a fit:** a hard check fails and can't be fixed. The program is shown greyed out with the reason.

### Assessment questions

- **Company basics:** persona; ACN; GST registration; incorporation date; foreign parent; state; financial-year end.
- **Turnover and R&D:** aggregated turnover band; R&D spend band; whether the work is experimental; whether R&D records are kept contemporaneously.
- **Business model:** product or services.
- **Funding history:** funding stage and date of the last round; prior credits from AWS, Azure and GCP.
- **Capacity and evidence:** cash available for matching; research partner; industry partners; sectors; customer evidence; founder hours per week; urgency.
- **Optional:** women-led (with "prefer not to say").

### Scoring (`lib/scoring/`)

- The five dimensions, each 0–5:
  - **Funding** and **Value** come from the program file.
  - **Probability** comes from the soft checks.
  - **Effort** and **Speed** start from the program baseline and are adjusted for founder hours and urgency.
- **Persona weights:**

  | Persona | funding | probability | effort | value | speed | Extra |
  |---|---|---|---|---|---|---|
  | Bootstrapped | 1.0 | 1.2 | 1.3 | 1.0 | 1.3 | Cash-match penalty |
  | Pre-raise | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | — |
  | VC-backed | 1.3 | 1.0 | 0.8 | 1.2 | 1.0 | — |

- Ranking is within two tracks: **Funding** (cash, tax-offset) and **Quick wins** (credits, service). The detail view shows the score breakdown and a plain-English "why".
- **Funding estimate:**
  - Counts only cash and tax offsets where every hard check passes, as a range labelled "potential, not secured".
  - Credits are shown separately, in USD.
  - Consortium totals are never counted; CRC-P shows the company share only.

### Status worked out in the browser (`lib/status/`)

- A closing date in the past makes the program **closed**.
- A closing date within 14 days makes it **closing soon**.
- `lastVerified` older than 60 days shows **Needs re-check**.
- Relative deadlines are worked out from the user's financial-year end (default 30 June). For R&D Tax: FY end + 10 months, so 30 April 2027 for FY2026.

## 3. Storage, calendar and PDF

### Storage (`lib/store/`)

- **Workspace format:**

  ```ts
  { schemaVersion, workspaceId, profile, pipeline: Application[], goals: Goal[],
    settings, lastExportedAt?, lastCalendarExportAt?, createdAt, updatedAt }
  ```

  Every record has a UUID `id` and an `updatedAt`, ready for record-by-record merging in future.
- **Storage interface:** `WorkspaceStore` with `load()`, `save(ws)` and `subscribe(cb)`, all async. The `LocalWorkspaceStore` implementation uses `localStorage`, with every access wrapped in try/catch. If storage is unavailable, the app falls back to memory and shows a banner.
- **App state:** Zustand, saving 500ms after each change. Format upgrades run on load, keyed by `schemaVersion`.
- **Export/import:** export downloads `.json`. Import validates with Zod, shows a summary of what the file contains and asks before replacing anything. After 14 days with edits but no export, a backup prompt appears.
- **Privacy:** no data leaves the browser. No analytics at launch.

### Pipeline and goals

- **`Application`:**
  - Fields: `programSlug | customName`, `stage`, `expectedAmount?`, `keyDates`, `notes`.
  - Stages: considering → preparing → submitted → awarded | declined | withdrawn.
- **`Goal`:**
  - Fields: `applicationId?`, `title`, `dueDate`, `status`, `steps[]`, `reminderOffsetsDays` (default `[7, 1]`), `source`.
  - Statuses: todo · doing · done · blocked.
  - Sources: template · user.
- **Starter goals:** adding a program to the pipeline creates goals from its `goalTemplate`. Due dates count back from the next deadline in business days, or forward from today for rolling programs.

### Calendar (`lib/calendar/`)

- **Per item:** Google Calendar and Outlook web links that need no sign-in, plus a `.ics` download.
- **Export all:** one `.ics` with every goal and every deadline in the pipeline.
- **Reminders:** `VALARM` alarms at each reminder offset.
- **Time zones:**
  - A deadline with a time keeps its real time zone (for example WorkSafe 2pm `Australia/Melbourne`, which is AEDT in November).
  - Due dates are all-day events.
- **Stable IDs:** `UID = <id>@grant-navigator` with an incrementing `SEQUENCE`, so Apple Calendar and Outlook update events on re-import. Google's import is less reliable at this, and the app says so.
- **Link back:** the event description links to the item in the app.
- **Changes since export:** the app counts changes since `lastCalendarExportAt` and prompts a re-export.
- **Limits:** no live feed or push notifications at launch. A `webcal://` feed comes with accounts.

### PDF (`lib/pdf/`)

- Built with `@react-pdf/renderer`, loaded only on `/report`.
- **Selectable sections:**
  - Cover
  - Assessment summary
  - Matched programs by group, each with status, verified date and sources
  - Funding estimate: cash/tax range, credits separate
  - Pipeline
  - Goals and deadlines for the next 90 days
  - Readiness gaps: unknown or failed checks, each with its fix
  - Stacking notes
  - Sources appendix
- **Filename:** `<company>-funding-report-<YYYY-MM-DD>.pdf`.
- **Footer on every page:** "Generated <date> · Program data verified as of <oldest lastVerified among included programs> · General information, not financial or tax advice."

## 4. Launch data and keeping it current

### Record rules

1. Only an official source can make a program open or rolling. Secondary-only information gives `unverified`, with a note.
2. Every amount, date and check has a source with a retrieval date. Contradictory official wording is recorded on the program page.
3. Each program file carries a change log, shown on its page.
4. The fact-check evidence lives in `content/verification/2026-10-26.md` and is not shipped to users.

### Upkeep

- Status is worked out automatically, as described in Section 2.
- A weekly GitHub Action checks every source link and lists stale programs and programs closing within 30 days. It opens a single issue and has no effect on the live site.
- Optional, after launch: a scheduled monthly Claude agent re-runs the fact-checks and opens a pull request for a person to review.

## 5. Testing, deployment and build order

### Testing

- **Unit (Vitest):**
  - Eligibility checks, including the unknown case.
  - Scoring with each persona's weights.
  - Status with a fixed "now".
  - Relative deadlines.
  - Back-counting due dates in business days.
  - `.ics` output: time zone, alarms, UID.
  - Store upgrades and rejecting bad imports.
- **Persona tests:** fixed sample profiles for each persona, run against the real program data, with results compared to saved expectations.
- **Content checks:**
  - Every program file matches the schema.
  - Every open or rolling program has an official source.
  - No open program has a closing date in the past (a CI warning, since status is worked out at runtime anyway).
- **End-to-end (Playwright),** at 375px and 1280px: persona → assess → results → add to pipeline → goals appear → `.ics` download → PDF download (file not empty) → export and re-import the workspace. axe accessibility checks on every route, plus a dark-mode pass.

### Deployment

- Static export with `basePath: '/grant-assesser'`, deployed to GitHub Pages (`teamauresta/grant-assesser`) by GitHub Actions.
- CI on every pull request: type check, lint, unit, persona and content tests, build, end-to-end.
- **Switch-over:**
  - The existing `index.html`, `base.jsx` and `404.html` stay in place until the new app passes all tests.
  - They then move to `legacy/`.
  - The old app saves no data, so there is nothing to migrate.

### Build order

1. Foundation: scaffold, design tokens, UI pieces, schema, program data, directory and program pages.
2. Assessment: wizard, eligibility checks, scoring, result groups.
3. Plan: storage, pipeline, goals, calendar export, due-this-week strip.
4. Reports: report builder and PDF.
5. Hardening: end-to-end and accessibility tests, freshness check, switch-over.

---

## Appendix A — Fact-check register (26 Oct 2026)

Verdicts compare the research report against official sources. "Meta" means a page's metadata date. Several business.gov.au pages share a site-wide 16 Sep 2026 date.

### Federal

| Program | Launch status | Verified facts | Source |
|---|---|---|---|
| R&D Tax Incentive | rolling; deadline FY end + 10 months | Refundable offset = company tax rate + 18.5 pts (43.5% at 25%), if aggregated turnover is under $20M and the company isn't controlled by exempt entities. Otherwise non-refundable: tax rate + 8.5% up to 2% R&D intensity, +16.5% above. Notional deductions must exceed $20,000, unless paid to an RSP or CRC. Registration within 10 months of year-end (30 Apr 2027 for FY2026), and registration does not confirm eligibility. Grants and recoupments trigger clawback (Subdiv 355-G; CRC Program recoupments exempt). **Proposed from 1 Jul 2028 (not yet law):** core offset +4.5 pts; supporting R&D no longer eligible; intensity threshold 2%→1.5%; refundability only in first 10 years (15 for therapeutic goods); minimum spend $20K→$50K; refundable turnover threshold $20M→$50M; expenditure cap $150M→$200M. | business.gov.au/grants-and-programs/research-and-development-tax-incentive ; ato.gov.au rates & steps pages (13 May 2026 meta) ; ato.gov.au/about-ato/new-legislation/in-detail/businesses/tax-reform-better-targeting-the-research-and-development-tax-incentive |
| CSIRO Kick-Start | rolling | $20K–$60K per voucher, matched 1:1 in **cash paid to CSIRO** (in-kind not matched). Up to 2 vouchers; the second only after the first is complete, and related companies count. Eligible if turnover and opex are under $10M in the last FY **or** the company has been registered under 3 years (the FAQ words this differently: "current and two previous FYs", so confirm with kickstart@csiro.au). ACN/ICN, GST, non-tax-exempt, primary place of business in Australia; Australian subsidiaries of foreign entities excluded. EOI reviewed within 5 working days; researcher match in 2–6 weeks. Not a competitive round, but at CSIRO's discretion and subject to capability and funds. Projects run 2–12 months; agreement signed within 60 days. | csiro.au/en/work-with-us/funding-programs/SME/CSIRO-Kick-Start/Eligibility-and-funding ; …/FAQs ; Guidelines v3 (Aug 2026) |
| CRC-P | **unverified** (Round 20) | The official page says "currently closed to applications". Round 19 closed 12 May 2026 (included up to $20M for AI projects); outcomes expected Oct 2026. No open opportunity on GrantConnect. Flinders lists Round 20 as "second half 2026", undated. Terms: $100K–$3M, up to 3 years, applicants at least match in cash and/or in-kind. Lead SME with ABN, GST registration, Australian incorporation and trading corporation status; plus another Australian industry organisation and one Australian research organisation. | business.gov.au/grants-and-programs/cooperative-research-centres-projects-crcp-grants ; grants.gov.au ; staff.flinders.edu.au/research/funding/industry-and-government |
| CRC AI Accelerator Round 28 | upcoming (2027) | Ministerial release of 11 Mar 2026: about $50M CRC (not CRC-P) AI round opening in 2027. | industry.gov.au CRC program |
| Industry Growth Program | paused | "This program is currently paused to new applications." No reopening date. | business.gov.au/grants-and-programs/industry-growth-program |
| EMDG | paused | No rounds open; Round 4 closed. Independent review (2026) released, with the Minister considering its recommendations. No official Round 5 details. | austrade.gov.au/en/how-we-can-help-you/grants/export-market-development-grants |
| BRII | closed | "There are currently no rounds open for application." | business.gov.au/grants-and-programs/business-research-and-innovation-initiative |
| Australia's Economic Accelerator | closed | No new projects beyond 2025–26; existing grants run to 30 Jun 2028. | education.gov.au/australias-economic-accelerator |
| AI Adopt centres | rolling (service) | The centre grant is closed. Centres provide free specialist services to eligible SMEs in NRF priority sectors (e.g. SMEC AI, ARM Hub). | business.gov.au/expertise-and-advice/ai-adopt-centres |
| Defence Industry Development Grants | unverified (in flux) | Sovereign Industrial Priorities temporarily closed. Exports ($15K–$250K) and Security ($10K–$100K) batches close 31 Oct 2026, 11:59pm AEST. New guidelines expected by 3 Nov 2026. Extended to 2030 with +$80M. | business.gov.au/grants-and-programs/defence-industry-development-grants-program |
| ARENA Advancing Renewables | open (rolling) | Continuously open until funds are exhausted; only fits energy-related AI. | arena.gov.au/funding/advancing-renewables-program/ (2 Apr 2026) |
| CSIRO Innovate to Grow | upcoming | The DigiTech & AI intake was Queensland-only and closed 27 Sep 2026. Intakes are monthly and sector-specific; no Victorian or national intake open. | csiro.au/en/work-with-us/funding-programs/SME/Innovate-to-Grow |
| National Industry PhD | closed | Round 8 closed 21 Aug 2026; no next round listed. | niphd.com.au/important-dates |
| APR.Intern | rolling (paid service) | Ex-GST: 3 months $19,900, 4 months $23,200, 5 months $26,500, 6 months $29,800. Custom internships $2,500 less. Subsidies are Defence/WA-specific only. | aprintern.org.au/business-info/costs-rebates/ |
| ESIC | rolling (investor incentive) | 20% non-refundable offset for investors, capped at $200K per investor and affiliates per year. Non-sophisticated investors: $50K investment limit. Modified CGT treatment. | ato.gov.au …/tax-incentives-for-early-stage-investors (16 Aug 2024) |
| RDTI financing | not listed as a program | No government-backed advance; private lenders only. Advance findings give certainty about eligibility, not cash. | business.gov.au RDTI overview |

### Industry and credits

| Program | Launch status | Verified facts | Source |
|---|---|---|---|
| Microsoft for Startups | rolling | Up to US$150K credits unlocked over time with verified progress. Privately held, for-profit, company-owned software; before Series C; no more than US$350K lifetime Azure credits; not a consultancy or agency. Reviewed in about 3 business days. | learn.microsoft.com/en-us/startups/microsoft-for-startups/overview (updated 5 Aug 2026) |
| AWS Activate Founders | rolling | Starts at US$1K; select participants up to US$5K. Pre-Series B, founded within 10 years, AWS account on a paid tier. Processing **5–10** business days. | aws.amazon.com/startups/credits |
| AWS Activate Portfolio | rolling | Up to US$200K; requires an Org ID from an Activate Provider (VC or accelerator). Invite-only AI tier of US$200K+ afterwards. | aws.amazon.com/startups/credits |
| Google for Startups Cloud — Start | rolling | US$2K credits, valid 12 months. Founded within 24 months; working MVP; business model; plans to seek VC. No GCP credits beyond the free trial. 18-character billing account ID. No paid Workspace plan on the company domain (or one within 31 days). Agencies and consultancies excluded. | cloud.google.com/startup/pre-funded |
| Google for Startups Cloud — AI (Scale) | rolling | Up to US$350K over 2 years (Y1 up to US$250K for AI-first; Y2 20% up to US$100K). Gemini as the foundation of the product. Founded within 5 years. Pre-seed/seed within 5 years, or Series A within 12 months. No more than US$5K prior GCP credits. **VC-funded only; angel funding, grants and crowdfunding don't qualify.** | cloud.google.com/startup/ai |
| NVIDIA Inception | rolling | Free; no fees or equity. Working website, incorporated, under 10 years old, clear use case for NVIDIA technology, actively run by at least one founder. No deadlines or cohorts. No cash; partner credits, preferred pricing and DLI courses. Consultancies, resellers and public companies excluded. | nvidia.com/en-us/startups/ |
| Cloudflare for Startups | rolling | Tiers: US$5K (bootstrapped), US$25K, US$100K (seed $1–5M with an approved VC or accelerator), US$250K (high-growth AI / Tier-1 VC). Founded within 5 years; funded up to Series B. Credits expire after 1 year. | cloudflare.com/en-au/hatch/ |
| Claude for Startups | closed (cohort full) | "Current cohort is now full… not accepting new applications." Startups backed by a partner-network VC can get up to US$100K in API credits through their VC. | claude.com/programs/startups |
| OpenAI startup credits | unverified | The official page couldn't be fetched. Secondary sources (IT Brief, Mar and Aug 2026): Australian program of up to US$50K in API credits. | openai.com/startups |

### Victoria and accelerators

| Program | Launch status | Verified facts | Source |
|---|---|---|---|
| Innovation Victoria (context) | — | Formed 1 Jul 2026, combining LaunchVic and Breakthrough Victoria. Its scaling-accelerator round (closes 9 Nov 2026) is for experienced accelerator operators, not startups. | innovationvictoria.com ; premier.vic.gov.au |
| Innovation Victoria Basecamp: Ascent | open | Free program for Victorian founders preparing to hire; no close date. | innovationvictoria.com/programs |
| Innovation Victoria Office Hours | rolling | Free call for early founders. | innovationvictoria.com/programs |
| Alice Anderson Fund | rolling (capital) | Co-investment of up to $300K in women-led startups. | innovationvictoria.com/funding |
| Venture Growth Fund | rolling (capital) | Venture credit of $50K–$5M; later stage. | innovationvictoria.com/funding |
| VICTOR:AI and the AI/DeepTech pre-accelerators | unverified | Nine operators funded up to $400K each (announced 18 Jun 2026). VICTOR:AI (8 weeks) offers milestone-based grants to AI-native startups. No published intake dates; contact the operators. | launchvic.org/announcements/victoria-backs-next-wave-of-ai-and-deeptech-founders/ |
| Press Play AI Pre-Accelerator | open; closes 15 Nov 2026 | For women; equity-free; backed by Innovation Victoria. Cohort runs Feb–15 May 2027. 25 Victorian scholarships ($300 commitment fee, refundable) plus 10 interstate places at $880. | pressplay.ventures |
| WorkSafe Return to Work Innovation Trials | open; closes 27 Nov 2026 14:00 Australia/Melbourne | Up to $1.25M per trial. Consortium-led, and must include an independent evaluator, industry bodies, unions and experts. Construction, manufacturing, health care and social assistance. The page says "AEST", but daylight saving applies, so the real time is AEDT. | worksafe.vic.gov.au/return-work-innovations-trials (reviewed 5 Oct 2026) |
| Startmate Summer '27 | open; closes 1 Nov 2026 23:59 AEDT | Equity: $120K for 8% at $1.5M post-money. Runs 1 Feb–7 May 2027, with Week 0 in Melbourne. | startmate.com/accelerator |
| Melbourne Accelerator Program | closed | 2026 applications closed 14 Jun; register interest only. | themap.co/apply |
| RMIT Activator LaunchHUB | closed | Next intake opens in 2027. Needs an RMIT-affiliated co-founder and social or environmental impact. | rmit.edu.au/partner/hubs/activator/launch-hub |
| Monash Generator Accelerator | unverified | Pages behind a login; for Monash students, staff and alumni only. | monash.edu/entrepreneurship |

**Checked and excluded from the directory:**
- Innovation Victoria scaling-accelerator grants (for operators)
- LaunchVic pre-accelerator provider grants (closed Jan 2026)
- Digital Jobs (manufacturing and construction training only)
- City of Melbourne Business Growth grants (last round closed Dec 2025; secondary source)
- DEECA EnergyTech Market Ready (closed 14 Aug 2026)
- Victorian Startup Capital Fund (no current page)
