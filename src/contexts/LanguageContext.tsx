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
    // Common
    'common.refresh': 'Refresh',
    'common.retry': 'Retry',
    'common.error': 'Error',
    
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
    'attendance.nearDatesFilter': 'Show nearby dates only (-1 to +12 days)',
    'attendance.confirm': 'Confirm',
    'attendance.reset': 'Reset',
    'attendance.changesSaved': 'Changes saved successfully!',
    'attendance.noChangesToSave': 'No changes to save.',
    'attendance.loading': 'Loading...',
    'attendance.refresh': 'Refresh',
    'attendance.saving': 'Saving...',
    'attendance.dataSourceDataverse': 'Dataverse',
    'attendance.dataSourceMock': 'Mock Data',
    'attendance.viewPivot': 'Pivot View',
    'attendance.viewGallery': 'Gallery View',
    'attendance.today': 'Today',
    'attendance.totalWorkers': 'Total Workers',
    'attendance.scheduledSlice': 'Scheduled (Slice)',
    'attendance.overtimeSlice': 'Overtime (Slice)',
    'attendance.leaveSlice': 'Leave (Slice)',
    'attendance.lastColorShift': 'Last color shift',
    'attendance.actualArrivedPlanInternal': 'Actual Arrived/Plan Internal Workers',
    'attendance.actualArrivedPlanThirdParty': 'Actual Arrived/Plan 3rd Party Workers',
    'attendance.overtimeWorkers': 'Overtime workers',
    'attendance.leaveWorkers': 'Leave workers',
    'attendance.allWorkers': 'All workers',
    'attendance.quickSearch': 'Quick Search',
    'attendance.export': 'Export',
    'attendance.addWorker': '+ Add worker',
    'attendance.searchByIdOrName': 'Search by ID or Name',
    'attendance.noMatchingWorkers': 'No matching workers.',
    'attendance.cancel': 'Cancel',
    'attendance.add': 'Add',
    'attendance.workingHour': 'Working hour',
    'attendance.actions': 'Actions',
    'attendance.noEmployeesInSlice': 'No employees in this date/shift view.',
    
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
    'labor.selectDate': 'Select Date',
    'labor.selectWorker': 'Select Employee to Add',
    'labor.close': 'Close',
    'labor.dayShift': 'Day Shift',
    'labor.nightShift': 'Night Shift',
    'labor.selectDateShift': 'Select Date & Shift',
    
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
    // Common
    'common.refresh': '刷新',
    'common.retry': '重试',
    'common.error': '错误',
    
    // Navbar
    'nav.attendance': '出勤计划',
    'nav.assembly': '产线',
    'nav.employee': '刷卡',
    'nav.title': 'test',
    
    // Attendance Plan
    'attendance.title': '考勤计划',
    'attendance.subtitle': '管理班次安排、跟踪出勤并处理手动调整。',
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
    'attendance.night': '晚班',
    'attendance.nearDatesFilter': '仅显示附近日期（-1至+12天)',
    'attendance.confirm': '确认',
    'attendance.reset': '重置',
    'attendance.changesSaved': '更改已成功保存！',
    'attendance.noChangesToSave': '没有需要保存的更改。',
    'attendance.loading': '加载中...',
    'attendance.refresh': '刷新',
    'attendance.saving': '保存中...',
    'attendance.dataSourceDataverse': 'Dataverse',
    'attendance.dataSourceMock': '模拟数据',
    'attendance.viewPivot': '透视视图',
    'attendance.viewGallery': '列表视图',
    'attendance.today': '今天',
    'attendance.totalWorkers': '总数',
    'attendance.scheduledSlice': '本班次人数',
    'attendance.overtimeSlice': '加班（本班次）',
    'attendance.leaveSlice': '请假（本班次）',
    'attendance.lastColorShift': '上一班（班组）',
    'attendance.actualArrivedPlanInternal': '实到/计划（LEGO）',
    'attendance.actualArrivedPlanThirdParty': '实到/计划（三方）',
    'attendance.overtimeWorkers': '加班',
    'attendance.leaveWorkers': '休假',
    'attendance.allWorkers': '全部员工',
    'attendance.quickSearch': '快速搜索',
    'attendance.export': '导出',
    'attendance.addWorker': '+ 添加员工',
    'attendance.searchByIdOrName': '按ID或姓名搜索',
    'attendance.noMatchingWorkers': '没有匹配的员工。',
    'attendance.cancel': '取消',
    'attendance.add': '添加',
    'attendance.workingHour': '工时',
    'attendance.actions': '操作',
    'attendance.noEmployeesInSlice': '该日期/班次没有员工。',
    
    // Filters
    'filter.all': '全部',
    'filter.green': '绿班',
    'filter.blue': '蓝班',
    'filter.orange': '橙班',
    'filter.yellow': '黄班',
    
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
    'labor.selectDate': '选择日期',
    'labor.selectWorker': '选择要添加的员工',
    'labor.close': '关闭',
    'labor.dayShift': '白班',
    'labor.nightShift': '夜班',
    'labor.selectDateShift': '选择日期和班次',
    
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
