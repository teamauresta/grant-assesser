/**
 * Lowercase ASCII words joined by hyphens, for file names and calendar UIDs. Accents are removed
 * ("Société" → "societe"), the result is at most `max` characters, and `fallback` is returned when
 * nothing is left.
 */
export function slugify(s: string, { max = 60, fallback = '' }: { max?: number; fallback?: string } = {}): string {
  const slug = s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/, '');
  return slug || fallback;
}
