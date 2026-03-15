interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 'var(--radius-sm)', style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

/** Full card-level skeleton matching the assembly line card layout. */
export function CardSkeleton() {
  return (
    <div
      className="card"
      style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <Skeleton height={14} width="60%" />
      <Skeleton height={10} width="80%" />
      <Skeleton height={6} borderRadius={999} />
      <Skeleton height={30} />
      <Skeleton height={30} />
    </div>
  );
}

/** Row-level skeleton for table loading. */
export function TableRowSkeleton({ cols = 8 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '10px 16px' }}>
          <Skeleton height={12} width={i === 1 ? '70%' : '50%'} />
        </td>
      ))}
    </tr>
  );
}
