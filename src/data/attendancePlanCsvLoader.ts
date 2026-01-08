import type { Employee } from '../types';

import csvText from './attendancePlan.csv?raw';

type AttendancePlanCsvRow = {
  date: string;
  employeeId: string;
  name: string;
  role: string;
  indirectDirect: string;
  workStatus: string;
  shiftTeam: string;
  shiftType: string;
  workingHours: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    // Skip fully empty trailing rows
    if (row.length === 1 && row[0] === '') {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      pushField();
      continue;
    }

    if (ch === '\r') {
      continue;
    }

    if (ch === '\n') {
      pushField();
      pushRow();
      continue;
    }

    field += ch;
  }

  // Flush last field/row
  pushField();
  if (row.length > 0) pushRow();

  return rows;
}

function toDateKeyFromIso(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3) return '';
  const [, month, day] = parts;
  if (!month || !day) return '';
  return `${month}/${day}`;
}

function safeInt(value: string): number {
  const n = parseInt(String(value).trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

export type AttendancePlanCsvLoadResult = {
  employees: Employee[];
  dateKeys: string[];
  year: number;
};

export function loadAttendancePlanFromCsv(): AttendancePlanCsvLoadResult {
  const rows = parseCsv(csvText.trim());
  if (rows.length === 0) {
    return { employees: [], dateKeys: [], year: new Date().getFullYear() };
  }

  const header = rows[0].map(h => h.trim());
  const dataRows = rows.slice(1);

  const idx = (name: keyof AttendancePlanCsvRow) => header.indexOf(name);

  const dateIdx = idx('date');
  const employeeIdIdx = idx('employeeId');
  const nameIdx = idx('name');
  const roleIdx = idx('role');
  const indirectDirectIdx = idx('indirectDirect');
  const workStatusIdx = idx('workStatus');
  const shiftTeamIdx = idx('shiftTeam');
  const shiftTypeIdx = idx('shiftType');
  const workingHoursIdx = idx('workingHours');

  const employeeMap = new Map<string, Employee>();
  const dateIsoSet = new Set<string>();
  let inferredYear = new Date().getFullYear();

  for (const r of dataRows) {
    const dateIso = (r[dateIdx] ?? '').trim();
    const employeeId = (r[employeeIdIdx] ?? '').trim();
    if (!dateIso || !employeeId) continue;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      dateIsoSet.add(dateIso);
      const y = parseInt(dateIso.slice(0, 4), 10);
      if (Number.isFinite(y)) inferredYear = y;
    }

    const dateKey = toDateKeyFromIso(dateIso);
    if (!dateKey) continue;

    const employeeName = (r[nameIdx] ?? '').trim();
    const role = (r[roleIdx] ?? 'TC.L1').trim();
    const indirectDirect = (r[indirectDirectIdx] ?? 'Direct').trim() as Employee['indirectDirect'];
    const workStatus = (r[workStatusIdx] ?? 'Prod.').trim() as Employee['status'];
    const shiftTeam = (r[shiftTeamIdx] ?? 'Green').trim() as Employee['shiftTeam'];
    const shiftType = (r[shiftTypeIdx] ?? '').trim();
    const workingHours = safeInt(r[workingHoursIdx] ?? '');

    const existing = employeeMap.get(employeeId);
    const employee: Employee = existing ?? {
      id: employeeId,
      name: employeeName || employeeId,
      role: role as Employee['role'],
      indirectDirect,
      status: workStatus,
      shiftTeam,
      gender: 'Male',
      shifts: {}
    };

    // Update latest metadata in case CSV changes per day
    employee.name = employeeName || employee.name;
    employee.role = role as Employee['role'];
    employee.indirectDirect = indirectDirect;
    employee.status = workStatus;
    employee.shiftTeam = shiftTeam;

    if (!employee.shifts[dateKey]) {
      employee.shifts[dateKey] = { day: '', night: '' };
    }

    const normalizedHours = workingHours > 0 ? String(workingHours) : '';
    if (shiftType === 'Day') {
      employee.shifts[dateKey].day = normalizedHours;
    } else if (shiftType === 'Night') {
      employee.shifts[dateKey].night = normalizedHours;
    } else {
      // Rest/unknown: leave empty
    }

    employeeMap.set(employeeId, employee);
  }

  const dateKeys = Array.from(dateIsoSet)
    .sort((a, b) => a.localeCompare(b))
    .map(toDateKeyFromIso)
    .filter(Boolean);

  return {
    employees: Array.from(employeeMap.values()),
    dateKeys,
    year: inferredYear
  };
}
