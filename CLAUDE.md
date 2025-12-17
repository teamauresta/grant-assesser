# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based Australian Government Grants Assessment Tool for AI startups. It helps startups determine eligibility for various grant programs (R&D Tax Incentive, Industry Growth Program, CSIRO Kick-Start, CRC-P, EMDG, Accelerators) and provides a personalized 90-day action plan.

## File Structure

- `index.html` - Production-ready single-page application (GitHub Pages deployment)
- `base.jsx` - Original React component source (for reference/build systems)
- `404.html` - Custom 404 page for GitHub Pages
- `.nojekyll` - Tells GitHub Pages to skip Jekyll processing

## Architecture

The application contains:

- **Data structures**: `PROGRAMS` (grant program details), `ASSESSMENT_QUESTIONS` (wizard questions), `READINESS_ITEMS` (checklist items)
- **Components**: `LandingPage` (marketing homepage), `GrantsAssessmentTool` (multi-step wizard)
- **Key functions**:
  - `calculateEligibility()` - Computes program eligibility based on user answers
  - `generateActionPlan()` - Creates prioritized 90-day action items
  - `renderResults()` - Displays eligibility, action plan, and stacking strategy tabs

## Tech Stack

- React 18 (loaded via CDN - no build step required)
- Tailwind CSS (loaded via CDN)
- Lucide icons (loaded via CDN)
- Babel (browser-based JSX transformation)

## Development

Open `index.html` directly in a browser or use a local server:
```bash
python -m http.server 8000
```

## Deployment

Push to GitHub and enable GitHub Pages from Settings > Pages. Select main branch, root folder.
