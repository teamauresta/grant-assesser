'use client';

import { useEffect, useState } from 'react';

/** `value`, but only once it has stayed the same for `ms`; the first render returns it at once. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
