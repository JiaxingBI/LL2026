import PageHero from '../ui/PageHero';

interface AttendancePlanHeaderProps {
  title: string;
  subtitle: string;
  statusText: string;
}

export function AttendancePlanHeader({ title, subtitle, statusText }: AttendancePlanHeaderProps) {
  return (
    <PageHero
      title={title}
      subtitle={subtitle}
      aside={(
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(210,210,215,0.8)',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Data source</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{statusText}</div>
          </div>
        </div>
      )}
    />
  );
}