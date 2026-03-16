import type { ReactNode } from 'react';

interface GallerySummaryBarProps {
  employeesCount: number;
  scheduledCount: number;
  overtimeCount: number;
  leaveCount: number;
  lastSliceLabel: string;
  lastSliceTeamLabel: string;
  lastSliceInternalArrived: number;
  lastSliceInternalPlan: number;
  lastSliceThirdPartyArrived: number;
  lastSliceThirdPartyPlan: number;
  lastSliceOvertimeCount: number;
  lastSliceLeaveCount: number;
  extraCards?: ReactNode;
  t: (key: string) => string;
}

function SummaryCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <div className='card' style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '26px', fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>{value}</span>
      {caption ? <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{caption}</span> : null}
    </div>
  );
}

export function GallerySummaryBar({
  employeesCount,
  scheduledCount,
  overtimeCount,
  leaveCount,
  lastSliceLabel,
  lastSliceTeamLabel,
  lastSliceInternalArrived,
  lastSliceInternalPlan,
  lastSliceThirdPartyArrived,
  lastSliceThirdPartyPlan,
  lastSliceOvertimeCount,
  lastSliceLeaveCount,
  extraCards,
  t,
}: GallerySummaryBarProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <SummaryCard label={t('attendance.totalWorkers')} value={employeesCount} caption='Loaded in current plan' />
        <SummaryCard label={t('attendance.scheduledSlice')} value={scheduledCount} caption='Visible in current date and shift' />
        <SummaryCard label={t('attendance.overtimeSlice')} value={overtimeCount} caption='Exceptions increasing planned hours' />
        <SummaryCard label={t('attendance.leaveSlice')} value={leaveCount} caption='Exceptions reducing planned hours' />
        {extraCards}
      </div>

      <div className='card' style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4 }}>
              {t('attendance.lastColorShift')}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{lastSliceLabel}</div>
          </div>
          <span
            style={{
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '999px',
              border: '1px solid #dbeafe',
              background: '#eff6ff',
              color: 'var(--accent-blue)',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {lastSliceTeamLabel}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <SummaryCard label={t('attendance.actualArrivedPlanInternal')} value={`${lastSliceInternalArrived}/${lastSliceInternalPlan}`} />
          <SummaryCard label={t('attendance.actualArrivedPlanThirdParty')} value={`${lastSliceThirdPartyArrived}/${lastSliceThirdPartyPlan}`} />
          <SummaryCard label={t('attendance.overtimeWorkers')} value={lastSliceOvertimeCount} />
          <SummaryCard label={t('attendance.leaveWorkers')} value={lastSliceLeaveCount} />
        </div>
      </div>
    </div>
  );
}