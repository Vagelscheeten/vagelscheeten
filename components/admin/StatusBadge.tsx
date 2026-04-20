import React from 'react';

export type StatusVariant = 'success' | 'warn' | 'danger' | 'info' | 'neutral' | 'accent';

interface StatusBadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
  /** Dezenter Punkt-Marker vor dem Label */
  dot?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const variantStyles: Record<StatusVariant, { text: string; bg: string; border: string }> = {
  success: { text: 'var(--color-admin-success)', bg: 'var(--color-admin-success-bg)', border: 'color-mix(in srgb, var(--color-admin-success) 25%, transparent)' },
  warn:    { text: 'var(--color-admin-warn)',    bg: 'var(--color-admin-warn-bg)',    border: 'color-mix(in srgb, var(--color-admin-warn) 30%, transparent)' },
  danger:  { text: 'var(--color-admin-danger)',  bg: 'var(--color-admin-danger-bg)',  border: 'color-mix(in srgb, var(--color-admin-danger) 30%, transparent)' },
  info:    { text: 'var(--color-admin-info)',    bg: 'var(--color-admin-info-bg)',    border: 'color-mix(in srgb, var(--color-admin-info) 30%, transparent)' },
  accent:  { text: 'var(--color-admin-accent)',  bg: 'var(--color-admin-accent-bg)',  border: 'color-mix(in srgb, var(--color-admin-accent) 30%, transparent)' },
  neutral: { text: 'var(--color-admin-ink-soft)', bg: 'var(--color-admin-surface-muted)', border: 'var(--color-admin-border)' },
};

export function StatusBadge({
  variant = 'neutral',
  children,
  dot = true,
  className = '',
  size = 'md',
}: StatusBadgeProps) {
  const s = variantStyles[variant];
  const sizeClasses =
    size === 'sm'
      ? 'text-[0.68rem] px-1.5 py-0.5 gap-1'
      : 'text-[0.75rem] px-2 py-0.5 gap-1.5';
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${className}`}
      style={{
        color: s.text,
        backgroundColor: s.bg,
        borderColor: s.border,
      }}
    >
      {dot && (
        <span
          aria-hidden
          className="inline-block rounded-full"
          style={{
            width: size === 'sm' ? '5px' : '6px',
            height: size === 'sm' ? '5px' : '6px',
            backgroundColor: s.text,
          }}
        />
      )}
      {children}
    </span>
  );
}
