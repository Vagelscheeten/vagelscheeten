import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode; // For action buttons on the right
}

export function AdminPageHeader({
  title,
  description,
  backHref,
  backLabel = 'Zurück',
  children,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3 transition-colors"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
      </div>
    </div>
  );
}
