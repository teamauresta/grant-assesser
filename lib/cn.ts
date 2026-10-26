export type ClassValue = string | boolean | null | undefined | ClassValue[];

/** Joins truthy class names into one string. No Tailwind conflict resolution: callers avoid conflicts. */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue): void => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'string') { for (const part of v.split(/\s+/)) if (part) out.push(part); }
  };
  values.forEach(walk);
  return out.join(' ');
}
