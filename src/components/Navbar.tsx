import { Calendar, LayoutDashboard, User, Globe, FlaskConical } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const IS_DEV = import.meta.env.DEV;

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { language, setLanguage, t } = useLanguage();

  const activePage = {
    attendance: {
      title: t('attendance.title'),
      subtitle: t('attendance.subtitle'),
    },
    assembly: {
      title: t('labor.title'),
      subtitle: t('labor.subtitle'),
    },
    employee: {
      title: t('employee.title'),
      subtitle: t('employee.subtitle'),
    },
    test: {
      title: t('nav.test'),
      subtitle: t('nav.title'),
    },
  }[activeTab] ?? {
    title: t('nav.title'),
    subtitle: '',
  };

  const tabs = [
    { id: 'attendance', label: t('nav.attendance'), icon: Calendar },
    { id: 'assembly', label: t('nav.assembly'), icon: LayoutDashboard },
    { id: 'employee', label: t('nav.employee'), icon: User },
    // TestPage only visible during local dev — hidden in production builds
    ...(IS_DEV ? [{ id: 'test', label: t('nav.test'), icon: FlaskConical }] : []),
  ];

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="navbar">
      <div className="navbar-left">
        <div className="flex items-center gap-2">
          <div style={{ background: 'var(--accent-blue)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
            <LayoutDashboard size={20} color="white" />
          </div>
          <span style={{ fontWeight: 'bold', fontSize: '20px', letterSpacing: '-0.5px' }}>{t('nav.title')}</span>
        </div>

        <div className="navbar-page-meta" aria-label={activePage.title}>
          <span className="navbar-page-title">{activePage.title}</span>
          {activePage.subtitle ? <span className="navbar-page-subtitle">{activePage.subtitle}</span> : null}
        </div>
      </div>

      <div className="navbar-center">
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
      </div>
        
      <div className="navbar-right">
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
    </div>
  );
}
