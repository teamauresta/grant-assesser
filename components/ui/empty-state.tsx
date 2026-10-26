import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Usually one Button or link that resolves the empty state. */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-lg border border-border px-6 py-10 text-center', className)}>
      {Icon && <Icon aria-hidden="true" size={20} strokeWidth={1.5} className="text-muted-fg" />}
      <p className="text-base font-semibold">{title}</p>
      {description && <div className="max-w-prose text-sm text-muted-fg">{description}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
