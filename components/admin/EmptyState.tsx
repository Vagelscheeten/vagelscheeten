import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Kompakt: kleinere Paddings, für Karten-interne Leerzustände */
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8 px-4' : 'py-14 px-6'
      } border border-dashed border-admin-border rounded-[0.75rem] bg-admin-surface-muted/50`}
    >
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-admin-surface border border-admin-border text-admin-ink-muted mb-3">
        <Icon size={20} />
      </div>
      <h3 className="text-[0.95rem] font-semibold text-admin-ink mb-1">{title}</h3>
      {description && (
        <p className="text-[0.85rem] text-admin-ink-soft max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
