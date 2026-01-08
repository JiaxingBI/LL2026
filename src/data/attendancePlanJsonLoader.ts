import type { AttendanceDataSource, AttendanceRecord, Employee } from '../types';

import attendanceDataJson from './attendanceData.json';

const attendanceData = attendanceDataJson as AttendanceDataSource;

function getUtc8Now(): Date {
  const now = new Date();
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMillis + 8 * 60 * 60_000);
}

function isoFromYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDaysUtc(isoDate: string, deltaDays: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day + deltaDays));
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  return isoFromYmd(y, m, d);
}

function dateKeyFromIso(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3) return '';
  const [, month, day] = parts;
  if (!month || !day) return '';
  return `${month}/${day}`;
}

function safeInt(value: unknown): number {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

export type AttendancePlanJsonLoadResult = {
  employees: Employee[];
  dateKeys: string[];
  dateKeyToIso: Record<string, string>;
  year: number;
};

function buildEmployeesFromAttendanceRecords(records: AttendanceRecord[]): Employee[] {
  const employeeMap = new Map<string, Employee>();

  // Seed employees from source list
  for (const emp of attendanceData.employees) {
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
  }

  for (const record of records) {
    const employee = employeeMap.get(record.employeeId);
    if (!employee) continue;

    // Keep employee metadata aligned with record (in case it differs)
    employee.name = record.name || employee.name;
    employee.role = (record.role || employee.role) as Employee['role'];
    employee.indirectDirect = record.indirectDirect;
    employee.status = record.workStatus;
    employee.shiftTeam = record.shiftTeam;

    const dateKey = dateKeyFromIso(record.date);
    if (!dateKey) continue;

    if (!employee.shifts[dateKey]) {
      employee.shifts[dateKey] = { day: '', night: '' };
    }

    const hours = safeInt(record.workingHours);
    const normalizedHours = hours > 0 ? String(hours) : '';

    if (record.shiftType === 'Day') employee.shifts[dateKey].day = normalizedHours;
    if (record.shiftType === 'Night') employee.shifts[dateKey].night = normalizedHours;
  }

  return Array.from(employeeMap.values());
}

export function loadAttendancePlanFromJson(daysAheadInclusive = 30): AttendancePlanJsonLoadResult {
  const nowUtc8 = getUtc8Now();
  const startIso = isoFromYmd(nowUtc8.getFullYear(), nowUtc8.getMonth() + 1, nowUtc8.getDate());

  // Target ISO dates: today..today+daysAheadInclusive
  const targetIsos: string[] = [];
  for (let i = 0; i <= daysAheadInclusive; i++) {
    targetIsos.push(addDaysUtc(startIso, i));
  }

  const dateKeys = targetIsos.map(dateKeyFromIso).filter(Boolean);
  const dateKeyToIso: Record<string, string> = {};
  for (let i = 0; i < targetIsos.length; i++) {
    const key = dateKeys[i];
    if (key) dateKeyToIso[key] = targetIsos[i];
  }

  // Source pattern: group records by employee and by chronological order
  const sourceByEmployee = new Map<string, AttendanceRecord[]>();
  for (const rec of attendanceData.attendanceRecords) {
    const list = sourceByEmployee.get(rec.employeeId) ?? [];
    list.push(rec);
    sourceByEmployee.set(rec.employeeId, list);
  }
  for (const [empId, list] of sourceByEmployee.entries()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    sourceByEmployee.set(empId, list);
  }

  const remappedRecords: AttendanceRecord[] = [];
  for (const emp of attendanceData.employees) {
    const pattern = sourceByEmployee.get(emp.id) ?? [];

    for (let i = 0; i < targetIsos.length; i++) {
      const targetDate = targetIsos[i];

      if (pattern.length === 0) {
        remappedRecords.push({
          recordId: `${emp.id}-${targetDate}`,
          date: targetDate,
          employeeId: emp.id,
          name: emp.name,
          role: emp.role,
          indirectDirect: emp.indirectDirect,
          workStatus: emp.workStatus,
          shiftTeam: emp.shiftTeam,
          shiftType: 'Rest',
          workingHours: 0,
          checkInTime: null,
          checkOutTime: null,
          overtimeHours: 0,
          attendanceStatus: 'Off',
          notes: ''
        });
        continue;
      }

      const src = pattern[i % pattern.length];
      remappedRecords.push({
        ...src,
        recordId: `${emp.id}-${targetDate}`,
        date: targetDate
      });
    }
  }

  const employees = buildEmployeesFromAttendanceRecords(remappedRecords);

  return {
    employees,
    dateKeys,
    dateKeyToIso,
    year: nowUtc8.getFullYear()
  };
}
