/**
 * Dataverse Data Loader
 * 
 * Fetches and transforms data from the four connected Dataverse tables:
 * - jia_ll_demployees (Employees) – master employee list, filtered by jia_worktype
 * - jia_ll_dshiftgroups (Shift Groups) – area/department/shift definitions
 * - jia_ll_dshiftplans (Shift Plans) – READ-ONLY base schedule; colorshift→team mapping
 * - jia_ll_fattendancereocrds (Attendance Records) – WRITE for exceptions (OT/Leave only)
 * 
 * Data Flow:
 * 1. Load: fetchDataverseData() retrieves all four tables in parallel
 * 2. Transform: transformDataverseData() joins shiftPlans with employees via colorshift↔jia_worktype
 * 3. Save: createAttendanceRecord() persists OT/Leave adjustments to ll_fAttendanceRecord
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
import { USE_MOCK_DATA, generateMockDataverseData } from './mockData';

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

/**
 * Fetch all data from the four Dataverse tables
 */
export async function fetchDataverseData(): Promise<DataverseData> {
  // ── Mock data shortcut ──
  if (USE_MOCK_DATA) {
    console.log('[LaborLink] Using mock data (USE_MOCK_DATA = true)');
    return generateMockDataverseData();
  }

  try {
    // Fetch all tables in parallel for better performance
    const [employeesResult, shiftGroupsResult, shiftPlansResult, attendanceResult] = await Promise.all([
      Jia_ll_demployeesService.getAll({
        select: ['jia_ll_demployeeid', 'jia_empid', 'jia_name', 'jia_preferredname', 'jia_email', 
                 'jia_costcenter', 'jia_organizationalunit', 'jia_worktype', 'jia_employeestatus', 'statecode', 'statuscode']
        // No statecode filter - filter only by jia_worktype in transform
      }),
      Jia_ll_dshiftgroupsService.getAll({
        select: ['jia_ll_dshiftgroupid', 'jia_shift', 'jia_shiftcn', 'jia_area', 'jia_department', 'statecode']
      }),
      Jia_ll_dshiftplansService.getAll({
        select: ['jia_ll_dshiftplanid', 'jia_date', 'jia_daynightshift', 'jia_colorshift', 
                 'jia_area', 'jia_department', 'statecode'],
        maxPageSize: 5000,
        filter: `jia_date ge '2026-01-01' and jia_date le '2026-12-31'`
      }),
      Jia_ll_fattendancereocrdsService.getAll({
        // NOTE: The current schema does NOT have jia_empid (employee ID) or jia_date fields.
        // This prevents merging exceptions back into per-employee grid cells on reload.
        // TODO: Add jia_empid and jia_date columns to jia_ll_fattendancereocrds in Dataverse,
        //       then update this select and the transformDataverseData merge step below.
        select: ['jia_ll_fattendancereocrdid', 'jia_hours', 'jia_action', 'jia_daynightshift',
                 'jia_colorshift', 'jia_area', 'jia_department', 'statecode', 'createdon']
      })
    ]);

    const employees = employeesResult.data || [];
    const shiftGroups = shiftGroupsResult.data || [];
    const shiftPlans = shiftPlansResult.data || [];
    const attendanceRecords = attendanceResult.data || [];

    return {
      employees,
      shiftGroups,
      shiftPlans,
      attendanceRecords
    };
  } catch (error) {
    console.error('Failed to fetch Dataverse data:', error);
    throw error;
  }
}

/**
 * Map color shift from Dataverse to ShiftTeam type
 * Handles both English and Chinese color names
 * Returns null for non-color values (e.g., "停线" = line stop)
 */
export function mapColorToShiftTeam(colorShift?: string): ShiftTeam | null {
  if (!colorShift) return null;
  const color = colorShift.toLowerCase();
  
  // Skip non-color shifts like "停线" (line stop/shutdown)
  if (color.includes('停')) return null;
  
  // English color names
  if (color.includes('green')) return 'Green';
  if (color.includes('blue')) return 'Blue';
  if (color.includes('orange')) return 'Orange';
  if (color.includes('yellow')) return 'Yellow';
  
  // Chinese color names (绿班/绿色, 蓝班/蓝色, 橙班/橙色, 黄班/黄色)
  if (color.includes('绿')) return 'Green';   // 绿 = green
  if (color.includes('蓝')) return 'Blue';    // 蓝 = blue
  if (color.includes('橙')) return 'Orange';  // 橙 = orange
  if (color.includes('黄')) return 'Yellow';  // 黄 = yellow
  
  // If it doesn't match any known color, log warning and return null
  console.warn('Unknown colorshift value (not a color):', colorShift);
  return null;
}

function mapWorkTypeToShiftTeam(workType?: string): ShiftTeam | null {
  if (!workType) return null;
  const normalized = workType.toUpperCase();

  // User requirement: worktype contains "12H SHF 1/2/3/4".
  // Be permissive about spacing and variations (e.g. SHF1, SHF 1, Shift 1, etc.).
  // Match patterns like "SHF 1", "SHF1", "SHIFT 1", "SHIFT1"
  if (/SHF\s*1|SHIFT\s*1/i.test(normalized)) return 'Green';
  if (/SHF\s*2|SHIFT\s*2/i.test(normalized)) return 'Orange';
  if (/SHF\s*3|SHIFT\s*3/i.test(normalized)) return 'Yellow';
  if (/SHF\s*4|SHIFT\s*4/i.test(normalized)) return 'Blue';
  
  // Also check for color names directly
  if (normalized.includes('GREEN')) return 'Green';
  if (normalized.includes('ORANGE')) return 'Orange';
  if (normalized.includes('YELLOW')) return 'Yellow';
  if (normalized.includes('BLUE')) return 'Blue';
  
  return null;
}

/**
 * Check if employee worktype qualifies for scheduling view.
 * More permissive matching to handle various data formats.
 */
function isEligibleEmployeeWorkType(workType?: string): boolean {
  if (!workType) return false;
  // If we can map it to a shift team, it's eligible
  return mapWorkTypeToShiftTeam(workType) !== null;
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
 *
 * KEY LOGIC:
 * - Employees come from ll_dEmployee, filtered by jia_worktype containing "12H SHF 1/2/3/4"
 * - Schedule grid cells are populated from ll_dShiftPlan:
 *   When ll_dShiftPlan.jia_colorshift matches the employee's derived shiftTeam color,
 *   that employee is scheduled for that date and shows "12" (default hours).
 *
 * ⚠️  KNOWN LIMITATION — Attendance Record Merging:
 * ll_fAttendanceRecord currently does NOT store jia_empid (employee ID) or jia_date (date).
 * Without these fields it is impossible to map exceptions (OT/Leave) back to individual
 * employee×date cells on reload.
 *
 * To enable persistence:
 *   1. Add `jia_empid` (text, employee ID) to jia_ll_fattendancereocrds in Dataverse.
 *   2. Add `jia_date` (date only) to jia_ll_fattendancereocrds in Dataverse.
 *   3. Update createAttendanceRecord() to write these fields.
 *   4. Add a merge step below that applies attendance records as overrides on top of
 *      the base schedule cells.
 */
export function transformDataverseData(data: DataverseData): TransformedData {
  // Build date keys from shift plans - find min and max dates to create continuous range
  const dateObjects: Date[] = [];
  
  for (const plan of data.shiftPlans) {
    if (plan.jia_date) {
      // jia_date could be ISO format (2026-01-13) or other formats
      const parts = plan.jia_date.split(/[-\/]/);
      if (parts.length >= 3) {
        const yearPart = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        if (yearPart && month && day) {
          dateObjects.push(new Date(yearPart, month - 1, day));
        }
      }
    }
  }

  const year = dateObjects.length > 0
    ? Math.min(...dateObjects.map(date => date.getFullYear()))
    : new Date().getFullYear();
  
  let dateKeys: string[] = [];
  
  // Generate full year date range (January 1 to December 31)
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      dateKeys.push(`${month}/${day}`);
    }
  }

  /*---------------------------------------------------------------------------
   * Build a lookup: dateKey → Day/Night → Set of scheduled color teams
   * This is derived from ll_dShiftPlan.
   * Example: "1/20" → "Day" → Set(['Green', 'Blue'])
   *--------------------------------------------------------------------------*/
  const shiftPlanLookup = new Map<string, { day: Set<ShiftTeam>; night: Set<ShiftTeam> }>();

  for (const plan of data.shiftPlans) {
    if (!plan.jia_date || !plan.jia_colorshift) {
      continue;
    }

    // Parse date to dateKey
    const parts = plan.jia_date.split(/[-\/]/);
    if (parts.length < 3) {
      continue;
    }
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!month || !day) {
      continue;
    }
    const dateKey = `${month}/${day}`;

    // Determine which color team this plan row schedules
    const colorTeam = mapColorToShiftTeam(plan.jia_colorshift);
    
    // Skip non-color shifts (e.g., "停线" = line stop)
    if (colorTeam === null) {
      continue;
    }

    // Determine day/night - handle both English and Chinese
    const shiftType = plan.jia_daynightshift?.toLowerCase() || '';
    const isNight = shiftType.includes('night') || shiftType.includes('夜') || shiftType.includes('晚');

    // Add to lookup
    if (!shiftPlanLookup.has(dateKey)) {
      shiftPlanLookup.set(dateKey, { day: new Set(), night: new Set() });
    }
    const entry = shiftPlanLookup.get(dateKey)!;
    if (isNight) {
      entry.night.add(colorTeam);
    } else {
      entry.day.add(colorTeam);
    }
  }

  // Transform employees - filter only by jia_worktype (no statecode filter)
  const eligibleEmployees = data.employees.filter(emp => isEligibleEmployeeWorkType(emp.jia_worktype));
  
  const employees: Employee[] = eligibleEmployees
    .map(emp => {
      const shiftTeam = mapWorkTypeToShiftTeam(emp.jia_worktype) ?? 'Green';

      const shifts: Record<string, ShiftEntry> = {};
      
      /*-----------------------------------------------------------------------
       * Populate schedule cells from ll_dShiftPlan join:
       * If the employee's shiftTeam is scheduled on a given date/shift,
       * show "12" (default scheduled hours). Otherwise leave empty.
       *----------------------------------------------------------------------*/
      for (const dateKey of dateKeys) {
        const planEntry = shiftPlanLookup.get(dateKey);
        const dayScheduled = planEntry?.day.has(shiftTeam) ?? false;
        const nightScheduled = planEntry?.night.has(shiftTeam) ?? false;

        shifts[dateKey] = {
          day: dayScheduled ? '12' : '',
          night: nightScheduled ? '12' : ''
        };
      }

      return {
        id: emp.jia_empid || emp.jia_ll_demployeeid,
        name: emp.jia_preferredname || emp.jia_name || 'Unknown',
        email: emp.jia_email || '',
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
  if (USE_MOCK_DATA) {
    console.log('[LaborLink] Mock save:', record);
    return { id: crypto.randomUUID?.() ?? Date.now().toString() };
  }

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
