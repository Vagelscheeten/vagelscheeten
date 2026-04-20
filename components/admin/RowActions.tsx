'use client';

import React from 'react';
import { MoreHorizontal, LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface RowAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  /** true = destruktiv (rot) */
  destructive?: boolean;
  /** true = Trennlinie VOR diesem Item */
  separatorBefore?: boolean;
  disabled?: boolean;
}

interface RowActionsProps {
  actions: RowAction[];
  ariaLabel?: string;
}

/**
 * Zeilen-Aktionen als Overflow-Menu (⋯).
 * Ersetzt inline-Edit/Delete-Buttons und spart Tabellen-Platz.
 */
export function RowActions({ actions, ariaLabel = 'Weitere Aktionen' }: RowActionsProps) {
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-admin-ink-muted hover:text-admin-ink hover:bg-admin-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
        >
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {actions.map((action, i) => (
          <React.Fragment key={i}>
            {action.separatorBefore && i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={action.onClick}
              disabled={action.disabled}
              className={
                action.destructive
                  ? 'text-[var(--color-admin-danger)] focus:text-[var(--color-admin-danger)] focus:bg-[var(--color-admin-danger-bg)]'
                  : ''
              }
            >
              {action.icon && <action.icon size={14} className="mr-2" />}
              {action.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
