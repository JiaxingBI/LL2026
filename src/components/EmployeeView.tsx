import { useState } from 'react';
import { Scan, Search, X, Calendar, MapPin, Users, Clock, CheckCircle, Info, ArrowLeft } from 'lucide-react';
import LaborScheduling from './LaborScheduling'; // Reuse the board for the background
import { mockEmployees } from '../data/mockData';
import type { Employee } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface EmployeeViewProps {
  onBack?: () => void;
}

export default function EmployeeView({ onBack }: EmployeeViewProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const employee = mockEmployees.find(emp => 
      emp.name.toLowerCase() === searchQuery.toLowerCase() || 
      emp.id === searchQuery
    );
    
    if (employee) {
      setSelectedEmployee(employee);
      setSearchQuery('');
    } else {
      alert(t('employee.notFound'));
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#F5F5F7' }}>
      {/* Top Header - Scan Bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 24px', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Back Button & Title Row */}
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <div className="flex items-center gap-3">
              {onBack && (
                <button 
                  onClick={onBack}
                  className="btn btn-ghost"
                  style={{ padding: '8px', borderRadius: '8px' }}
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div style={{ padding: '10px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '10px', boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)' }}>
                <Scan size={28} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>{t('employee.title')}</h1>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{t('employee.subtitle')}</p>
              </div>
            </div>
          </div>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{ position: 'relative' }}>
            <Search size={20} color="#9ca3af" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('employee.searchPlaceholder')} 
              className="input"
              style={{ 
                width: '100%', 
                paddingLeft: '52px', 
                paddingRight: '16px', 
                paddingTop: '14px', 
                paddingBottom: '14px', 
                fontSize: '16px', 
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              autoFocus
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ 
                position: 'absolute', 
                right: '6px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                padding: '8px 20px',
                fontSize: '14px'
              }}
            >
              {t('employee.search')}
            </button>
          </form>
        </div>
      </div>

      {/* Main Content - Read-only Board */}
      <div style={{ opacity: 0.5, pointerEvents: 'none', filter: 'blur(1px)' }}>
        <LaborScheduling />
      </div>

      {/* Interactive Modal */}
      {selectedEmployee && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', overflow: 'hidden', padding: 0, animation: 'zoomIn 0.2s ease-out', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            {/* Modal Header */}
            <div style={{ padding: '28px 36px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <div className="flex items-center gap-4">
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#667eea', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', border: '3px solid rgba(255, 255, 255, 0.3)' }}>
                  {selectedEmployee.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', margin: 0, textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>{selectedEmployee.name}</h2>
                  <div className="flex items-center gap-3" style={{ marginTop: '6px' }}>
                    <span style={{ padding: '4px 12px', background: 'rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '12px', fontWeight: 'bold', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', backdropFilter: 'blur(10px)' }}>{t('employee.active')}</span>
                    <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', fontFamily: 'monospace', fontWeight: '500' }}>ID: {selectedEmployee.id}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmployee(null)}
                style={{ padding: '8px', borderRadius: '50%', border: 'none', background: 'rgba(255, 255, 255, 0.2)', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                <X size={24} color="white" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Current Assignment */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '4px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="#3b82f6" />
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{t('employee.currentAssignment')}</span>
                </div>
                <div className="grid grid-cols-2" style={{ padding: '20px', gap: '24px' }}>
                  <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', margin: 0 }}>{t('employee.location')}</p>
                    <div className="flex items-center gap-2" style={{ color: '#111827', fontWeight: 'bold', fontSize: '18px' }}>
                      <MapPin size={20} color="#ef4444" />
                      P10B-SMP FULL FLEX NEW
                    </div>
                  </div>
                  <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', margin: 0 }}>{t('employee.shift')}</p>
                    <div className="flex items-center gap-2" style={{ color: '#111827', fontWeight: 'bold', fontSize: '18px' }}>
                      <Clock size={20} color="#f97316" />
                      {t('employee.dayShift')}
                    </div>
                  </div>
                </div>
                <div style={{ margin: '0 20px 20px 20px', padding: '16px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px' }}>
                  <div className="flex items-start gap-3">
                    <Info size={20} color="#2563eb" style={{ marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>{t('employee.specialInstructions')}</p>
                      <p style={{ fontSize: '14px', color: '#2563eb', marginTop: '4px', margin: 0 }}>{t('employee.instructionText')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '4px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="flex items-center gap-2">
                    <Users size={16} color="#a855f7" />
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{t('employee.teamMembers')}</span>
                  </div>
                  <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '9999px', fontWeight: '500' }}>4 {t('employee.colleagues')}</span>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {['Ben', 'Eric', 'Frank', 'George'].map((name) => (
                    <div key={name} className="flex items-center gap-2" style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Schedule */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '4px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Calendar size={16} color="#f97316" />
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{t('employee.upcomingSchedule')}</span>
                </div>
                <div className="grid grid-cols-2" style={{ padding: '20px', gap: '16px' }}>
                  <div style={{ border: '1px solid #f3f4f6', borderRadius: '8px', padding: '16px' }}>
                    <div className="flex justify-between items-start" style={{ marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#111827' }}>{t('employee.tomorrow')}</span>
                      <span style={{ fontSize: '12px', background: '#e5e7eb', color: '#4b5563', padding: '2px 6px', borderRadius: '4px' }}>SAT, DEC 6</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ fontSize: '14px', color: '#4b5563' }}>
                      <CheckCircle size={16} color="#10b981" />
                      P10B-SMP FULL FLEX NEW
                    </div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', marginLeft: '24px', margin: 0 }}>{t('employee.dayShift')}</p>
                  </div>
                  <div style={{ border: '1px solid #f3f4f6', borderRadius: '8px', padding: '16px' }}>
                    <div className="flex justify-between items-start" style={{ marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#111827' }}>{t('employee.dayAfter')}</span>
                      <span style={{ fontSize: '12px', background: '#e5e7eb', color: '#4b5563', padding: '2px 6px', borderRadius: '4px' }}>SUN, DEC 7</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ fontSize: '14px', color: '#4b5563' }}>
                      <CheckCircle size={16} color="#10b981" />
                      P30A - ASSEMBLY SUPPORT
                    </div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', marginLeft: '24px', margin: 0 }}>{t('employee.nightShift')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '20px 36px', background: 'linear-gradient(to top, #f9fafb 0%, white 100%)', borderTop: '1px solid #e5e7eb' }}>
              <button 
                onClick={() => setSelectedEmployee(null)}
                className="btn"
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 'bold', borderRadius: '12px', boxShadow: '0 10px 20px -5px rgba(102, 126, 234, 0.4)', fontSize: '15px', border: 'none', transition: 'all 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(102, 126, 234, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(102, 126, 234, 0.4)';
                }}
              >
                {t('employee.closeSchedule')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
