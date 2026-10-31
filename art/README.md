# Artwork

The illustrations for the Billabong look (design doc `docs/plans/2026-10-31-billabong-design.md`, section 6), the logo emblem and the owner's 26 sage icons. Until an image is added, the app shows a neutral placeholder of the same size in its place, so nothing here is needed to build or deploy. All twelve illustration assets are in `public/art/` (31 Oct 2026; design doc section 11, Art landed), and all 26 icons (1 Nov 2026; Icons landed).

## Adding art

1. Generate the images from `docs/art/billabong-prompts.md`, at the sizes it gives (1536×1024 for the two hero dioramas, 1024×1024 for the rest), as PNG with a transparent background where it says so.
2. Save each one in `art/originals/` with the exact file name from the prompts doc, for example `art/originals/platypus-search.png`. Any subset is fine: add them as they are ready.
3. Run `pnpm art`. It writes AVIF and WebP copies at 480, 960 and 1440 pixels wide (each width no larger than the original; the logo emblem at 32, 64 and 128) to `public/art/`, prints their sizes, and updates `lib/art-ready.json`, which tells the `Art` component which images exist. AVIF quality is 55, and 45 for the two hero dioramas (at 55 they were about 154KB at 1440 pixels; at 45 about 114KB, with no visible loss).
4. Check the pages in both themes (`pnpm dev`), then commit `public/art/` and `lib/art-ready.json` together. `pnpm test` fails if the two disagree.

To replace an image, overwrite its PNG and run `pnpm art` again. Its new copies replace all its old ones only once every copy is made, so a replacement that fails or is skipped leaves the old copies in place.

`pnpm art` lists:

- the originals still missing (they stay placeholders; that is not an error);
- any PNG whose name the manifest doesn't know, such as `platypus-reference.png` (the character sheet, a generation aid only) or a misspelt name, which it ignores;
- any file in `public/art/` that no manifest entry makes (a renamed or removed asset), or a `.tmp-<file>/` folder an interrupted run left behind. Delete those; `pnpm test` fails while any are there. `pnpm art` itself deletes stale `.tmp-*` folders before it starts, and they are gitignored.

It processes every other original even when one goes wrong, always rewrites `lib/art-ready.json`, and then exits with an error if any original:

- is narrower than its smallest output width (480 pixels; 32 for the logo emblem, 48 for an icon);
- is not the shape the prompts doc gives (3:2 for the hero, square for the rest, within 1%);
- could not be read or converted (the message names the file and the reason);

or if a hero diorama's 1440-pixel AVIF is over 120KB (simplify the image or lower its AVIF quality in `scripts/process-art.mjs`).

## The logo emblem

The logo is the round emblem from the owner's lockup (`Platypus Compass Grant Navigator Logo-1.png`, 2048×768, transparent; the same design as the opaque `Grant Navigator platypus emblem-2.png`). The lockup's "Grant Navigator" wordmark is dark green and nearly invisible on the dark theme, so the site uses only the emblem and keeps the name beside it as live text.

- `art/originals/logo-emblem.png` (668×668, transparent) is a square crop around the emblem's alpha bounds in the lockup (x 83–690, y 60–687, alpha above 16; everything right of x 690 cleared so none of the wordmark comes along), with 20px of transparent padding on each side. To replace the logo, crop the new emblem the same way (square, transparent, at least 512 pixels) and run `pnpm art`.
- `pnpm art` writes it at 32, 64 and 128 pixels (`LOGO_WIDTHS` in `lib/art.ts`), and from the same original the browser icons: `app/icon.png` (192px, transparent, the tab icon) and `app/apple-icon.png` (180px on the light `--surface`, `#fafaf7`, opaque for iOS home screens). Next's file conventions emit their `<link>` tags under the base path. Commit both icons with `public/art/`. At 16px in a tab the emblem reads as a brown face in a gold ring; there is no SVG icon.
- `LogoMark` (`components/layout/logo-mark.tsx`) shows it at 32px, eager but without fetch priority. The layout renders it on the server and passes it to the top bar and mobile header (`logo` prop), so their client code never ships the art manifest.

## The icons

The feature icons (`SageIcon`, `components/ui/sage-icon.tsx`) are the owner's sage icons, prepared from two files the owner keeps at the repo root (never committed, like the originals):

- `Sage_Icons_16_Shadow/icon-<name>.png`: sixteen 1254px transparent squares;
- `Sage web app navigation icons.png`: a 6 × 4 sheet (1536×1024) from which ten cells are cut (`SHEET_ICONS` in `scripts/prepare-icons.mjs`: grid, person, calendar, checklist, folder, download, report, link, lock, question).

`pnpm art` first runs `scripts/prepare-icons.mjs`, which writes `art/originals/icon-<name>.png` for each: trimmed to its solid pixels and centred on a transparent 512px square (a square icon fills 80% of it, a wide or tall one up to 90% on its long side, so they read at the same size); for the sheet's cells, the dark glow around each icon is removed first (and from its holes, such as the lock's), keeping the icon's own embossed shading, with the edge fading out in cream. The sheet's grid is found from its alpha. Without the owner's files the step prints a line and changes nothing. Then the usual pipeline writes each icon at 48, 96 and 144 pixels (`ICON_WIDTHS`). Commit `public/art/icon-*` and `lib/art-ready.json`; `pnpm test` fails unless every icon is there at every width, since `SageIcon` does not read the readiness file.

To replace a sheet icon with one drawn like the sixteen, save it as `Sage_Icons_16_Shadow/icon-<name>.png` (a transparent square, at least 512 pixels), delete its line from `SHEET_ICONS`, and run `pnpm art`. To add an icon, add its name to `ICON_NAMES` in `lib/art.ts`, its file to `Sage_Icons_16_Shadow/`, and a line to section 15 of `docs/art/billabong-prompts.md`.

## Originals are not committed

`art/originals/` is gitignored except for its `.gitkeep`. The originals are large (a few MB each) and are never deployed (they are outside `public/`), so only the processed files in `public/art/` go in the repository. Keep the originals somewhere safe outside the repo; you need them to reprocess an image. A fresh clone builds from the committed `public/art/` and `lib/art-ready.json` alone.

## In code

- `lib/art.ts` is the manifest: each asset's name, file, size, default alt text (`null` when decorative) and, for the hero, its dark-theme partner (`hero-diorama-dusk`); the icons are `icon-<name>` for each of `ICON_NAMES`.
- `components/ui/art.tsx` renders one: `<Art name="platypus-search" sizes="160px" className="w-40" />`. Give it a width in `className`, or a parent that sizes it: the box sets only its aspect ratio. Pass `alt=""` to make it decorative, `priority` for the hero only, and `eager` for the logo only (eager without fetch priority). The day and dusk dioramas swap with the theme in CSS; both stay lazy (even with `priority`, which raises their fetch priority), so each theme downloads only the one it shows. On the home page, the pre-paint theme script in `app/layout.tsx` preloads the active theme's AVIF from 48rem wide (`lib/hero-preload.ts`, with the hero's `HERO_SIZES`), so the lazy picture does not wait for layout.
- `components/ui/sage-icon.tsx` renders an icon: `<SageIcon name="sprout" size={32} />`, lazy and decorative, at 20px or more.
- `pnpm art` runs the scripts with `tsx`. `lib/art.ts` stays import-free, in erasable TypeScript only, so the script runs under plain Node too.
- A new asset needs an entry in `lib/art.ts` and a prompt (or, for the logo emblem, its source) in `docs/art/billabong-prompts.md`; the tests check the two match. An entry may list its own `widths` (the logo does).
