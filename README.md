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

### Option 1: GitHub UI

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Pages**
3. Under "Source", select **Deploy from a branch**
4. Select the `main` branch and `/ (root)` folder
5. Click **Save**
6. Your site will be available at `https://<username>.github.io/<repo-name>/`

### Option 2: Command Line

```bash
# Ensure you're on main branch with latest changes
git add .
git commit -m "Add grant assessment website"
git push origin main

# Then configure GitHub Pages via Settings > Pages as above
```

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
