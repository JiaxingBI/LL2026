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
  t: (key: string) => string;
}

function SummaryChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='card' style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '16px', fontWeight: 800, whiteSpace: 'nowrap' }}>{value}</span>
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
  t,
}: GallerySummaryBarProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <SummaryChip label={t('attendance.totalWorkers')} value={employeesCount} />
      <SummaryChip label={t('attendance.scheduledSlice')} value={scheduledCount} />
      <SummaryChip label={t('attendance.overtimeSlice')} value={overtimeCount} />
      <SummaryChip label={t('attendance.leaveSlice')} value={leaveCount} />

      <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>
          {t('attendance.lastColorShift')}
        </span>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 10px',
            borderRadius: '999px',
            border: '1px solid #dbeafe',
            background: '#eff6ff',
            color: 'var(--accent-blue)',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {lastSliceLabel} • {lastSliceTeamLabel}
        </span>

        <SummaryChip label={t('attendance.actualArrivedPlanInternal')} value={`${lastSliceInternalArrived}/${lastSliceInternalPlan}`} />
        <SummaryChip label={t('attendance.actualArrivedPlanThirdParty')} value={`${lastSliceThirdPartyArrived}/${lastSliceThirdPartyPlan}`} />
        <SummaryChip label={t('attendance.overtimeWorkers')} value={lastSliceOvertimeCount} />
        <SummaryChip label={t('attendance.leaveWorkers')} value={lastSliceLeaveCount} />
      </div>
    </div>
  );
}