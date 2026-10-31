import { ImageIcon } from 'lucide-react';
import { ART, artFileName, artSrcSet, readyWidths, type ArtFormat, type ArtName } from '@/lib/art';
import artReady from '@/lib/art-ready.json';
import { cn } from '@/lib/cn';

export type ArtProps = {
  name: ArtName;
  /** The `sizes` attribute: the width the image renders at, such as "160px" or "(min-width: 48rem) 50vw, 100vw". */
  sizes: string;
  /** Overrides the manifest's alt text. An empty string makes the image decorative. */
  alt?: string;
  /**
   * For the hero: high fetch priority, and eager loading unless the asset is a light/dark pair (a
   * pair stays lazy, so each theme fetches only the picture it shows). Otherwise lazy.
   */
  priority?: boolean;
  /** Eager loading without raising the fetch priority: the logo, tiny and in the top bar on every page. */
  eager?: boolean;
  /**
   * Classes for the box. Give it a width (`w-40`, `w-full`) or put it in a parent that sizes it: the
   * box sets only its aspect ratio, so in a flex column with `items-center` it would shrink to nothing.
   */
  className?: string;
};


/**
 * An illustration from the art manifest (Billabong design doc section 6). A box of the asset's aspect
 * ratio holds a `<picture>` (AVIF, then WebP) when its processed files exist, otherwise a neutral
 * placeholder, so missing art never breaks the layout or the build. A light/dark pair renders both
 * pictures and the dark variant swaps them in CSS: the theme is set before paint, so there is no
 * flash and no client code. Decorative images (alt "") are hidden from assistive tech. A plain
 * `<picture>`, not next/image: the static export serves files as they are (`images.unoptimized`), and
 * the URLs carry the base path themselves. The box carries `data-art` with the asset's name, so tests
 * find a slot by what it shows.
 */
export function Art({ name, sizes, alt, priority = false, eager = false, className }: ArtProps) {
  const asset = ART[name];
  const text = alt ?? asset.alt ?? '';
  const decorative = text === '';
  // Inlined by Next at build (next.config.ts); read at render so tests can set it.
  const base = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/art/`;
  // Empty until `pnpm art` makes the files.
  const lightWidths = readyWidths(artReady, asset.file);
  const darkWidths = asset.dark ? readyWidths(artReady, asset.dark) : [];
  // A lazy image in display:none is never fetched, so a pair stays lazy: an eager one would make
  // every visitor download both the day and the dusk picture.
  const pair = asset.dark !== undefined && darkWidths.length > 0;

  const srcSet = (file: string, widths: number[], format: ArtFormat) => artSrcSet(base, file, widths, format);

  // `display` is the swap: `block` or `hidden`, each with its dark-variant opposite (cn() merges nothing).
  const picture = (file: string, widths: number[], display = 'block') => (
    <picture className={cn('h-full w-full', display)}>
      <source type="image/avif" srcSet={srcSet(file, widths, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(file, widths, 'webp')} sizes={sizes} />
      <img
        src={`${base}${artFileName(file, widths[widths.length - 1], 'webp')}`}
        alt={text}
        width={asset.width}
        height={asset.height}
        loading={eager || (priority && !pair) ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className="h-full w-full object-contain"
      />
    </picture>
  );

  const placeholder = (swap?: string) => (
    <div aria-hidden="true" className={cn('flex h-full w-full items-center justify-center rounded-lg bg-neutral-bg', swap)}>
      <ImageIcon size={16} className="text-muted-fg" />
    </div>
  );

  const lightSwap = pair ? 'dark:hidden' : undefined;
  const lightDisplay = pair ? 'block dark:hidden' : 'block';
  return (
    <div
      data-art={name}
      className={className}
      style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
      aria-hidden={decorative ? true : undefined}
    >
      {lightWidths.length ? picture(asset.file, lightWidths, lightDisplay) : placeholder(lightSwap)}
      {pair && picture(asset.dark!, darkWidths, 'hidden dark:block')}
    </div>
  );
}
