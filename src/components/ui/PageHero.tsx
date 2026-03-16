import type { ReactNode } from 'react';

interface PageHeroProps {
  title: string;
  subtitle: string;
  aside?: ReactNode;
}

export default function PageHero({ title, subtitle, aside }: PageHeroProps) {
  return (
    <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 60%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>{title}</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: 640 }}>{subtitle}</p>
        </div>
        {aside ? aside : null}
      </div>
    </div>
  );
}