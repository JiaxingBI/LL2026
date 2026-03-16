import { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { Sun, Moon } from 'lucide-react';
import { fetchDataverseData, transformDataverseData, createAttendanceRecord, type TransformedData } from '../data/dataverseLoader';
import { USE_MOCK_DATA } from '../data/mockData';
import type { Employee, Adjustment } from '../types';
import AdjustmentTable from './AdjustmentTable';
import CustomDatePicker from './ui/CustomDatePicker';
import { useLanguage } from '../contexts/LanguageContext';
import { validateShiftChange } from '../utils/attendanceValidation';
import { useUserPhotos } from '../hooks/useUserPhotos';
import { showToast } from './ui/Toast';
import { TableRowSkeleton } from './ui/Skeleton';
import { AttendancePlanHeader } from './attendance/AttendancePlanHeader';
import { AttendancePlanToolbar } from './attendance/AttendancePlanToolbar';
import { GallerySummaryBar } from './attendance/GallerySummaryBar';
import { VirtualPivotTable } from './attendance/VirtualPivotTable';
import { GalleryEmployeeRow } from './attendance/GalleryEmployeeRow';
import AddWorkerModal from './ui/AddWorkerModal';
import { GENDER_OPTIONS, getShiftClass, ID_STATUS_OPTIONS, ROLE_OPTIONS, SHIFT_TEAM_VALUES, WORK_STATUS_OPTIONS } from '../constants/attendanceOptions';
import {
  buildPendingLeaveKey,
  mergeEmployeesWithLocal,
  readPersistedAttendancePlanState,
  writePersistedAttendancePlanState,
} from '../utils/attendancePlanPersistence';

/*******************************************************************************
 * DATA MODEL – Three-Table Architecture
 * -----------------------------------------------------------------------------
 * This component integrates data from three Dataverse tables:
 *
 * 1. ll_dEmployee (dimension table)
 *    - Master list of all employees.
 *    - Key column: `jia_worktype` – encodes the employee's color-shift team
 *      (e.g. "SHF 1" → Green, "SHF 2" → Orange, etc.).
 *    - Used for: displaying employee names, filtering by team.
 *
 * 2. ll_dShiftGroup (dimension table)
 *    - Defines the available shift groups (area × department × shift).
 *    - Key columns:
 *        • `jia_shift` / `jia_shiftcn` – shift label (language-dependent),
 *          used to derive distinct filter options (All/Green/Blue/Orange/Yellow).
 *        • `jia_area`, `jia_department` – used for area/department slicers.
 *    - Used for: populating the upper shift-team filter buttons and
 *      the area/department dropdown slicers.
 *
 * 3. ll_dShiftPlan (fact table – read-only schedule)
 *    - Contains the pre-generated shift schedule.
 *    - Key columns:
 *        • `colorshift` – matches employee's `jia_worktype` to determine
 *          which employees are scheduled on which dates.
 *        • Date/shift columns indicate scheduled working days.
 *    - Logic: when `colorshift` matches an employee's `jia_worktype`,
 *      the pivot cell shows "12" (default scheduled hours).
 *    - This table is READ-ONLY; base schedules are never written back.
 *
 * 4. ll_fAttendanceRecord (fact table – exceptions only)
 *    - Stores manual adjustments: Overtime (OT) and Leave requests.
 *    - Only EXCEPTIONS are written here; if an employee follows the normal
 *      schedule from ll_dShiftPlan, no record is created.
 *    - Created when: user manually adds/removes hours, marks leave, or
 *      schedules overtime beyond the base plan.
 *
 * Data Flow Summary:
 *   • Load employees from ll_dEmployee, map `jia_worktype` → shiftTeam.
 *   • Load shift groups from ll_dShiftGroup for filter UI.
 *   • Load shift plans from ll_dShiftPlan, join with employees via colorshift.
 *   • Display schedule; edits create Adjustment records destined for
 *     ll_fAttendanceRecord (OT/Leave only).
 ******************************************************************************/

type ShiftType = 'Day' | 'Night';

/**
 * Returns "now" in UTC+8.
 *
 * The app’s scheduling rules (today, day/night boundary) are based on local factory time (UTC+8).
 */
function getUtc8Now(): Date {
  const now = new Date();
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMillis + 8 * 60 * 60_000);
}

/**
 * Infers Day vs Night shift based on UTC+8 time.
 * Day: 07:00–18:59, Night: 19:00–06:59.
 */
function inferShiftTypeUtc8(nowUtc8: Date): ShiftType {
  const hour = nowUtc8.getHours();
  return hour >= 7 && hour < 19 ? 'Day' : 'Night';
}

/**
 * Formats a month/day pair into the app’s date-key format used by the schedule grid.
 * Example: `1/20`.
 */
function toDateKey(month: number, day: number): string {
  return `${month}/${day}`;
}

/**
 * Converts an app date-key (M/D) into an ISO date string (YYYY-MM-DD) for a given year.
 */
function toIsoDateFromKey(year: number, dateKey: string): string {
  const [month, day] = dateKey.split('/').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Adds (or subtracts) whole days from an ISO date (YYYY-MM-DD), returning a new ISO date.
 * Uses UTC arithmetic to avoid DST/local-time surprises.
 */
function isoAddDays(isoDate: string, deltaDays: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day + deltaDays));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Converts an ISO date (YYYY-MM-DD) into an app date-key (M/D).
 */
function toDateKeyFromIso(isoDate: string): string {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${month}/${day}`;
}

function createLocalAdjustmentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isSameAdjustment(adjustment: Adjustment, employeeId: string, dateIso: string, isNight: boolean): boolean {
  return adjustment.employeeId === employeeId && adjustment.date === dateIso && Boolean(adjustment.isNight) === isNight;
}

interface AttendancePlanProps {
  isInitialized?: boolean;
}

/**
 * Attendance scheduling editor.
 *
 * Provides two synchronized views over the same underlying schedule grid:
 * - Pivot view: wide editable table
 * - Gallery view: date/shift “slice” editor
 */
export default function AttendancePlan({ isInitialized = false }: AttendancePlanProps) {
  const { t } = useLanguage();

  // Loading and error states for Dataverse
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataverseData, setDataverseData] = useState<TransformedData | null>(null);

  const planYear = dataverseData?.year ?? new Date().getFullYear();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [selectedShift, setSelectedShift] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // View mode: editable pivot table vs vertical gallery
  const [viewMode, setViewMode] = useState<'pivot' | 'gallery'>('gallery');

  // Gallery slicer state: date + shift
  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    const nowUtc8 = getUtc8Now();
    return toDateKey(nowUtc8.getMonth() + 1, nowUtc8.getDate());
  });
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftType>(() => inferShiftTypeUtc8(getUtc8Now()));

  // Gallery is a view over the same schedule grid used by Pivot
  const [galleryHourDrafts, setGalleryHourDrafts] = useState<Record<string, { value: string; touched: boolean }>>({});
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addEmployeeIds, setAddEmployeeIds] = useState<Set<string>>(new Set());
  // Selection state for delete functionality in the table
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  
  // Track saved state - filter uses this, display uses 'employees' with pending changes
  const [savedEmployees, setSavedEmployees] = useState<Employee[]>([]);
  const [savedAdjustments, setSavedAdjustments] = useState<Adjustment[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Custom alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  // Gallery view edit mode toggle for employee info fields (Role, I/D, Status, Shift, Gender)
  const [isGalleryEditMode, setIsGalleryEditMode] = useState(false);

  // Pending leave: employees marked for leave but not yet confirmed
  // Key format: "empId|dateKey|shiftType" to track per-slice
  const [pendingLeaveIds, setPendingLeaveIds] = useState<Set<string>>(new Set());

  // Fetch data from Dataverse when SDK is initialized (or immediately for mock data)
  useEffect(() => {
    if (!USE_MOCK_DATA && !isInitialized) {
      setLoadError('Power Platform SDK is not initialized yet.');
      setIsLoading(false);
      return;
    }

    /**
     * Loads raw tables from Dataverse and transforms them into the UI-ready shape.
     * Also initializes the gallery slice defaults (today in UTC+8 when available).
     */
    const loadDataverseData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        const rawData = await fetchDataverseData();
        const transformed = transformDataverseData(rawData);
        const persistedState = readPersistedAttendancePlanState(transformed.year);
        const nextEmployees = persistedState
          ? mergeEmployeesWithLocal(transformed.employees, persistedState.employees)
          : transformed.employees;
        const nextSavedEmployees = persistedState
          ? mergeEmployeesWithLocal(transformed.employees, persistedState.savedEmployees)
          : structuredClone(nextEmployees);
        const nextAdjustments = persistedState?.adjustments ?? [];
        const nextSavedAdjustments = persistedState?.savedAdjustments ?? [];
        
        setDataverseData(transformed);
        setEmployees(nextEmployees);
        setSavedEmployees(nextSavedEmployees);
        setAdjustments(nextAdjustments);
        setSavedAdjustments(nextSavedAdjustments);
        setPendingLeaveIds(new Set(persistedState?.pendingLeaveIds ?? []));
        setHasChanges(Boolean(persistedState?.hasChanges));
        
        // Gallery default date picker should be "today" (UTC+8) when available
        if (transformed.dateKeys.length > 0) {
          const nowUtc8 = getUtc8Now();
          const todayKey = toDateKey(nowUtc8.getMonth() + 1, nowUtc8.getDate());
          setSelectedDateKey(
            transformed.dateKeys.includes(todayKey)
              ? todayKey
              : transformed.dateKeys[transformed.dateKeys.length - 1]
          );
        }
        
        console.log('Dataverse data loaded:', {
          employees: transformed.employees.length,
          dateKeys: transformed.dateKeys.length,
          rawEmployees: rawData.employees.length,
          rawShiftGroups: rawData.shiftGroups.length,
          rawShiftPlans: rawData.shiftPlans.length,
          rawAttendanceRecords: rawData.attendanceRecords.length
        });
      } catch (error) {
        console.error('Failed to load Dataverse data:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load data from Dataverse');
      } finally {
        setIsLoading(false);
      }
    };

    loadDataverseData();
  }, [isInitialized]);

  useEffect(() => {
    if (!dataverseData) return;

    writePersistedAttendancePlanState({
      version: 1,
      planYear,
      employees,
      adjustments,
      savedEmployees,
      savedAdjustments,
      pendingLeaveIds: Array.from(pendingLeaveIds),
      hasChanges,
    });
  }, [adjustments, dataverseData, employees, hasChanges, pendingLeaveIds, planYear, savedAdjustments, savedEmployees]);

  /**
   * "Confirm" action.
   * Persists adjustments (OT/Leave) to ll_fAttendanceRecord in Dataverse,
   * then updates the local snapshot.
   * Also processes pending leave employees: creates Leave adjustments and sets their hours to 0.
   */
  const handleConfirm = useCallback(async () => {
    const pendingLeaveArray = Array.from(pendingLeaveIds);
    let nextEmployees = employees;
    let nextAdjustments = [...adjustments];

    if (pendingLeaveArray.length > 0) {
      nextEmployees = employees.map(employee => {
        const matchingEntry = pendingLeaveArray.some(key => {
          const [empId] = key.split('|');
          return empId === employee.id;
        });
        if (!matchingEntry) return employee;

        const updatedShifts = { ...employee.shifts };
        pendingLeaveArray.forEach(key => {
          const [empId, dateIso, shiftType] = key.split('|') as [string, string, ShiftType];
          if (empId !== employee.id) return;
          const dateKey = toDateKeyFromIso(dateIso);
          const shiftEntry = updatedShifts[dateKey] ?? { day: '', night: '' };
          updatedShifts[dateKey] = shiftType === 'Night'
            ? { ...shiftEntry, night: '' }
            : { ...shiftEntry, day: '' };

          const originalValue = shiftType === 'Night' ? (employee.shifts[dateKey]?.night || '') : (employee.shifts[dateKey]?.day || '');
          const originalHours = parseInt(originalValue, 10) || 12;
          const isNight = shiftType === 'Night';

          const leaveAdjustment: Adjustment = {
            id: nextAdjustments.find(adj => isSameAdjustment(adj, employee.id, dateIso, isNight))?.id ?? createLocalAdjustmentId(),
            employeeId: employee.id,
            name: employee.name,
            role: employee.role,
            indirectDirect: employee.indirectDirect,
            workStatus: employee.status,
            shiftTeam: employee.shiftTeam,
            gender: employee.gender,
            date: dateIso,
            isNight,
            originalHours,
            hours: 0,
            adjustmentType: 'Leave',
            reason: 'Leave',
            comments: nextAdjustments.find(adj => isSameAdjustment(adj, employee.id, dateIso, isNight))?.comments ?? '',
            source: 'local',
            synced: false,
          };

          const existingIndex = nextAdjustments.findIndex(adj => isSameAdjustment(adj, employee.id, dateIso, isNight));
          if (existingIndex >= 0) {
            nextAdjustments[existingIndex] = leaveAdjustment;
          } else {
            nextAdjustments.push(leaveAdjustment);
          }
        });

        return { ...employee, shifts: updatedShifts };
      });
    }

    setEmployees(nextEmployees);
    setAdjustments(nextAdjustments);
    setPendingLeaveIds(new Set());

    const unsyncedAdjustments = nextAdjustments.filter(adj => !adj.synced);
    if (unsyncedAdjustments.length === 0) {
      setSavedEmployees(structuredClone(nextEmployees));
      setSavedAdjustments(structuredClone(nextAdjustments));
      setGalleryHourDrafts({});
      setSelectedRowIds(new Set());
      setHasChanges(false);
      showToast(t('attendance.changesSaved') || 'Changes saved successfully!', 'success');
      return;
    }

    const results = await Promise.allSettled(
      unsyncedAdjustments.map(adj =>
        createAttendanceRecord({
          hours: String(adj.hours),
          action: adj.adjustmentType ?? 'Overtime',
          dayNightShift: adj.isNight ? 'Night' : 'Day',
          colorShift: adj.shiftTeam ?? 'Green',
          area: '',
          department: '',
        }),
      ),
    );

    const failedCount = results.filter(result => result.status === 'rejected').length;
    const syncedIds = new Set(
      results
        .map((result, index) => (result.status === 'fulfilled' ? unsyncedAdjustments[index].id : null))
        .filter((id): id is string => Boolean(id)),
    );

    const synchronizedAdjustments = nextAdjustments.map(adj => (
      syncedIds.has(adj.id) ? { ...adj, synced: true } : adj
    ));

    setAdjustments(synchronizedAdjustments);

    if (failedCount > 0) {
      console.error(`Failed to save ${failedCount} adjustment(s) to Dataverse`);
      setHasChanges(true);
      showToast(
        t('attendance.saveFailed') || `Failed to save ${failedCount} adjustment(s). Please try again.`,
        'error',
      );
      return;
    }

    setSavedEmployees(structuredClone(nextEmployees));
    setSavedAdjustments(structuredClone(synchronizedAdjustments));
    setGalleryHourDrafts({});
    setSelectedRowIds(new Set());
    setHasChanges(false);
    showToast(t('attendance.changesSaved') || 'Changes saved successfully!', 'success');
  }, [adjustments, employees, pendingLeaveIds, t]);

  /**
   * "Reset" action.
   * Reverts unsaved UI edits back to the last confirmed snapshot.
   * Also clears pending leave employees.
   */
  const handleReset = useCallback(() => {
    setEmployees(structuredClone(savedEmployees));
    setAdjustments(structuredClone(savedAdjustments));
    setPendingLeaveIds(new Set());
    setGalleryHourDrafts({});
    setSelectedRowIds(new Set());
    setShowAddPicker(false);
    setAddEmployeeIds(new Set());
    setHasChanges(false);
  }, [savedEmployees, savedAdjustments]);

  /**
   * Updates a top-level employee field (role/team/status/etc.) by `empId`.
   * Marks the plan as having unsaved changes.
   */
  const handleEmployeeUpdate = useCallback((empId: string, field: keyof Employee, value: string) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(e => {
        if (e.id === empId) {
          return { ...e, [field]: value };
        }
        return e;
      })
    );
    setHasChanges(true);
  }, []);

  const allDates = useMemo(() => {
    return dataverseData?.dateKeys?.length ? dataverseData.dateKeys : [];
  }, [dataverseData]);

  const selectedDateIso = useMemo(() => {
    return toIsoDateFromKey(planYear, selectedDateKey);
  }, [planYear, selectedDateKey]);

  /**
   * Updates a single day/night cell in the schedule grid.
   * Also creates an `Adjustment` record when the edit implies Overtime or Leave.
   * Validates against attendance rules before applying changes.
   */
  const handleShiftChange = useCallback((emp: Employee, date: string, isNight: boolean, newValue: string) => {
    // Get the original value before the change
    const originalShift = emp.shifts[date];
    const originalValue = isNight ? (originalShift?.night || '') : (originalShift?.day || '');
    const originalHours = parseInt(originalValue) || 0;
    const newHours = parseInt(newValue) || 0;
    const normalizedValue = newHours === 0 ? '' : String(newHours);
    const dateStr = toIsoDateFromKey(planYear, date);

    // Validate the change against attendance rules
    const validation = validateShiftChange(emp, date, isNight, newHours, employees, allDates, planYear);
    
    if (!validation.isValid) {
      // Show violation alert - revert employee state to original value
      const violationMessage = validation.violations.join('\n\n');
      setAlertMessage(violationMessage);
      setShowAlertModal(true);
      
      // Revert employee state to original value (undo the onChange update)
      setEmployees(prevEmployees => 
        prevEmployees.map(e => {
          if (e.id === emp.id) {
            const newShifts = { ...e.shifts };
            if (!newShifts[date]) {
              newShifts[date] = { day: '', night: '' };
            }
            if (isNight) {
              newShifts[date] = { ...newShifts[date], night: originalValue };
            } else {
              newShifts[date] = { ...newShifts[date], day: originalValue };
            }
            return { ...e, shifts: newShifts };
          }
          return e;
        })
      );
      return; // Don't proceed with the change
    }

    // Update the employee's shift data
    setEmployees(prevEmployees => 
      prevEmployees.map(e => {
        if (e.id === emp.id) {
          const newShifts = { ...e.shifts };
          if (!newShifts[date]) {
            newShifts[date] = { day: '', night: '' };
          }
          if (isNight) {
            newShifts[date] = { ...newShifts[date], night: normalizedValue };
          } else {
            newShifts[date] = { ...newShifts[date], day: normalizedValue };
          }
          return { ...e, shifts: newShifts };
        }
        return e;
      })
    );

    // Determine adjustment type:
    // - Overtime: Adding hours to a blank cell (originalHours = 0, newHours > 0)
    // - Leave: Reducing or clearing existing hours (originalHours > 0, newHours < originalHours)
    let adjustmentType: 'Overtime' | 'Leave' | null = null;
    let reason = '';

    if (originalHours === 0 && newHours > 0) {
      // Adding hours to blank = Overtime
      adjustmentType = 'Overtime';
      reason = 'Work Overtime';
    } else if (originalHours > 0 && newHours < originalHours) {
      // Reducing or clearing hours = Leave
      adjustmentType = 'Leave';
      reason = newHours === 0 ? 'Full Day Leave' : 'Partial Leave';
    } else if (originalHours > 0 && newHours > originalHours) {
      // Increasing existing hours = also Overtime
      adjustmentType = 'Overtime';
      reason = 'Extended Shift';
    }

    // Auto-add adjustment record if there's a meaningful change
    setAdjustments(prev => {
      const existing = prev.find(adj => isSameAdjustment(adj, emp.id, dateStr, isNight));

      if (!adjustmentType) {
        return prev.filter(adj => !isSameAdjustment(adj, emp.id, dateStr, isNight));
      }

      const nextAdjustment: Adjustment = {
        id: existing?.id ?? createLocalAdjustmentId(),
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        indirectDirect: emp.indirectDirect,
        workStatus: emp.status,
        shiftTeam: emp.shiftTeam,
        gender: emp.gender,
        date: dateStr,
        isNight,
        originalHours,
        hours: newHours,
        adjustmentType,
        reason,
        comments: existing?.comments ?? '',
        source: 'local',
        synced: false,
      };

      if (!existing) {
        return [...prev, nextAdjustment];
      }

      return prev.map(adj => (
        isSameAdjustment(adj, emp.id, dateStr, isNight) ? nextAdjustment : adj
      ));
    });
    setHasChanges(true);
  }, [allDates, employees, planYear]);

  // Date window filter: always show -1 to +12 days from anchor date
  const baseDateForWindow = useMemo(() => {
    if (viewMode !== 'gallery') return new Date();
    const [month, day] = selectedDateKey.split('/').map(Number);
    if (!month || !day) return new Date();
    return new Date(planYear, month - 1, day);
  }, [viewMode, selectedDateKey]);

  const filteredDates = useMemo(() => {
    const anchor = baseDateForWindow;
    const year = anchor.getFullYear();
    
    // Always show: 1 day before to 12 days after anchor date
    const startDate = new Date(year, anchor.getMonth(), anchor.getDate() - 1);
    const endDate = new Date(year, anchor.getMonth(), anchor.getDate() + 12);
    
    return allDates.filter(dateStr => {
      const [month, day] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      return date >= startDate && date <= endDate;
    });
  }, [allDates, baseDateForWindow]);

  const dates = filteredDates;

  // Keep selected date valid when the visible date window changes
  useEffect(() => {
    if (dates.length === 0) return;
    if (!dates.includes(selectedDateKey)) {
      setSelectedDateKey(dates[0]);
    }
  }, [dates, selectedDateKey]);

  /**
   * Returns true if the given app date-key (M/D) matches the user's current local "today".
   * Used only for UI highlighting.
   */
  const isToday = (dateStr: string) => {
    const today = new Date();
    const [month, day] = dateStr.split('/').map(Number);
    return today.getMonth() + 1 === month && today.getDate() === day;
  };

  const filterKeys: Record<string, string> = {
    'All': 'filter.all',
    'Green': 'filter.green',
    'Blue': 'filter.blue',
    'Orange': 'filter.orange',
    'Yellow': 'filter.yellow'
  };

  // Apply filters directly to the displayed rows.
  // Uses deferred search for better performance when typing.
  // Color shift filter only applies in pivot view, not in gallery view.
  const filteredEmployees = useMemo(() => {
    const query = deferredSearchQuery.toLowerCase().trim();
    return employees.filter(emp => {
      // Only apply shift filter in pivot view
      if (viewMode === 'pivot' && selectedShift !== 'All' && emp.shiftTeam !== selectedShift) return false;
      if (query) {
        const nameMatches = emp.name.toLowerCase().includes(query);
        const idMatches = emp.id.toLowerCase().includes(query);
        if (!nameMatches && !idMatches) return false;
      }
      return true;
    });
  }, [employees, selectedShift, deferredSearchQuery, viewMode]);

  /** Maps a shift team value to a subtle row background color for readability. */
  const getRowBackgroundColor = (team: string) => {
    switch (team) {
      case 'Green': return '#e6f4ea';
      case 'Blue': return '#e3f2fd';
      case 'Orange': return '#fff3e0';
      case 'Yellow': return '#fffde7';
      default: return 'transparent';
    }
  };

  const gallerySliceKey = useMemo(() => `${selectedDateKey}|${selectedShiftType}`, [selectedDateKey, selectedShiftType]);

  /*---------------------------------------------------------------------------
   * PIVOT / GALLERY CELL VALUES (from ll_dShiftPlan)
   * -------------------------------------------------------------------------
   * The numbers displayed in each cell come from ll_dShiftPlan.
   * During data transform, we join ll_dShiftPlan.colorshift with
   * ll_dEmployee.jia_worktype.  When they match (same color-shift team),
   * the employee is considered "scheduled" for that date, and we show
   * the default 12 hours.
   *
   * `emp.shifts[dateKey]` is populated from this join; if an employee's
   * team matches the plan's colorshift on a given day, they have hours.
   *--------------------------------------------------------------------------*/
  const scheduledIdsForSlice = useMemo(() => {
    const ids: string[] = [];
    
    for (const emp of employees) {                                                                                    
      const shiftEntry = emp.shifts[selectedDateKey];
      const cellValue = selectedShiftType === 'Day' ? (shiftEntry?.day || '') : (shiftEntry?.night || '');
      const parsed = parseInt(String(cellValue), 10);
      
      // Include if has hours > 0
      if (Number.isFinite(parsed) && parsed > 0) {
        ids.push(emp.id);
      }
    }
    return ids;
  }, [employees, selectedDateKey, selectedShiftType]);

  const scheduledIdSet = useMemo(() => new Set<string>(scheduledIdsForSlice), [scheduledIdsForSlice]);

  const galleryEmployees = useMemo(() => {
    // Apply the same search + team filters to the gallery rows
    // Exclude employees who are pending leave for this slice
    return filteredEmployees.filter(emp => {
      if (!scheduledIdSet.has(emp.id)) return false;
      const pendingKey = buildPendingLeaveKey(emp.id, selectedDateIso, selectedShiftType);
      if (pendingLeaveIds.has(pendingKey)) return false;
      return true;
    });
  }, [filteredEmployees, pendingLeaveIds, scheduledIdSet, selectedDateIso, selectedShiftType]);

  // Compute employees pending leave for the current slice
  const pendingLeaveEmployeesForSlice = useMemo(() => {
    return employees.filter(emp => {
      const pendingKey = buildPendingLeaveKey(emp.id, selectedDateIso, selectedShiftType);
      return pendingLeaveIds.has(pendingKey);
    });
  }, [employees, pendingLeaveIds, selectedDateIso, selectedShiftType]);

  /** Toggle an employee's pending leave status for the current slice */
  const togglePendingLeave = useCallback((empId: string) => {
    const pendingKey = buildPendingLeaveKey(empId, selectedDateIso, selectedShiftType);
    setPendingLeaveIds(prev => {
      const next = new Set(prev);
      if (next.has(pendingKey)) {
        next.delete(pendingKey);
      } else {
        next.add(pendingKey);
      }
      return next;
    });
    setHasChanges(true);
  }, [selectedDateIso, selectedShiftType]);

  /** Recall (cancel) an employee from pending leave */
  const recallFromPendingLeave = useCallback((empId: string) => {
    const pendingKey = buildPendingLeaveKey(empId, selectedDateIso, selectedShiftType);
    setPendingLeaveIds(prev => {
      const next = new Set(prev);
      next.delete(pendingKey);
      return next;
    });
    // Check if there are still any pending changes
    setHasChanges(prev => prev || pendingLeaveIds.size > 1);
  }, [pendingLeaveIds, selectedDateIso, selectedShiftType]);

  // Fetch user photos from Office365 for gallery employees
  const galleryEmails = useMemo(() => galleryEmployees.map(emp => emp.email || '').filter(Boolean), [galleryEmployees]);
  const { photos: userPhotos } = useUserPhotos(galleryEmails);
  const idStatusOptions = useMemo(() => ID_STATUS_OPTIONS.map(option => ({ value: option.value, label: t(option.translationKey) })), [t]);
  const shiftTeamOptions = useMemo(() => SHIFT_TEAM_VALUES.map(team => ({ value: team, label: t(`filter.${team.toLowerCase()}`) })), [t]);
  const genderOptions = useMemo(() => GENDER_OPTIONS.map(option => ({ value: option.value, label: t(option.translationKey) })), [t]);

  const availableEmployeesForGallery = useMemo(() => {
    // Per spec: choose from whole list not currently in this gallery slice
    return employees.filter(emp => !scheduledIdSet.has(emp.id));
  }, [employees, scheduledIdSet]);

  /*---------------------------------------------------------------------------
   * ADJUSTMENT RECORDS → ll_fAttendanceRecord (exceptions only)
   * -------------------------------------------------------------------------
   * The base schedule from ll_dShiftPlan is READ-ONLY and never written back.
   * Only EXCEPTIONS (Overtime / Leave) are captured in Adjustment records.
   * When the user manually changes hours or marks leave, we create an
   * Adjustment that will eventually be persisted to ll_fAttendanceRecord.
   *--------------------------------------------------------------------------*/

  useEffect(() => {
    setGalleryHourDrafts({});
  }, [gallerySliceKey]);

  const handleGalleryHourDraftChange = useCallback((draftKey: string, value: string) => {
    setGalleryHourDrafts(prev => ({
      ...prev,
      [draftKey]: { value, touched: true },
    }));
  }, []);

  const handleGalleryHourDraftCommit = useCallback((emp: Employee, draftKey: string, draft?: { value: string; touched: boolean }) => {
    if (!draft?.touched) return;

    const isNight = selectedShiftType === 'Night';
    const shiftEntry = emp.shifts[selectedDateKey];
    const storedRaw = isNight ? (shiftEntry?.night || '') : (shiftEntry?.day || '');
    const storedParsed = parseInt(String(storedRaw || '0'), 10);
    const previousValue = Number.isFinite(storedParsed) && storedParsed > 0 ? String(storedParsed) : '0';
    const nextValue = String(parseInt(draft.value, 10) || 0);

    if (nextValue === previousValue) {
      setGalleryHourDrafts(prev => ({
        ...prev,
        [draftKey]: { value: '', touched: false },
      }));
      return;
    }

    handleShiftChange(emp, selectedDateKey, isNight, nextValue);
    setGalleryHourDrafts(prev => ({
      ...prev,
      [draftKey]: { value: '', touched: false },
    }));
  }, [handleShiftChange, selectedDateKey, selectedShiftType]);


  /**
   * Bulk-adds selected employees into the current gallery slice by setting hours (defaults to 12).
   * Clears the picker state afterwards.
   */
  const handleAddWorkersToGallery = useCallback(() => {
    if (addEmployeeIds.size === 0) return;
    
    addEmployeeIds.forEach(empId => {
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        handleShiftChange(emp, selectedDateKey, selectedShiftType === 'Night', '12');
      }
    });

    setAddEmployeeIds(new Set());
    setShowAddPicker(false);
  }, [addEmployeeIds, employees, handleShiftChange, selectedDateKey, selectedShiftType]);

  /** Toggles a single employee id in the "add workers" multi-select set. */
  const toggleAddEmployeeSelection = useCallback((empId: string) => {
    setAddEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  }, []);

  /**
   * Removes selected employees from the current slice by setting their slice hours to 0.
   * (This is the inverse of adding workers to a slice.)
   */
  const handleDeleteSelectedWorkers = useCallback(() => {
    if (selectedRowIds.size === 0) return;

    selectedRowIds.forEach(empId => {
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        handleShiftChange(emp, selectedDateKey, selectedShiftType === 'Night', '0');
      }
    });

    setSelectedRowIds(new Set());
    setHasChanges(true);
  }, [selectedRowIds, employees, handleShiftChange, selectedDateKey, selectedShiftType]);

  /** Toggles row selection (used by "delete selected" actions). */
  const toggleRowSelection = useCallback((empId: string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  }, []);

  /** Selects all scheduled rows in the current gallery slice, or clears selection if already all selected. */
  const toggleSelectAll = useCallback(() => {
    if (selectedRowIds.size === galleryEmployees.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(galleryEmployees.map(e => e.id)));
    }
  }, [selectedRowIds, galleryEmployees]);

  /** Closes the "add workers" modal and resets its temporary UI state. */
  const closeAddWorkerModal = useCallback(() => {
    setShowAddPicker(false);
    setAddEmployeeIds(new Set());
  }, []);

  const sliceAdjustments = useMemo(() => {
    const isNight = selectedShiftType === 'Night';
    return adjustments.filter(a => a.date === selectedDateIso && a.isNight === isNight);
  }, [adjustments, selectedDateIso, selectedShiftType]);

  const sliceOvertimeCount = useMemo(() => {
    return sliceAdjustments.filter(a => a.adjustmentType === 'Overtime').length;
  }, [sliceAdjustments]);

  const sliceLeaveCount = useMemo(() => {
    return sliceAdjustments.filter(a => a.adjustmentType === 'Leave').length;
  }, [sliceAdjustments]);

  const currentSliceTeam = useMemo(() => {
    const scheduledEmps = employees.filter(emp => scheduledIdSet.has(emp.id));
    if (scheduledEmps.length === 0) return null;

    const teamCounts: Record<string, number> = {};
    for (const emp of scheduledEmps) {
      teamCounts[emp.shiftTeam] = (teamCounts[emp.shiftTeam] || 0) + 1;
    }

    let maxTeam: string | null = null;
    let maxCount = 0;
    for (const [team, count] of Object.entries(teamCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxTeam = team;
      }
    }
    return maxTeam;
  }, [employees, scheduledIdSet]);

  const lastSlice = useMemo(() => {
    const fallbackLastShiftType: ShiftType = selectedShiftType === 'Day' ? 'Night' : 'Day';
    const fallbackLastDateIso = selectedShiftType === 'Day' ? isoAddDays(selectedDateIso, -1) : selectedDateIso;
    const fallbackLastDateKey = toDateKeyFromIso(fallbackLastDateIso);
    const fallbackResult = { lastShiftType: fallbackLastShiftType, lastDateIso: fallbackLastDateIso, lastDateKey: fallbackLastDateKey, lastTeam: currentSliceTeam };

    if (!currentSliceTeam) {
      return fallbackResult;
    }

    const teamEmployees = employees.filter(e => e.shiftTeam === currentSliceTeam);
    const representative = teamEmployees[0];
    if (!representative) {
      return fallbackResult;
    }

    const allKeys = allDates;
    const selectedIndex = allKeys.indexOf(selectedDateKey);
    if (selectedIndex < 0) {
      return fallbackResult;
    }

    const getHours = (dateKey: string, shift: ShiftType): number => {
      const entry = representative.shifts[dateKey];
      const value = shift === 'Day' ? (entry?.day || '') : (entry?.night || '');
      const parsed = parseInt(String(value), 10);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    if (selectedShiftType === 'Night') {
      const dayHours = getHours(selectedDateKey, 'Day');
      if (dayHours > 0) {
        const iso = toIsoDateFromKey(planYear, selectedDateKey);
        return { lastShiftType: 'Day' as const, lastDateIso: iso, lastDateKey: selectedDateKey, lastTeam: currentSliceTeam };
      }
    }

    for (let i = selectedIndex - 1; i >= 0; i--) {
      const dateKey = allKeys[i];
      const nightHours = getHours(dateKey, 'Night');
      if (nightHours > 0) {
        const iso = toIsoDateFromKey(planYear, dateKey);
        return { lastShiftType: 'Night' as const, lastDateIso: iso, lastDateKey: dateKey, lastTeam: currentSliceTeam };
      }
      const dayHours = getHours(dateKey, 'Day');
      if (dayHours > 0) {
        const iso = toIsoDateFromKey(planYear, dateKey);
        return { lastShiftType: 'Day' as const, lastDateIso: iso, lastDateKey: dateKey, lastTeam: currentSliceTeam };
      }
    }

    return fallbackResult;
  }, [selectedShiftType, selectedDateIso, selectedDateKey, currentSliceTeam, employees, planYear, allDates]);

  const lastScheduledIdSet = useMemo(() => {
    const ids = new Set<string>();
    for (const emp of employees) {
      const shiftEntry = emp.shifts[lastSlice.lastDateKey];
      const cellValue = lastSlice.lastShiftType === 'Day' ? (shiftEntry?.day || '') : (shiftEntry?.night || '');
      const parsed = parseInt(String(cellValue), 10);
      if (Number.isFinite(parsed) && parsed > 0) ids.add(emp.id);
    }
    return ids;
  }, [employees, lastSlice.lastDateKey, lastSlice.lastShiftType]);

  const lastSliceEmployees = useMemo(() => {
    const teamFiltered = currentSliceTeam ? employees.filter(e => e.shiftTeam === currentSliceTeam) : employees;
    return teamFiltered.filter(e => lastScheduledIdSet.has(e.id));
  }, [employees, currentSliceTeam, lastScheduledIdSet]);

  const lastSliceAdjustments = useMemo(() => {
    const isNight = lastSlice.lastShiftType === 'Night';
    const teamFiltered = currentSliceTeam
      ? adjustments.filter(a => a.shiftTeam === currentSliceTeam)
      : adjustments;
    return teamFiltered.filter(a => a.date === lastSlice.lastDateIso && a.isNight === isNight);
  }, [adjustments, currentSliceTeam, lastSlice.lastDateIso, lastSlice.lastShiftType]);

  const lastSliceOvertimeCount = useMemo(() => {
    return lastSliceAdjustments.filter(a => a.adjustmentType === 'Overtime').length;
  }, [lastSliceAdjustments]);

  const lastSliceLeaveCount = useMemo(() => {
    return lastSliceAdjustments.filter(a => a.adjustmentType === 'Leave').length;
  }, [lastSliceAdjustments]);

  const lastSliceInternalPlan = useMemo(() => {
    return lastSliceEmployees.filter(e => e.indirectDirect === 'Direct').length;
  }, [lastSliceEmployees]);

  const lastSliceThirdPartyPlan = useMemo(() => {
    return lastSliceEmployees.filter(e => e.indirectDirect === 'Indirect').length;
  }, [lastSliceEmployees]);

  const lastSliceInternalArrived = useMemo(() => {
    const leaveIds = new Set(
      lastSliceAdjustments
        .filter(a => a.adjustmentType === 'Leave' && a.indirectDirect === 'Direct')
        .map(a => a.employeeId),
    );
    return lastSliceEmployees.filter(e => e.indirectDirect === 'Direct' && !leaveIds.has(e.id)).length;
  }, [lastSliceAdjustments, lastSliceEmployees]);

  const lastSliceThirdPartyArrived = useMemo(() => {
    const leaveIds = new Set(
      lastSliceAdjustments
        .filter(a => a.adjustmentType === 'Leave' && a.indirectDirect === 'Indirect')
        .map(a => a.employeeId),
    );
    return lastSliceEmployees.filter(e => e.indirectDirect === 'Indirect' && !leaveIds.has(e.id)).length;
  }, [lastSliceAdjustments, lastSliceEmployees]);

  // Loading state — skeleton table rows instead of blocking spinner
  if (isLoading) {
    return (
      <div className='container' style={{ padding: 24 }}>
        <div style={{ height: 32, width: '30%', background: '#e5e7eb', borderRadius: 8, marginBottom: 16, animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={10} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Error state with retry option
  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', padding: '24px' }}>
        <div style={{ color: '#d32f2f', fontSize: '18px', fontWeight: 500 }}>⚠️ {t('common.error') || 'Error loading data'}</div>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>{loadError}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            {t('common.retry') || 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    // Layout: header + toolbar + table + adjustment panel
    <div className='container' style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', height: '100%', minHeight: 0 }}>
      <AttendancePlanHeader
        title={t('attendance.title')}
        subtitle={t('attendance.subtitle')}
        statusText={`☁️ Dataverse (${dataverseData?.employees.length ?? 0} employees)`}
      />

      {/* Schedule Editor */}
      <div className='card' style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <AttendancePlanToolbar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          showShiftFilters={viewMode === 'pivot'}
          selectedShift={selectedShift}
          onSelectShift={setSelectedShift}
          filterKeys={filterKeys}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onReset={handleReset}
          onConfirm={handleConfirm}
          hasChanges={hasChanges}
          pendingChangeCount={pendingLeaveIds.size + adjustments.filter(a => !a.synced).length}
          t={t}
        />

        {viewMode === 'pivot' ? (
          <VirtualPivotTable
            employees={filteredEmployees}
            dates={dates}
            savedEmployees={savedEmployees}
            onCellChange={() => {}}
            onCellBlur={(change) => handleShiftChange(change.emp, change.date, change.isNight, change.value)}
            setEmployees={setEmployees}
            getRowBackgroundColor={getRowBackgroundColor}
            isToday={isToday}
            t={t}
            handleEmployeeUpdate={handleEmployeeUpdate}
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '260px 1fr',
              flex: 1,
              minHeight: 0,
              background: 'white'
            }}
          >
            {/* Sidebar: date + Day/Night list */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                borderRight: '1px solid var(--border-color)',
                background: '#fafbfc',
              }}
            >
              {/* Date picker header */}
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-color)',
                background: 'white',
              }}>
                <CustomDatePicker
                  standalone
                  value={selectedDateIso}
                  onChange={(value) => {
                    if (!value) return;
                    setSelectedDateKey(toDateKeyFromIso(value));
                  }}
                  minDate={`${planYear}-01-01`}
                  maxDate={`${planYear}-12-31`}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Date list */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {dates.map(dateKey => {
                  const todayHighlight = isToday(dateKey);
                  const dateSelected = selectedDateKey === dateKey;

                  // Derive day-of-week label
                  const [m, d] = dateKey.split('/').map(Number);
                  const weekday = new Date(planYear, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });

                  // Helper: render a compact shift toggle button
                  const renderShiftButton = (shift: ShiftType) => {
                    const active = selectedDateKey === dateKey && selectedShiftType === shift;
                    const Icon = shift === 'Day' ? Sun : Moon;
                    const isDay = shift === 'Day';

                    // Active state: teal for Day, dark for Night
                    // Inactive: ghost/outlined style
                    return (
                      <button
                        key={`${dateKey}|${shift}`}
                        type='button'
                        onClick={() => {
                          setSelectedDateKey(dateKey);
                          setSelectedShiftType(shift);
                        }}
                        className='btn'
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          gap: '5px',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          minWidth: 0,
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                          ...(active
                            ? {
                                background: isDay ? '#48b6c8' : '#1e293b',
                                color: 'white',
                                border: `1px solid ${isDay ? '#48b6c8' : '#1e293b'}`,
                                boxShadow: isDay
                                  ? '0 2px 8px rgba(72,182,200,0.3)'
                                  : '0 2px 8px rgba(30,41,59,0.25)',
                              }
                            : {
                                background: 'transparent',
                                color: isDay ? '#48b6c8' : '#64748b',
                                border: `1px solid ${isDay ? 'rgba(72,182,200,0.35)' : 'rgba(100,116,139,0.25)'}`,
                                boxShadow: 'none',
                              }),
                        }}
                        aria-pressed={active}
                      >
                        <Icon size={12} />
                        <span>{shift === 'Day' ? t('attendance.day') : t('attendance.night')}</span>
                      </button>
                    );
                  };

                  return (
                    <div
                      key={dateKey}
                      style={{
                        padding: '10px 12px 10px 14px',
                        borderBottom: '1px solid #eef0f2',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        borderLeft: dateSelected ? '3px solid var(--accent-blue)' : '3px solid transparent',
                        background: dateSelected
                          ? '#eef4ff'
                          : todayHighlight
                            ? '#f0f9ff'
                            : 'transparent',
                      }}
                      onClick={() => setSelectedDateKey(dateKey)}
                    >
                      {/* Date info row */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '7px',
                      }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: dateSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                        }}>
                          {dateKey}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                        }}>
                          {weekday}
                        </span>
                        {todayHighlight && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: '999px',
                            background: 'var(--accent-blue)',
                            color: 'white',
                            marginLeft: 'auto',
                          }}>
                            {t('attendance.today')}
                          </span>
                        )}
                      </div>
                      {/* Shift toggle row */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {renderShiftButton('Day')}
                        {renderShiftButton('Night')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main: cards + table */}
            <div style={{ padding: '12px', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <GallerySummaryBar
                employeesCount={employees.length}
                scheduledCount={galleryEmployees.length}
                overtimeCount={sliceOvertimeCount}
                leaveCount={sliceLeaveCount}
                lastSliceLabel={`${lastSlice.lastDateKey} • ${lastSlice.lastShiftType === 'Day' ? t('attendance.day') : t('attendance.night')}`}
                lastSliceTeamLabel={lastSlice.lastTeam ? t(filterKeys[lastSlice.lastTeam] || lastSlice.lastTeam) : '-'}
                lastSliceInternalArrived={lastSliceInternalArrived}
                lastSliceInternalPlan={lastSliceInternalPlan}
                lastSliceThirdPartyArrived={lastSliceThirdPartyArrived}
                lastSliceThirdPartyPlan={lastSliceThirdPartyPlan}
                lastSliceOvertimeCount={lastSliceOvertimeCount}
                lastSliceLeaveCount={lastSliceLeaveCount}
                t={t}
              />

              {/* Table card with header and actions */}
              <div className='card' style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Table header with title and action buttons */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap',
                    background: '#fafafa'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{t('attendance.allWorkers')}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {selectedDateKey} • {selectedShiftType === 'Day' ? t('attendance.day') : t('attendance.night')}
                    </span>
                    {selectedRowIds.size > 0 && (
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '2px 8px', 
                        borderRadius: '10px', 
                        background: '#eff6ff', 
                        color: 'var(--accent-blue)',
                        fontWeight: 600
                      }}>
                        {selectedRowIds.size} selected
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedRowIds.size > 0 && (
                      <button
                        className='btn'
                        type='button'
                        onClick={handleDeleteSelectedWorkers}
                        style={{ 
                          padding: '4px 10px', 
                          fontSize: '12px',
                          background: 'rgba(255, 59, 48, 0.1)',
                          color: 'var(--danger)',
                          border: '1px solid rgba(255, 59, 48, 0.3)'
                        }}
                      >
                        🗑 Delete ({selectedRowIds.size})
                      </button>
                    )}
                    <button
                      className='btn'
                      type='button'
                      onClick={() => setIsGalleryEditMode(prev => !prev)}
                      style={{ 
                        padding: '4px 10px', 
                        fontSize: '12px',
                        background: isGalleryEditMode ? 'rgba(59, 130, 246, 0.12)' : '#f5f5f5',
                        color: isGalleryEditMode ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        border: `1px solid ${isGalleryEditMode ? 'rgba(59, 130, 246, 0.35)' : 'var(--border-color)'}`
                      }}
                      aria-pressed={isGalleryEditMode}
                    >
                      ✏️ {isGalleryEditMode ? t('attendance.editing') : t('attendance.edit')}
                    </button>
                    <button className='btn btn-secondary' type='button' disabled style={{ opacity: 0.7, padding: '4px 10px', fontSize: '12px' }}>
                      {t('attendance.export')}
                    </button>
                    <button
                      className='btn btn-primary'
                      type='button'
                      onClick={() => (showAddPicker ? closeAddWorkerModal() : setShowAddPicker(true))}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      {t('attendance.addWorker')}
                    </button>
                  </div>
                </div>

                <AddWorkerModal
                  isOpen={showAddPicker}
                  title={t('attendance.addWorker')}
                  subtitle={`${selectedDateKey} • ${selectedShiftType === 'Day' ? t('attendance.day') : t('attendance.night')}`}
                  employees={availableEmployeesForGallery}
                  selectedIds={addEmployeeIds}
                  selectedLabel={t('attendance.selected')}
                  searchPlaceholder={t('attendance.searchByIdOrName')}
                  emptyTitle={t('attendance.noMatchingWorkers')}
                  emptyDescription={t('attendance.noEmployeesInSlice')}
                  availableLabel={(count) => `${count} available`}
                  confirmLabel={(count) => `${t('attendance.addSelected')} (${count})`}
                  closeLabel={t('attendance.close')}
                  teamLabel={(team) => team === 'All' ? t('filter.all') : t(`filter.${team.toLowerCase()}`)}
                  onToggleSelect={toggleAddEmployeeSelection}
                  onClose={closeAddWorkerModal}
                  onConfirm={handleAddWorkersToGallery}
                />

                {/* Table with selection checkboxes */}
                <div className='table-container' style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', padding: '6px 8px', textAlign: 'center' }}>
                          <input
                            type='checkbox'
                            checked={galleryEmployees.length > 0 && selectedRowIds.size === galleryEmployees.length}
                            onChange={toggleSelectAll}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                        </th>
                        <th style={{ width: '100px', padding: '10px 12px', fontSize: '14px' }}>{t('attendance.id')}</th>
                        <th style={{ width: '200px', padding: '10px 12px', fontSize: '14px' }}>{t('attendance.name')}</th>
                        <th style={{ width: '90px', padding: '10px 12px', fontSize: '14px' }}>{t('attendance.role')}</th>
                        <th style={{ width: '80px', padding: '10px 12px', fontSize: '14px' }}>{t('attendance.id_status')}</th>
                        <th style={{ width: '90px', padding: '10px 12px', fontSize: '14px' }}>{t('attendance.status')}</th>
                        <th style={{ width: '80px', padding: '10px 12px', fontSize: '14px' }}>{t('attendance.shift')}</th>
                        <th style={{ width: '80px', padding: '10px 12px', fontSize: '14px' }}>{t('attendance.gender')}</th>
                        <th style={{ width: '90px', padding: '10px 12px', fontSize: '14px' }}>{t('attendance.workingHour')}</th>
                        <th style={{ width: '90px', padding: '10px 12px', fontSize: '14px' }}>{t('attendance.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {galleryEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            {t('attendance.noEmployeesInSlice')}
                          </td>
                        </tr>
                      ) : (
                        galleryEmployees.map(emp => {
                          const draftKey = `${gallerySliceKey}|${emp.id}`;
                          return (
                            <GalleryEmployeeRow
                              key={emp.id}
                              employee={emp}
                              isSelected={selectedRowIds.has(emp.id)}
                              photoUrl={emp.email ? userPhotos.get(emp.email) ?? null : null}
                              isGalleryEditMode={isGalleryEditMode}
                              selectedDateKey={selectedDateKey}
                              isNight={selectedShiftType === 'Night'}
                              draftKey={draftKey}
                              draft={galleryHourDrafts[draftKey]}
                              roleOptions={ROLE_OPTIONS}
                              idStatusOptions={idStatusOptions}
                              workStatusOptions={WORK_STATUS_OPTIONS}
                              shiftTeamOptions={shiftTeamOptions}
                              genderOptions={genderOptions}
                              shiftLabel={t(`filter.${emp.shiftTeam.toLowerCase()}`)}
                              leaveLabel={t('adjustment.leave')}
                              onToggleRowSelection={toggleRowSelection}
                              onEmployeeUpdate={handleEmployeeUpdate}
                              onDraftChange={handleGalleryHourDraftChange}
                              onDraftCommit={handleGalleryHourDraftCommit}
                              onTogglePendingLeave={togglePendingLeave}
                              getShiftClass={getShiftClass}
                            />
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pending Leave Workers Section - 请假人员 */}
                {pendingLeaveEmployeesForSlice.length > 0 && (
                  <div style={{
                    marginTop: '16px',
                    border: '1px solid #ffcc80',
                    borderRadius: '8px',
                    backgroundColor: '#fff8e1'
                  }}>
                    <div style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid #ffcc80',
                      backgroundColor: '#fff3e0',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#e65100' }}>
                        {t('attendance.leaveSection')}
                      </span>
                      <span style={{
                        backgroundColor: '#e65100',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500
                      }}>
                        {pendingLeaveEmployeesForSlice.length}
                      </span>
                      <span style={{ fontSize: '12px', color: '#bf360c', marginLeft: 'auto' }}>
                        {t('attendance.pendingConfirm')}
                      </span>
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {pendingLeaveEmployeesForSlice.map(emp => {
                        const shiftTeamColor = emp.shiftTeam === 'Green' ? '#22c55e' 
                          : emp.shiftTeam === 'Blue' ? '#3b82f6' 
                          : emp.shiftTeam === 'Orange' ? '#f97316' 
                          : emp.shiftTeam === 'Yellow' ? '#eab308' 
                          : '#999';
                        const photoUrl = userPhotos.get(emp.email || '');
                        return (
                          <div
                            key={emp.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              border: `2px solid ${shiftTeamColor}`,
                              borderRadius: '8px',
                              backgroundColor: '#fff',
                              minWidth: '200px'
                            }}
                          >
                            {/* Avatar */}
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: shiftTeamColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '13px',
                              overflow: 'hidden',
                              flexShrink: 0
                            }}>
                              {photoUrl ? (
                                <img
                                  src={photoUrl}
                                  alt={emp.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                emp.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#333',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {emp.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                {emp.id}
                              </div>
                            </div>
                            
                            {/* Recall button */}
                            <button
                              onClick={() => recallFromPendingLeave(emp.id)}
                              style={{
                                padding: '5px 10px',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: '#4caf50',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                            >
                              {t('attendance.cancelLeave')}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Adjustment Table shows auto-generated adjustments from shift edits */}
      <AdjustmentTable adjustments={adjustments} setAdjustments={setAdjustments} selectedShift={selectedShift} employees={employees} />
      
      {/* Custom Alert Modal for RBP Rules */}
      {showAlertModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 30000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '0',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>LEGO RBP Rules</h3>
            </div>
            
            {/* Content */}
            <div style={{
              padding: '24px 20px',
              maxHeight: '400px',
              overflowY: 'auto',
              whiteSpace: 'pre-line',
              lineHeight: '1.6'
            }}>
              {alertMessage}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e0e0e0', color: '#666' }}>
                操作已取消。/ Operation cancelled.
              </div>
            </div>
            
            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowAlertModal(false);
                }}
                style={{
                  padding: '10px 32px',
                  backgroundColor: '#007AFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
