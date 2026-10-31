import { ICON_WIDTHS, artFileName, artSrcSet, iconFile, type IconName } from '@/lib/art';
import { cn } from '@/lib/cn';

export type SageIconProps = {
  name: IconName;
  /** The rendered width and height in CSS pixels: 20 or 24 beside a label, 32 to 40 on a card. */
  size: number;
  /** Layout classes only (margin, self). */
  className?: string;
};

/**
 * One of the owner's sage icons (lib/art.ts ICON_NAMES; design doc section 11, Icons landed): a
 * `<picture>` (AVIF, then WebP) at the icon widths, always decorative beside a visible label, so it is
 * hidden from assistive tech. Only at 20px and up, never inside a button, menu item, pill, warning
 * text or field error: those keep their lucide line glyphs.
 *
 * Unlike Art it is safe in client components: it reads neither lib/art-ready.json nor the manifest
 * (every icon is committed at every width, which tests/lib/process-art.test.ts checks), so it costs
 * the client a few lines. A light and a dark theme share the picture; it does not take currentColor.
 *
 * Always lazy, the nav bars' too: each page renders both the top bar and the bottom nav, one of them
 * hidden, and a lazy image that is not displayed is never fetched (an eager one would be). The ones
 * on screen load at layout, in a box already their size.
 */
export function SageIcon({ name, size, className }: SageIconProps) {
  const file = iconFile(name);
  // Inlined by Next at build (next.config.ts); read at render so tests can set it.
  const base = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/art/`;
  const sizes = `${size}px`;
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
