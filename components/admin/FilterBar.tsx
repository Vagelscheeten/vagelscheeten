'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface FilterBarProps {
  /** Kontrollierter Suchwert. Weggelassen = keine Suche */
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  /** Filter-Chips / Dropdowns */
  children?: React.ReactNode;
  /** Rechte Seite — z. B. Export-Button */
  trailing?: React.ReactNode;
}

/**
 * Einheitliche Filterzeile für Listen-Seiten im Admin.
 * Suche links, Filter in der Mitte, Aktionen rechts.
 */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Suchen …',
  children,
  trailing,
}: FilterBarProps) {
  const hasSearch = typeof search === 'string' && typeof onSearchChange === 'function';
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
      {hasSearch && (
        <div className="relative flex-1 min-w-0 md:max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-ink-muted pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-9 pl-9 pr-3 rounded-md text-[0.88rem] bg-admin-surface border border-admin-border text-admin-ink placeholder:text-admin-ink-muted focus:outline-none focus:ring-2 focus:ring-admin-accent/30 focus:border-admin-accent transition-all"
          />
        </div>
      )}
      {children && (
        <div className="flex items-center gap-2 flex-wrap">{children}</div>
      )}
      {trailing && (
        <div className="md:ml-auto flex items-center gap-2">{trailing}</div>
      )}
    </div>
  );
}
