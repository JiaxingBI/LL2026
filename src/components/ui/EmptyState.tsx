import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '48px 24px',
        color: 'var(--text-secondary)',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div style={{ opacity: 0.35, marginBottom: 4 }}>
          {icon}
        </div>
      )}
      <p style={{ fontWeight: 600, fontSize: 15, margin: 0, color: 'var(--text-primary)' }}>
        {title}
      </p>
      {description && (
        <p style={{ fontSize: 13, margin: 0, maxWidth: 320 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
