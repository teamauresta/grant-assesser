# Australian Grants Assessment Tool

A self-assessment tool for Australian AI startups to discover government grant eligibility and receive a personalized 90-day action plan.

## Features

- **Eligibility Assessment**: Analyze compatibility with 6 major Australian funding programs
- **90-Day Action Plan**: Prioritized, personalized action items based on your responses
- **Stacking Strategy**: Learn how to combine multiple grants effectively
- **Readiness Checklist**: Track your documentation readiness for applications

## Programs Analyzed

- R&D Tax Incentive (RDTI)
- Industry Growth Program (IGP)
- CSIRO Kick-Start
- CRC-P Grants
- Export Market Development Grants (EMDG)
- Startup Accelerators

## Deploy to GitHub Pages

The site is deployed by GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`: it runs `pnpm build` and publishes the static export in `out/`.

**One-time setup (repo owner):** go to **Settings** > **Pages** > **Build and deployment** and set **Source** to **GitHub Actions**. The workflow does not change this setting itself.

Other workflows:

- `.github/workflows/ci.yml` runs type check, lint, unit tests and end-to-end tests on pull requests and pushes to other branches.
- `.github/workflows/freshness.yml` runs `pnpm freshness` every Monday morning (Melbourne) and updates a single "Program data freshness" issue listing stale programs, closes within 30 days, past closes that need a decision, and broken or blocked source links. It never changes the site.

### Custom Domain (Optional)

1. Add a `CNAME` file with your domain name
2. Configure DNS with your domain provider
3. Enable HTTPS in GitHub Pages settings

## Local Development

Simply open `index.html` in a browser - no build step required.

```bash
# On macOS
open index.html

# Or use a local server
python -m http.server 8000
# Then visit http://localhost:8000
```

## Tech Stack

- React 18 (via CDN)
- Tailwind CSS (via CDN)
- Lucide Icons
- Babel (for JSX transformation)

## License

MIT
