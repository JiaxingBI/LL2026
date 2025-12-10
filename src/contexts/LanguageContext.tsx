import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navbar
    'nav.attendance': 'Attendance',
    'nav.assembly': 'Assembly',
    'nav.employee': 'Employee',
    'nav.title': 'Labor Link',
    
    // Attendance Plan
    'attendance.title': 'Attendance Plan',
    'attendance.subtitle': 'Manage shift schedules, track attendance, and handle manual adjustments.',
    'attendance.search': 'Search people...',
    'attendance.autoAssign': 'Auto Assign',
    'attendance.autoAssignComplete': 'Auto-assign completed (Mock)',
    'attendance.id': 'ID',
    'attendance.name': 'Name',
    'attendance.role': 'Role',
    'attendance.id_status': 'I/D',
    'attendance.status': 'Status',
    'attendance.shift': 'Shift',
    'attendance.gender': 'Gender',
    'attendance.day': 'DAY',
    'attendance.night': 'NIGHT',
    'attendance.nearDatesFilter': 'Show nearby dates only (-4 to +12 days)',
    
    // Filters
    'filter.all': 'All',
    'filter.green': 'Green',
    'filter.blue': 'Blue',
    'filter.orange': 'Orange',
    'filter.yellow': 'Yellow',
    
    // Gender options
    'gender.male': 'Male',
    'gender.female': 'Female',
    
    // I/D options
    'id.direct': 'Direct',
    'id.indirect': 'Indirect',
    
    // Adjustment Table
    'adjustment.title': 'Adjustment Log',
    'adjustment.add': 'Add Adjustment',
    'adjustment.name': 'Name',
    'adjustment.type': 'Type',
    'adjustment.duration': 'Duration',
    'adjustment.date': 'Date',
    'adjustment.shift': 'Shift',
    'adjustment.notes': 'Notes',
    'adjustment.leave': 'Leave',
    'adjustment.overtime': 'Overtime',
    'adjustment.transfer': 'Transfer',
    'adjustment.edit': 'Edit',
    'adjustment.day': 'Day',
    'adjustment.night': 'Night',
    'adjustment.dayNight': 'Day/Night',
    'adjustment.addNotes': 'Add notes...',
    'adjustment.durationPlaceholder': 'e.g. 2h',
    
    // Labor Scheduling
    'labor.title': 'Labor Scheduling',
    'labor.subtitle': 'Real-time assembly line allocation. Monitor staffing levels across regions.',
    'labor.southRegion': 'South Region',
    'labor.northRegion': 'North Region',
    'labor.totalWorkforce': 'Total Workforce',
    'labor.needed': 'needed',
    'labor.notifyTeam': 'Notify Team',
    'labor.addLine': 'Add Line',
    'labor.capacity': 'Capacity',
    'labor.noWorkers': 'No workers assigned',
    'labor.addWorker': 'Add Worker',
    'labor.shifts': 'shifts',
    
    // Employee View
    'employee.title': 'Employee Kiosk',
    'employee.subtitle': 'Scan your QR code or search to view your schedule',
    'employee.searchPlaceholder': 'Search by name or employee ID... (Try: Alex, 1, Ben)',
    'employee.search': 'Search',
    'employee.notFound': 'Employee not found (Try "Alex" or "1")',
    'employee.active': 'Active',
    'employee.currentAssignment': 'Current Assignment',
    'employee.location': 'Location',
    'employee.shift': 'Shift',
    'employee.dayShift': 'Day Shift (07:00 - 19:00)',
    'employee.nightShift': 'Night Shift (19:00 - 07:00)',
    'employee.specialInstructions': 'Special Instructions',
    'employee.instructionText': '19 people from 11B, return after order completion',
    'employee.teamMembers': 'Team Members',
    'employee.colleagues': 'Colleagues',
    'employee.upcomingSchedule': 'Upcoming Schedule',
    'employee.tomorrow': 'Tomorrow',
    'employee.dayAfter': 'Day After',
    'employee.closeSchedule': 'Close Schedule',
  },
  zh: {
    // Navbar
    'nav.attendance': '考勤',
    'nav.assembly': '组装',
    'nav.employee': '员工',
    'nav.title': '劳动力链接',
    
    // Attendance Plan
    'attendance.title': '考勤计划',
    'attendance.subtitle': '管理班次安排、跟踪考勤并处理手动调整。',
    'attendance.search': '搜索员工...',
    'attendance.autoAssign': '自动分配',
    'attendance.autoAssignComplete': '自动分配完成（模拟）',
    'attendance.id': 'ID',
    'attendance.name': '姓名',
    'attendance.role': '角色',
    'attendance.id_status': '直接/间接',
    'attendance.status': '状态',
    'attendance.shift': '班次',
    'attendance.gender': '性别',
    'attendance.day': '白班',
    'attendance.night': '夜班',
    'attendance.nearDatesFilter': '仅显示附近日期（-4至+12天）',
    
    // Filters
    'filter.all': '全部',
    'filter.green': '绿色',
    'filter.blue': '蓝色',
    'filter.orange': '橙色',
    'filter.yellow': '黄色',
    
    // Gender options
    'gender.male': '男',
    'gender.female': '女',
    
    // I/D options
    'id.direct': '直接',
    'id.indirect': '间接',
    
    // Adjustment Table
    'adjustment.title': '调整记录',
    'adjustment.add': '添加调整',
    'adjustment.name': '姓名',
    'adjustment.type': '类型',
    'adjustment.duration': '时长',
    'adjustment.date': '日期',
    'adjustment.shift': '班次',
    'adjustment.notes': '备注',
    'adjustment.leave': '请假',
    'adjustment.overtime': '加班',
    'adjustment.transfer': '调岗',
    'adjustment.edit': '修改',
    'adjustment.day': '白班',
    'adjustment.night': '夜班',
    'adjustment.dayNight': '白班/夜班',
    'adjustment.addNotes': '添加备注...',
    'adjustment.durationPlaceholder': '例如 2小时',
    
    // Labor Scheduling
    'labor.title': '劳动力调度',
    'labor.subtitle': '实时装配线分配。监控各区域人员配置水平。',
    'labor.southRegion': '南部区域',
    'labor.northRegion': '北部区域',
    'labor.totalWorkforce': '总劳动力',
    'labor.needed': '需要',
    'labor.notifyTeam': '通知团队',
    'labor.addLine': '添加产线',
    'labor.capacity': '容量',
    'labor.noWorkers': '未分配工人',
    'labor.addWorker': '添加工人',
    'labor.shifts': '班次',
    
    // Employee View
    'employee.title': '员工自助终端',
    'employee.subtitle': '扫描二维码或搜索查看您的排班',
    'employee.searchPlaceholder': '按姓名或员工ID搜索...（试试：Alex, 1, Ben）',
    'employee.search': '搜索',
    'employee.notFound': '未找到员工（试试 "Alex" 或 "1"）',
    'employee.active': '在职',
    'employee.currentAssignment': '当前分配',
    'employee.location': '位置',
    'employee.shift': '班次',
    'employee.dayShift': '白班 (07:00 - 19:00)',
    'employee.nightShift': '夜班 (19:00 - 07:00)',
    'employee.specialInstructions': '特别说明',
    'employee.instructionText': '19人来自11B，订单结束后返回',
    'employee.teamMembers': '团队成员',
    'employee.colleagues': '同事',
    'employee.upcomingSchedule': '即将到来的排班',
    'employee.tomorrow': '明天',
    'employee.dayAfter': '后天',
    'employee.closeSchedule': '关闭排班',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
