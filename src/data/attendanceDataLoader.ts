import type { AttendanceDataSource, AttendanceRecord, AttendanceAdjustment, Employee } from '../types';
import attendanceDataJson from './attendanceData.json';

// Load attendance data from JSON
export const attendanceData: AttendanceDataSource = attendanceDataJson as AttendanceDataSource;

// Get all attendance records
export function getAttendanceRecords(): AttendanceRecord[] {
  return attendanceData.attendanceRecords;
}

// Get attendance records by date
export function getAttendanceByDate(date: string): AttendanceRecord[] {
  return attendanceData.attendanceRecords.filter(record => record.date === date);
}

// Get attendance records by employee
export function getAttendanceByEmployee(employeeId: string): AttendanceRecord[] {
  return attendanceData.attendanceRecords.filter(record => record.employeeId === employeeId);
}

// Get attendance records by shift team
export function getAttendanceByShiftTeam(shiftTeam: string): AttendanceRecord[] {
  return attendanceData.attendanceRecords.filter(record => record.shiftTeam === shiftTeam);
}

// Get attendance records by shift type
export function getAttendanceByShiftType(shiftType: 'Day' | 'Night' | 'Rest'): AttendanceRecord[] {
  return attendanceData.attendanceRecords.filter(record => record.shiftType === shiftType);
}

// Get all adjustments
export function getAdjustments(): AttendanceAdjustment[] {
  return attendanceData.adjustments;
}

// Get adjustments by date
export function getAdjustmentsByDate(date: string): AttendanceAdjustment[] {
  return attendanceData.adjustments.filter(adj => adj.date === date);
}

// Get adjustments by employee
export function getAdjustmentsByEmployee(employeeId: string): AttendanceAdjustment[] {
  return attendanceData.adjustments.filter(adj => adj.employeeId === employeeId);
}

// Get shift schedule config
export function getShiftScheduleConfig() {
  return attendanceData.shiftScheduleConfig;
}

// Convert attendance records to Employee format with shifts
export function convertToEmployeeFormat(): Employee[] {
  const employeeMap = new Map<string, Employee>();
  
  // Initialize employees from the data source
  attendanceData.employees.forEach(emp => {
    employeeMap.set(emp.id, {
      id: emp.id,
      name: emp.name,
      role: emp.role as Employee['role'],
      indirectDirect: emp.indirectDirect,
      status: emp.workStatus,
      shiftTeam: emp.shiftTeam,
      gender: emp.gender,
      shifts: {}
    });
  });
  
  // Populate shifts from attendance records
  attendanceData.attendanceRecords.forEach(record => {
    const employee = employeeMap.get(record.employeeId);
    if (employee) {
      const [, month, day] = record.date.split('-').map(Number);
      const dateKey = `${month}/${day}`;
      
      if (!employee.shifts[dateKey]) {
        employee.shifts[dateKey] = { day: '', night: '' };
      }
      
      if (record.shiftType === 'Day') {
        employee.shifts[dateKey].day = record.workingHours.toString();
      } else if (record.shiftType === 'Night') {
        employee.shifts[dateKey].night = record.workingHours.toString();
      }
    }
  });
  
  return Array.from(employeeMap.values());
}

// Format date for display
export function formatDateForDisplay(isoDate: string): string {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${month}/${day}`;
}

// Convert display date to ISO format
export function formatDateToISO(displayDate: string, year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const [month, day] = displayDate.split('/').map(Number);
  return `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Get attendance summary for a date range
export function getAttendanceSummary(startDate: string, endDate: string) {
  const records = attendanceData.attendanceRecords.filter(record => 
    record.date >= startDate && record.date <= endDate
  );
  
  return {
    totalRecords: records.length,
    present: records.filter(r => r.attendanceStatus === 'Present').length,
    absent: records.filter(r => r.attendanceStatus === 'Absent').length,
    late: records.filter(r => r.attendanceStatus === 'Late').length,
    off: records.filter(r => r.attendanceStatus === 'Off').length,
    totalWorkingHours: records.reduce((sum, r) => sum + r.workingHours, 0),
    totalOvertimeHours: records.reduce((sum, r) => sum + r.overtimeHours, 0),
    byShiftTeam: {
      Green: records.filter(r => r.shiftTeam === 'Green').length,
      Blue: records.filter(r => r.shiftTeam === 'Blue').length,
      Orange: records.filter(r => r.shiftTeam === 'Orange').length,
      Yellow: records.filter(r => r.shiftTeam === 'Yellow').length
    },
    byShiftType: {
      Day: records.filter(r => r.shiftType === 'Day').length,
      Night: records.filter(r => r.shiftType === 'Night').length,
      Rest: records.filter(r => r.shiftType === 'Rest').length
    }
  };
}
