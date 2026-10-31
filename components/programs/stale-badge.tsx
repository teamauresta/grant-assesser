import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/** Shown when a program's lastVerified is older than STALE_DAYS (derived on the client). */
export function StaleBadge() {
  return (
    <Badge>
      <RefreshCw aria-hidden="true" size={16} />
      Needs re-check
    </Badge>
  );
}
