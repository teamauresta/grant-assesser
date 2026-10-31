# Artwork

The illustrations for the Billabong look (design doc `docs/plans/2026-10-31-billabong-design.md`, section 6). Until an image is added, the app shows a neutral placeholder of the same size in its place, so nothing here is needed to build or deploy.

## Adding art

1. Generate the images from `docs/art/billabong-prompts.md`, at the sizes it gives (1536×1024 for the two hero dioramas, 1024×1024 for the rest), as PNG with a transparent background where it says so.
2. Save each one in `art/originals/` with the exact file name from the prompts doc, for example `art/originals/platypus-search.png`. Any subset is fine: add them as they are ready.
3. Run `pnpm art`. It writes AVIF and WebP copies at 480, 960 and 1440 pixels wide (each width no larger than the original) to `public/art/`, prints their sizes, and updates `lib/art-ready.json`, which tells the `Art` component which images exist.
4. Check the pages in both themes (`pnpm dev`), then commit `public/art/` and `lib/art-ready.json` together. `pnpm test` fails if the two disagree.

To replace an image, overwrite its PNG and run `pnpm art` again; its old copies are removed first.

`pnpm art` lists the originals still missing (they stay placeholders; that is not an error) and any PNG whose name the manifest doesn't know, such as `platypus-reference.png` (the character sheet, a generation aid only) or a misspelt name, which it ignores. It fails if an original is narrower than 480 pixels, or if a hero diorama's 1440-pixel AVIF is over 120KB (simplify the image or lower its AVIF quality in `scripts/process-art.mjs`).

## Originals are not committed

`art/originals/` is gitignored except for its `.gitkeep`. The originals are large (a few MB each) and are never deployed (they are outside `public/`), so only the processed files in `public/art/` go in the repository. Keep the originals somewhere safe outside the repo; you need them to reprocess an image. A fresh clone builds from the committed `public/art/` and `lib/art-ready.json` alone.

## In code

- `lib/art.ts` is the manifest: each asset's name, file, size, default alt text (`null` when decorative) and, for the hero, its dark-theme partner (`hero-diorama-dusk`).
- `components/ui/art.tsx` renders one: `<Art name="platypus-search" sizes="160px" className="w-40" />`. Pass `alt=""` to make it decorative, and `priority` for the hero only. The day and dusk dioramas swap with the theme in CSS.
- A new asset needs an entry in `lib/art.ts` and a prompt in `docs/art/billabong-prompts.md`; the tests check the two match.
