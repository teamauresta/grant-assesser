# Billabong artwork: prompts for gpt-image-2.5

Grant Navigator's artwork for the Billabong look (posthog.com's style, with original art). There are 13 images: one character reference, a hero diorama in two lighting versions, four platypus poses, three props and three small "How it works" spots. A fourteenth entry, the logo emblem, is cropped from the owner's logo rather than generated, and section 15 lists the owner's 26 sage icons, prepared from their files.

Everything here must be original. Do not reference PostHog, its hedgehogs, its logo or its artwork in any prompt, and do not upload PostHog images as references.

## How to use this file

1. **Make the character reference first (image 1).** Generate until the platypus looks right, then upload that image as a reference with every later platypus prompt (2, 3, 4, 5, 6, 7). This keeps it the same character every time.
2. **Paste the style block** (below) at the start of every prompt, then the image's own prompt.
3. **Settings:** the size and background given for each image. Where it says *transparent*, set the background option to transparent (not white), and PNG output.
4. **Save** with the file name given and drop the files in `art/originals/` at the repo root (not `public/`: the full-size originals should not be deployed), or send them to me. I'll resize, convert to AVIF/WebP and wire them in.
5. **Reject and regenerate** any image with text that isn't asked for, a logo, extra limbs, a hedgehog-like look, or a busy background on a transparent asset.

## Style block (paste before every prompt)

> Soft 3D clay-render illustration, like a handmade claymation diorama photographed in a studio. Matte, slightly toy-like materials with gentle surface texture, rounded edges and chunky simplified shapes. Soft global illumination with one warm key light from the upper left and soft contact shadows directly under objects. Calm, natural Australian bush palette: eucalyptus and sage greens, warm sand, ochre and terracotta earth, river-water teal and soft sky blue, with small amber-yellow accents (#F2A93B). Friendly, charming, slightly whimsical, but uncluttered and readable at small sizes. No text, no letters, no numbers, no logos, no watermarks, no signatures, unless the prompt asks for specific text.

## The platypus (keep identical across images)

> A friendly platypus mascot: rounded, chubby body with short legs; warm chocolate-brown fur with a lighter tan belly; a soft slate-grey duck bill; small dark shiny eyes with a hint of a smile; small webbed front feet that can hold things like little hands; a broad flat beaver-like tail. He wears round tortoiseshell reading glasses and a small amber-yellow neckerchief tied at the neck. Proportions are cute and chunky (head about a third of the body height), never realistic, never spiky, never hedgehog-like.

---

## 1. Character reference sheet (for consistency; not shipped)

- **File:** `platypus-reference.png`
- **Size:** 1536×1024 (landscape)
- **Background:** plain light warm grey

> [Style block] [Platypus description] Character reference sheet of this platypus on a plain light warm-grey background: three full-body views side by side, front view, three-quarter view and side view, standing upright in a neutral friendly pose, same scale and lighting in each. Evenly spaced, nothing else in the image.

## 2. Hero diorama, day (light theme)

- **File:** `hero-diorama-day.png`
- **Size:** 1536×1024 (landscape)
- **Background:** transparent
- **Where:** home page hero, right of the headline and numbers (last, below them, on phones)

> [Style block] [Platypus description] A small floating clay diorama, an island-shaped slice of Australian bush shown at a three-quarter angle from slightly above, isolated on a transparent background with clean edges and a soft contact shadow under the base. On the island: a calm billabong (a small curved waterhole) with teal water, reeds and smooth river stones; a river red gum tree with pale patchy bark and a broad canopy leaning over the water; a few tufts of spinifex grass and small wattle bushes with yellow blossom. On the bank, the platypus sits at a small vintage wooden writing desk, reading glasses on, happily sorting a neat stack of paper forms into three little wooden trays. Beside the desk: a small olive-green metal filing cabinet with one drawer open showing folders, and a brass compass lying on the desk. Bright late-morning daylight, warm and optimistic. The composition leaves a little empty space around the island so it can sit beside text.

## 3. Hero diorama, dusk (dark theme)

- **File:** `hero-diorama-dusk.png`
- **Size:** 1536×1024 (landscape)
- **Background:** transparent
- **Where:** home page hero in the dark theme (the same slot; the theme swaps the picture)
- **Tip:** upload image 2 as a reference so the scene matches exactly.

> [Style block] [Platypus description] The same floating clay diorama as the reference image, identical layout and objects, now at dusk: deep blue-violet twilight light, a warm amber glow from a small brass desk lamp on the platypus's desk lighting his face and papers, the water reflecting the lamp, a few fireflies over the reeds. The palette shifts to deep teal, indigo and warm amber, with enough light that every object is still clearly readable. Transparent background with clean edges.

## 4. Platypus waving (welcome)

- **File:** `platypus-wave.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** home page, the first persona card ("Where is your company today?"), at the right of its icon row

> [Style block] [Platypus description] The platypus standing on a small round tuft of grass, waving hello with one front foot raised, the other foot holding a clipboard against his belly, a cheerful welcoming expression, tail curled slightly to the side. Full body, centred, isolated on a transparent background with a soft contact shadow under the grass tuft.

## 5. Platypus reading a long form (eligibility)

- **File:** `platypus-reading.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** program page, the Eligibility window, beside "Answer a few questions to see which of these you meet" (only with no assessment)

> [Style block] [Platypus description] The platypus sitting cross-legged, reading a very long paper form that unrolls from his front feet down onto the ground in loose folds, glasses pushed up, one eyebrow raised in focused, good-humoured concentration, a small pencil tucked behind his head. Only faint grey lines on the paper, no readable text. Full body, centred, isolated on a transparent background with a soft contact shadow.

## 6. Platypus celebrating (milestones)

- **File:** `platypus-celebrate.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** results page, the Suggested first goal card (a persona is chosen), in place of its target icon, when something is in Act now (never in toasts: toasts have no images)

> [Style block] [Platypus description] The platypus jumping for joy with both front feet raised, holding a big wooden rubber stamp in one foot, small clay confetti pieces in amber, sage green and sky blue frozen mid-air around him, a delighted open-bill smile, tail flicked up. Full body, centred, isolated on a transparent background with a soft contact shadow under where he will land.

## 7. Platypus searching (empty states and 404)

- **File:** `platypus-search.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** the directory's "No programs match" empty state, My Plan's empty Goals tab, the 404 page

> [Style block] [Platypus description] The platypus peering through a large brass magnifying glass held in both front feet, leaning forward curiously, the glass making one eye look comically big, a folded paper map sticking out from under his arm. Full body, centred, isolated on a transparent background with a soft contact shadow.

## 8. Prop: filing cabinet

- **File:** `prop-filing-cabinet.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** My Plan's empty Pipeline tab

> [Style block] A chunky vintage olive-green metal filing cabinet with three drawers and brass handles, the top drawer pulled open showing colourful paper folders in amber, sage and sky blue with blank tabs, one folder sticking up slightly. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

## 9. Prop: compass

- **File:** `prop-compass.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** results page, beside the figures in the Your funding estimate window (from 640px wide; not on phones)

> [Style block] A chunky brass pocket compass with its hinged lid open, a cream dial with simple tick marks only (no letters), a red-and-teal needle pointing up and slightly right, resting on a small flat river stone. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

## 10. Prop: "APPROVED" stamp

- **File:** `prop-stamp.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** report page, beside Download PDF in the Options window

> [Style block] A chunky wooden-handled rubber stamp standing upright next to a small round amber-yellow ink pad, and in front of them a sheet of cream paper with one clean stamp impression in teal ink that reads exactly "APPROVED" in bold rounded capital letters inside a rounded rectangle. The word must be spelled correctly and be the only text in the image. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

## 11. How it works, step 1: answer six questions

- **File:** `step-answer.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** home page "How it works", the step 1 window, above its text

> [Style block] A small clay clipboard with a cream sheet showing six short rows, each with a round checkbox; the first four boxes are ticked in eucalyptus green, a chunky amber pencil lies diagonally across the bottom of the board. No readable text, only simple grey lines for the rows. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

## 12. How it works, step 2: see what fits

- **File:** `step-sort.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** home page "How it works", the step 2 window, above its text

> [Style block] Three small clay trays in a row, like an in-tray set: the left tray holds a neat stack of sage-green cards, the middle tray amber cards, the right tray a few pale grey cards, with one amber card mid-air dropping into the middle tray. No text. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

## 13. How it works, step 3: plan the applications

- **File:** `step-plan.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** home page "How it works", the step 3 window, above its text

> [Style block] A small clay wall calendar page with a simple grid of squares (no numbers or letters), three squares circled in amber, one with a little green flag pin stuck in it, and a small brass alarm clock sitting in front of it. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

## 14. Logo emblem (not generated from a prompt)

- **File:** `logo-emblem.png`
- **Size:** 668×668 (square), transparent
- **Where:** the top bar and the mobile header (`LogoMark`, 32px, beside the live "Grant Navigator" text), and the browser tab and home-screen icons (`app/icon.png`, `app/apple-icon.png`, written by `pnpm art`)
- **Source:** the round emblem (the platypus in glasses and amber neckerchief with a compass, in a gold ring on a eucalyptus disc) cropped from the owner's lockup `Platypus Compass Grant Navigator Logo-1.png` (2048×768, transparent): a square around the emblem's alpha bounds (x 83–690, y 60–687, alpha above 16, everything right of x 690 cleared, so none of the wordmark comes along) with 20px of transparent padding on each side. The lockup's baked "Grant Navigator" wordmark is dark green and nearly invisible on the dark theme, so the site uses the emblem only and keeps the name as live text.

## 15. Icons (the owner's sage icons, not generated from a prompt)

Twenty-six feature icons: a sage-green fill in a cream outline, chunky and slightly embossed. They replace the lucide line icons where an icon is decorative beside a label at 20px or more (`SageIcon`, `components/ui/sage-icon.tsx`); smaller slots, buttons, menus, pills, badges and inline text keep lucide's line glyphs, drawn at lucide's default 2px stroke to match (design doc section 11, Icons landed). Lucide line glyphs in warning callouts, except the backup reminder (owner's mapping).

- **Size:** 512×512 (square), transparent, each written to `art/originals/` by `scripts/prepare-icons.mjs` (the first step of `pnpm art`), then output at 48, 96 and 144 pixels (`ICON_WIDTHS`).
- **Sources** (the owner's files at the repo root, never committed): sixteen from `Sage_Icons_16_Shadow/` (1254×1254, transparent, clean edges, a soft drop shadow), trimmed to their solid pixels and centred; ten cut from the 6 × 4 sheet `Sage web app navigation icons.png` (1536×1024), whose dark glow around each icon is removed first. A square icon fills 80% of its square; a wide or tall one may grow to 90% on its long side, so they read at the same optical size.
- **Match:** the ten from the sheet are paler, with a lighter outline and no shadow, than the sixteen. To replace one, save a new 1254px square, transparent PNG in `Sage_Icons_16_Shadow/` with its name (for example `icon-grid.png`), move its name from `SHEET_ICONS` to the folder list in `scripts/prepare-icons.mjs` (the folder list is every icon the sheet does not supply), and run `pnpm art`.

- **File:** `icon-backup.png`. Source: Sage_Icons_16_Shadow/icon-backup.png. Where: the backup reminder (settings and plan), 24px.
- **File:** `icon-banknote.png`. Source: Sage_Icons_16_Shadow/icon-banknote.png. Where: home, Browse by type: Capital, 36px.
- **File:** `icon-cloud.png`. Source: Sage_Icons_16_Shadow/icon-cloud.png. Where: home, Browse by type: Credits, 36px.
- **File:** `icon-handshake.png`. Source: Sage_Icons_16_Shadow/icon-handshake.png. Where: home, Browse by type: Service, 36px.
- **File:** `icon-landmark.png`. Source: Sage_Icons_16_Shadow/icon-landmark.png. Where: home, Browse by type: Grant, 36px.
- **File:** `icon-notebook.png`. Source: Sage_Icons_16_Shadow/icon-notebook.png. Where: not used yet (application notes are a menu item, which keeps its line glyph).
- **File:** `icon-plan-board.png`. Source: Sage_Icons_16_Shadow/icon-plan-board.png. Where: nav: My Plan (top bar 20px from lg, bottom nav 24px).
- **File:** `icon-receipt.png`. Source: Sage_Icons_16_Shadow/icon-receipt.png. Where: home, Browse by type: Tax incentive, 36px.
- **File:** `icon-rocket.png`. Source: Sage_Icons_16_Shadow/icon-rocket.png. Where: home: the VC-backed persona card (32px) and Browse by type: Accelerator (36px).
- **File:** `icon-shield.png`. Source: Sage_Icons_16_Shadow/icon-shield.png. Where: settings, Privacy, 24px.
- **File:** `icon-sprout.png`. Source: Sage_Icons_16_Shadow/icon-sprout.png. Where: home: the Bootstrapped persona card, 32px.
- **File:** `icon-target.png`. Source: Sage_Icons_16_Shadow/icon-target.png. Where: home: the Pre-raise persona card (32px); results: the suggested first goal (24px).
- **File:** `icon-ticket.png`. Source: Sage_Icons_16_Shadow/icon-ticket.png. Where: home, Browse by type: Voucher, 36px.
- **File:** `icon-trending-up.png`. Source: Sage_Icons_16_Shadow/icon-trending-up.png. Where: home, Browse by type: Investor incentive, 36px.
- **File:** `icon-trophy.png`. Source: Sage_Icons_16_Shadow/icon-trophy.png. Where: not used yet (the Awarded outcome is a pill and a dialog button, which keep their line glyphs).
- **File:** `icon-verified.png`. Source: Sage_Icons_16_Shadow/icon-verified.png. Where: home, the values row: Verified sources, 36px.
- **File:** `icon-grid.png`. Source: the navigation sheet, row 1, column 1. Where: nav: Programs (top bar 20px from lg, bottom nav 24px).
- **File:** `icon-person.png`. Source: the navigation sheet, row 1, column 2. Where: the persona chip in the top bar (20px); a program page's persona advice (24px).
- **File:** `icon-calendar.png`. Source: the navigation sheet, row 2, column 1. Where: not used yet (the calendar's glyphs are 16px, in a legend and lists).
- **File:** `icon-checklist.png`. Source: the navigation sheet, row 2, column 2. Where: nav: Assess (top bar 20px from lg, bottom nav 24px); the results empty state (40px); the report's No assessment yet note (24px).
- **File:** `icon-folder.png`. Source: the navigation sheet, row 2, column 3. Where: not used yet.
- **File:** `icon-download.png`. Source: the navigation sheet, row 2, column 6. Where: not used yet (downloads are buttons, which keep their line glyphs).
- **File:** `icon-report.png`. Source: the navigation sheet, row 3, column 4. Where: nav: Report (top bar 20px from lg, bottom nav 24px).
- **File:** `icon-link.png`. Source: the navigation sheet, row 3, column 5. Where: not used yet (links keep the inline external-link glyph).
- **File:** `icon-lock.png`. Source: the navigation sheet, row 3, column 6. Where: home, the values row: Private, 36px.
- **File:** `icon-question.png`. Source: the navigation sheet, row 4, column 2. Where: home, the values row: Honest about uncertainty, 36px.

---

## Checklist before sending

- [ ] Same platypus in images 2 to 7: same colours, glasses, amber neckerchief and chunky shape.
- [ ] Transparent images have clean edges, with no white halo and no leftover background.
- [ ] No stray text anywhere; image 10 reads exactly "APPROVED".
- [ ] Nothing resembles PostHog's hedgehogs, logo or products.
- [ ] Dusk diorama (3) matches the day diorama (2) in layout.
