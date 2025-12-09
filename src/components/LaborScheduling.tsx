import { useState } from 'react';
import { Users, Plus, MessageSquare, Info, Trash2 } from 'lucide-react';
import { mockAssemblyLines } from '../data/mockData';
import type { AssemblyLine } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export default function LaborScheduling() {
  const { t } = useLanguage();
  const [lines] = useState<AssemblyLine[]>(mockAssemblyLines);

  const getCapacityColor = (current: number, capacity: number) => {
    if (current > capacity) return 'var(--danger)';
    if (current === capacity) return 'var(--success)';
    return 'var(--warning)';
  };

  const getCapacityText = (current: number, capacity: number) => {
    if (current > capacity) return 'var(--danger)';
    if (current === capacity) return 'var(--success)';
    return 'var(--warning)';
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{t('labor.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('labor.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3">
        <div className="card" style={{ padding: '20px', position: 'relative' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', margin: 0 }}>{t('labor.southRegion')}</p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '30px', fontWeight: 'bold' }}>2</span>
                <span style={{ fontSize: '14px', color: '#999' }}>/ 11</span>
              </div>
              <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--warning)', marginTop: '4px' }}>• 9 {t('labor.needed')}</p>
            </div>
            <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '8px' }}>
              <Users size={20} color="var(--accent-blue)" />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', position: 'relative' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', margin: 0 }}>{t('labor.northRegion')}</p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '30px', fontWeight: 'bold' }}>1</span>
                <span style={{ fontSize: '14px', color: '#999' }}>/ 4</span>
              </div>
              <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--warning)', marginTop: '4px' }}>• 3 {t('labor.needed')}</p>
            </div>
            <div style={{ padding: '8px', background: '#f3e8ff', borderRadius: '8px' }}>
              <Users size={20} color="#9333ea" />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', margin: 0 }}>{t('labor.totalWorkforce')}</p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '30px', fontWeight: 'bold' }}>3</span>
                <span style={{ fontSize: '14px', color: '#999' }}>/ 15</span>
              </div>
            </div>
            <Trash2 size={16} color="#d1d5db" style={{ cursor: 'pointer' }} />
          </div>
          <div style={{ width: '100%', background: '#f3f4f6', borderRadius: '999px', height: '6px', marginTop: '16px' }}>
            <div style={{ background: 'var(--accent-blue)', height: '6px', borderRadius: '999px', width: '20%' }}></div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex" style={{ justifyContent: 'flex-end', gap: '12px' }}>
        <button className="btn btn-secondary">
          <MessageSquare size={16} />
          {t('labor.notifyTeam')}
        </button>
        <button className="btn btn-primary">
          <Plus size={16} />
          {t('labor.addLine')}
        </button>
      </div>

      {/* Assembly Lines */}
      <div className="grid grid-cols-4">
        {lines.map((line) => (
          <div key={line.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex justify-between" style={{ alignItems: 'flex-start', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{line.name}</h3>
              <Info size={16} color="#d1d5db" style={{ cursor: 'pointer' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div className="flex justify-between" style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('labor.capacity')}</span>
                <span style={{ color: getCapacityText(line.currentWorkers, line.capacity) }}>
                  {line.currentWorkers} <span style={{ color: '#d1d5db' }}>/</span> {line.capacity}
                </span>
              </div>
              <div style={{ width: '100%', background: '#f3f4f6', borderRadius: '999px', height: '6px' }}>
                <div 
                  style={{ 
                    height: '6px', 
                    borderRadius: '999px', 
                    transition: 'all 0.5s',
                    background: getCapacityColor(line.currentWorkers, line.capacity),
                    width: `${Math.min((line.currentWorkers / line.capacity) * 100, 100)}%` 
                  }} 
                ></div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {line.assignedWorkers.length === 0 ? (
                <div style={{ height: '128px', border: '2px dashed #f3f4f6', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <Users size={32} style={{ marginBottom: '8px', opacity: 0.2 }} />
                  <span style={{ fontSize: '12px' }}>{t('labor.noWorkers')}</span>
                </div>
              ) : (
                line.assignedWorkers.map((worker) => (
                  <div key={worker.employeeId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>
                      {worker.initials}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>{worker.name}</p>
                      <p style={{ fontSize: '10px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d1d5db', display: 'inline-block' }}></span>
                        {worker.experienceCount} {t('labor.shifts')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button className="btn btn-ghost" style={{ marginTop: '16px', width: '100%', border: '1px dashed #d1d5db', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <Plus size={16} />
              {t('labor.addWorker')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
