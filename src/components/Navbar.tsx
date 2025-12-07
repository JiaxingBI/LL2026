import { Calendar, LayoutDashboard, User } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'assembly', label: 'Assembly', icon: LayoutDashboard },
    { id: 'employee', label: 'Employee', icon: User },
  ];

  return (
    <div className="navbar">
      <div className="flex items-center gap-2">
        <div style={{ background: 'var(--accent-blue)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
          <LayoutDashboard size={20} color="white" />
        </div>
        <span style={{ fontWeight: 'bold', fontSize: '20px', letterSpacing: '-0.5px' }}>Labor Link</span>
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
