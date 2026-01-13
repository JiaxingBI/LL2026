/**
 * Dataverse Data Loader
 * Fetches and transforms data from the four connected Dataverse tables:
 * - jia_ll_demployees (Employees)
 * - jia_ll_dshiftgroups (Shift Groups)
 * - jia_ll_dshiftplans (Shift Plans)
 * - jia_ll_fattendancereocrds (Attendance Records)
 */

import { Jia_ll_demployeesService } from '../generated/services/Jia_ll_demployeesService';
import { Jia_ll_dshiftgroupsService } from '../generated/services/Jia_ll_dshiftgroupsService';
import { Jia_ll_dshiftplansService } from '../generated/services/Jia_ll_dshiftplansService';
import { Jia_ll_fattendancereocrdsService } from '../generated/services/Jia_ll_fattendancereocrdsService';
import type { Jia_ll_demployees } from '../generated/models/Jia_ll_demployeesModel';
import type { Jia_ll_dshiftgroups } from '../generated/models/Jia_ll_dshiftgroupsModel';
import type { Jia_ll_dshiftplans } from '../generated/models/Jia_ll_dshiftplansModel';
import type { Jia_ll_fattendancereocrds } from '../generated/models/Jia_ll_fattendancereocrdsModel';
import type { Employee, ShiftEntry, Role, ShiftTeam, WorkStatus } from '../types';

// Dataverse raw types export
export type { Jia_ll_demployees, Jia_ll_dshiftgroups, Jia_ll_dshiftplans, Jia_ll_fattendancereocrds };

export interface DataverseData {
  employees: Jia_ll_demployees[];
  shiftGroups: Jia_ll_dshiftgroups[];
  shiftPlans: Jia_ll_dshiftplans[];
  attendanceRecords: Jia_ll_fattendancereocrds[];
}

export interface TransformedData {
  employees: Employee[];
  dateKeys: string[];
  year: number;
  raw: DataverseData;
}

const SHIFT_WORKTYPE_PATTERNS = [
  '12H SHF 1',
  '12H SHF 2',
  '12H SHF 3',
  '12H SHF 4'
] as const;

/**
 * Fetch all data from the four Dataverse tables
 */
export async function fetchDataverseData(): Promise<DataverseData> {
  try {
    // Fetch all tables in parallel for better performance
    const [employeesResult, shiftGroupsResult, shiftPlansResult, attendanceResult] = await Promise.all([
      Jia_ll_demployeesService.getAll({
        select: ['jia_ll_demployeeid', 'jia_empid', 'jia_name', 'jia_preferredname', 'jia_email', 
                 'jia_costcenter', 'jia_organizationalunit', 'jia_worktype', 'jia_employeestatus', 'statecode', 'statuscode'],
        // Only Active employees + only the 12H SHF 1/2/3/4 worktypes
        filter: "statecode eq 0 and (" +
          "contains(jia_worktype,'12H SHF 1') or " +
          "contains(jia_worktype,'12H SHF 2') or " +
          "contains(jia_worktype,'12H SHF 3') or " +
          "contains(jia_worktype,'12H SHF 4')" +
        ")"
      }),
      Jia_ll_dshiftgroupsService.getAll({
        select: ['jia_ll_dshiftgroupid', 'jia_shift', 'jia_shiftcn', 'jia_area', 'jia_department', 'statecode']
      }),
      Jia_ll_dshiftplansService.getAll({
        select: ['jia_ll_dshiftplanid', 'jia_date', 'jia_daynightshift', 'jia_colorshift', 
                 'jia_area', 'jia_department', 'statecode']
      }),
      Jia_ll_fattendancereocrdsService.getAll({
        select: ['jia_ll_fattendancereocrdid', 'jia_hours', 'jia_action', 'jia_daynightshift',
                 'jia_colorshift', 'jia_area', 'jia_department', 'statecode']
      })
    ]);

    return {
      employees: employeesResult.data || [],
      shiftGroups: shiftGroupsResult.data || [],
      shiftPlans: shiftPlansResult.data || [],
      attendanceRecords: attendanceResult.data || []
    };
  } catch (error) {
    console.error('Failed to fetch Dataverse data:', error);
    throw error;
  }
}

/**
 * Map color shift from Dataverse to ShiftTeam type
 */
export function mapColorToShiftTeam(colorShift?: string): ShiftTeam {
  if (!colorShift) return 'Green';
  const color = colorShift.toLowerCase();
  if (color.includes('green')) return 'Green';
  if (color.includes('blue')) return 'Blue';
  if (color.includes('orange')) return 'Orange';
  if (color.includes('yellow')) return 'Yellow';
  return 'Green';
}

function mapWorkTypeToShiftTeam(workType?: string): ShiftTeam | null {
  if (!workType) return null;
  const normalized = workType.toUpperCase();

  // User requirement: worktype contains "12H SHF 1/2/3/4".
  // Be permissive about spacing (e.g. SHF1 vs SHF 1).
  if (!normalized.includes('12H')) return null;
  if (/SHF\s*1/.test(normalized)) return 'Green';
  if (/SHF\s*2/.test(normalized)) return 'Orange';
  if (/SHF\s*3/.test(normalized)) return 'Yellow';
  if (/SHF\s*4/.test(normalized)) return 'Blue';
  return null;
}

function isEligibleEmployeeWorkType(workType?: string): boolean {
  if (!workType) return false;
  const normalized = workType.toUpperCase();
  return SHIFT_WORKTYPE_PATTERNS.some(p => normalized.includes(p));
}

/**
 * Map work type to Role
 */
function mapWorkTypeToRole(workType?: string): Role {
  if (!workType) return 'Ops.L1';
  const type = workType.toLowerCase();
  if (type.includes('tc.l1') || type.includes('tcl1')) return 'TC.L1';
  if (type.includes('tc.l2') || type.includes('tcl2')) return 'TC.L2';
  if (type.includes('tc.l3') || type.includes('tcl3')) return 'TC.L3';
  if (type.includes('hall') || type.includes('assist')) return 'Hall Asist';
  if (type.includes('sr.infeeder') || type.includes('senior')) return 'Sr.Infeeder';
  if (type.includes('infeeder')) return 'Infeeder';
  return 'Ops.L1';
}

/**
 * Map employee status to WorkStatus
 */
function mapEmployeeStatusToWorkStatus(status?: string): WorkStatus {
  if (!status) return 'Prod.';
  const s = status.toLowerCase();
  if (s.includes('jail')) return 'Jail';
  if (s.includes('daily')) return 'DailyProduction';
  return 'Prod.';
}

/**
 * Transform Dataverse data into app-compatible Employee format
 */
export function transformDataverseData(data: DataverseData): TransformedData {
  const year = new Date().getFullYear();
  
  // Build date keys from shift plans
  const dateKeySet = new Set<string>();
  for (const plan of data.shiftPlans) {
    if (plan.jia_date) {
      // jia_date could be ISO format (2026-01-13) or other formats
      const parts = plan.jia_date.split(/[-\/]/);
      if (parts.length >= 3) {
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        if (month && day) {
          dateKeySet.add(`${month}/${day}`);
        }
      }
    }
  }
  
  // Sort date keys chronologically
  const dateKeys = Array.from(dateKeySet).sort((a, b) => {
    const [am, ad] = a.split('/').map(Number);
    const [bm, bd] = b.split('/').map(Number);
    return am !== bm ? am - bm : ad - bd;
  });

  // If no dates from shift plans, generate current month range
  if (dateKeys.length === 0) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const daysInMonth = new Date(year, currentMonth, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      dateKeys.push(`${currentMonth}/${d}`);
    }
  }

  // Transform employees
  const employees: Employee[] = data.employees
    // Active employees only
    .filter(emp => emp.statecode === 0)
    // Worktype must contain 12H SHF 1/2/3/4
    .filter(emp => isEligibleEmployeeWorkType(emp.jia_worktype))
    .map(emp => {
      const shiftTeam = mapWorkTypeToShiftTeam(emp.jia_worktype) ?? 'Green';

      const shifts: Record<string, ShiftEntry> = {};
      
      // Initialize all dates with empty shifts
      for (const dateKey of dateKeys) {
        shifts[dateKey] = { day: '', night: '' };
      }

      // TODO: Link attendance records to employee shifts when employee relationship is available
      // For now, employees start with empty schedules that can be filled via the UI

      return {
        id: emp.jia_empid || emp.jia_ll_demployeeid,
        name: emp.jia_preferredname || emp.jia_name || 'Unknown',
        role: mapWorkTypeToRole(emp.jia_worktype),
        indirectDirect: 'Direct' as const,
        status: mapEmployeeStatusToWorkStatus(emp.jia_employeestatus),
        shiftTeam,
        gender: 'Male' as const, // Default, field not in Dataverse schema
        shifts
      };
    });

  return {
    employees,
    dateKeys,
    year,
    raw: data
  };
}

/**
 * Create a new attendance record in Dataverse
 */
export async function createAttendanceRecord(record: {
  hours: string;
  action: string;
  dayNightShift: string;
  colorShift: string;
  area: string;
  department: string;
}) {
  try {
    const result = await Jia_ll_fattendancereocrdsService.create({
      jia_hours: record.hours,
      jia_action: record.action,
      jia_daynightshift: record.dayNightShift,
      jia_colorshift: record.colorShift,
      jia_area: record.area,
      jia_department: record.department,
      statecode: 0,
      ownerid: '', // Will be set by Dataverse
      owneridtype: 'systemuser'
    });
    return result;
  } catch (error) {
    console.error('Failed to create attendance record:', error);
    throw error;
  }
}

/**
 * Update an existing attendance record
 */
export async function updateAttendanceRecord(
  id: string,
  changes: Partial<{
    hours: string;
    action: string;
    dayNightShift: string;
  }>
) {
  try {
    const updateFields: Record<string, string> = {};
    if (changes.hours !== undefined) updateFields.jia_hours = changes.hours;
    if (changes.action !== undefined) updateFields.jia_action = changes.action;
    if (changes.dayNightShift !== undefined) updateFields.jia_daynightshift = changes.dayNightShift;
    
    const result = await Jia_ll_fattendancereocrdsService.update(id, updateFields);
    return result;
  } catch (error) {
    console.error('Failed to update attendance record:', error);
    throw error;
  }
}

/**
 * Delete an attendance record
 */
export async function deleteAttendanceRecord(id: string) {
  try {
    await Jia_ll_fattendancereocrdsService.delete(id);
  } catch (error) {
    console.error('Failed to delete attendance record:', error);
    throw error;
  }
}
