import { Calendar, LayoutDashboard, User, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { language, setLanguage, t } = useLanguage();

  const tabs = [
    { id: 'attendance', label: t('nav.attendance'), icon: Calendar },
    { id: 'assembly', label: t('nav.assembly'), icon: LayoutDashboard },
    { id: 'employee', label: t('nav.employee'), icon: User },
  ];

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="navbar">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div style={{ background: 'var(--accent-blue)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
            <LayoutDashboard size={20} color="white" />
          </div>
          <span style={{ fontWeight: 'bold', fontSize: '20px', letterSpacing: '-0.5px' }}>{t('nav.title')}</span>
        </div>
        
        <button
          onClick={toggleLanguage}
          className="btn btn-ghost"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '6px 12px',
            fontSize: '13px',
            border: '1px solid var(--border-color)',
            borderRadius: '6px'
          }}
        >
          <Globe size={16} />
          {language === 'en' ? '中文' : 'EN'}
        </button>
      </div>

      <div className="nav-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`nav-tab ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ width: '96px' }}></div> {/* Spacer for centering */}
    </div>
  );
}
