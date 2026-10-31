import { ICON_WIDTHS, artFileName, artSrcSet, iconFile, type IconName } from '@/lib/art-files';
import { cn } from '@/lib/cn';

export type SageIconProps = {
  name: IconName;
  /** The rendered width and height in CSS pixels: 20 or 24 beside a label, 32 to 40 on a card. */
  size: number;
  /** Layout classes only (margin, self). */
  className?: string;
};

/** The smallest size a sage icon reads at; below it, use a lucide line glyph. */
const MIN_SIZE = 20;

/**
 * One of the owner's sage icons (ICON_NAMES in lib/art-files.ts; design doc section 11, Icons landed):
 * a `<picture>` (AVIF, then WebP) at the icon widths, always decorative beside a visible label, so it
 * is hidden from assistive tech. Only at 20px and up, and never inside a button, menu item, pill,
 * badge or field error, or inline in text: those keep their lucide line glyphs. Lucide line glyphs in
 * warning callouts, except the backup reminder (owner's mapping).
 *
 * Unlike Art it is safe in client components on every route: it imports only lib/art-files.ts (the
 * file names), never the manifest (lib/art.ts) or lib/art-ready.json, since every icon is committed
 * at every width (tests/lib/process-art.test.ts checks that). A light and a dark theme share the
 * picture; it does not take currentColor.
 *
 * Always lazy, the nav bars' too: icons further down a page wait until they are near the screen, and
 * the bar that is hidden at this width (the top bar's icons below lg, the bottom nav from md) never
 * fetches its pictures. The ones on screen load at layout, in a box already their size.
 */
export function SageIcon({ name, size, className }: SageIconProps) {
  const file = iconFile(name);
  // Inlined by Next at build (next.config.ts); read at render so tests can set it.
  const base = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/art/`;
  const sizes = `${size}px`;
  // Development and tests only: Next inlines NODE_ENV, so a production build drops this.
  if (process.env.NODE_ENV !== 'production' && size < MIN_SIZE) {
    console.error(`SageIcon "${name}" at ${size}px: sage icons do not read under ${MIN_SIZE}px; use a lucide line glyph.`);
  }
  return (
    <picture data-icon={name} className={cn('block shrink-0', className)} style={{ width: size, height: size }}>
      <source type="image/avif" srcSet={artSrcSet(base, file, ICON_WIDTHS, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={artSrcSet(base, file, ICON_WIDTHS, 'webp')} sizes={sizes} />
      <img
        src={`${base}${artFileName(file, ICON_WIDTHS[1], 'webp')}`}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="block size-full"
      />
    </picture>
  );
}
