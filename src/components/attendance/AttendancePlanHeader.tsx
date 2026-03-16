interface AttendancePlanHeaderProps {
  title: string;
  subtitle: string;
  statusText: string;
}

export function AttendancePlanHeader({ title, subtitle, statusText }: AttendancePlanHeaderProps) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{title}</h1>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{subtitle}</span>
      </div>
      <span
        style={{
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '10px',
          background: '#e8f5e9',
          color: '#2e7d32',
          fontWeight: 500,
        }}
      >
        {statusText}
      </span>
    </div>
  );
}