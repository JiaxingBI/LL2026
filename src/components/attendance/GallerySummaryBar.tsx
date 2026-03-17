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
    <div
      className='card'
      style={{
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        minWidth: 0,
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: 'var(--text-secondary)',
          fontWeight: 700,
          lineHeight: 1.2,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '16px', fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '-0.02em', lineHeight: 1.05 }}>{value}</span>
      {caption ? (
        <span
          style={{
            fontSize: '10px',
            color: 'var(--text-secondary)',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={caption}
        >
          {caption}
        </span>
      ) : null}
    </div>
  );
}

function DetailStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: '8px 10px',
        borderRadius: 12,
        background: 'linear-gradient(180deg, #f8fbff 0%, #f3f7fc 100%)',
        border: '1px solid rgba(210, 220, 235, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: 'var(--text-secondary)',
          fontWeight: 700,
          lineHeight: 1.2,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.05 }}>{value}</span>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 8,
        }}
      >
        <SummaryCard label={t('attendance.totalWorkers')} value={employeesCount} caption='Loaded in current plan' />
        <SummaryCard label={t('attendance.scheduledSlice')} value={scheduledCount} caption='Visible in current date and shift' />
        <SummaryCard label={t('attendance.overtimeSlice')} value={overtimeCount} caption='Exceptions increasing planned hours' />
        <SummaryCard label={t('attendance.leaveSlice')} value={leaveCount} caption='Exceptions reducing planned hours' />
        {extraCards}
      </div>

      <div className='card' style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {t('attendance.lastColorShift')}
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={lastSliceLabel}
            >
              {lastSliceLabel}
            </div>
          </div>
          <span
            style={{
              fontSize: '10px',
              padding: '4px 8px',
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
            gap: 8,
          }}
        >
          <DetailStat label={t('attendance.actualArrivedPlanInternal')} value={`${lastSliceInternalArrived}/${lastSliceInternalPlan}`} />
          <DetailStat label={t('attendance.actualArrivedPlanThirdParty')} value={`${lastSliceThirdPartyArrived}/${lastSliceThirdPartyPlan}`} />
          <DetailStat label={t('attendance.overtimeWorkers')} value={lastSliceOvertimeCount} />
          <DetailStat label={t('attendance.leaveWorkers')} value={lastSliceLeaveCount} />
        </div>
      </div>
    </div>
  );
}