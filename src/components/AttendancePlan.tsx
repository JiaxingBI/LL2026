import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Check, RotateCcw, Sun, Moon, Loader2 } from 'lucide-react';
import { fetchDataverseData, transformDataverseData, createAttendanceRecord, type TransformedData } from '../data/dataverseLoader';
import type { Employee, Adjustment } from '../types';
import AdjustmentTable from './AdjustmentTable';
import { useLanguage } from '../contexts/LanguageContext';
import { validateShiftChange } from '../utils/attendanceValidation';

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
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
  const [addSearchQuery, setAddSearchQuery] = useState<string>('');
  const [addTeamFilter, setAddTeamFilter] = useState<'All' | 'Green' | 'Blue' | 'Orange' | 'Yellow'>('All');
  // Selection state for delete functionality in the table
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  
  // Track saved state - filter uses this, display uses 'employees' with pending changes
  const [savedEmployees, setSavedEmployees] = useState<Employee[]>([]);
  const [savedAdjustments, setSavedAdjustments] = useState<Adjustment[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Custom alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [failedInputKey, setFailedInputKey] = useState<string | null>(null);

  // Fetch data from Dataverse when SDK is initialized
  useEffect(() => {
    if (!isInitialized) {
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
        
        setDataverseData(transformed);
        setEmployees(transformed.employees);
        setSavedEmployees(JSON.parse(JSON.stringify(transformed.employees)));
        
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

  // Debounce search input (300ms delay) for better performance
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * "Confirm" action.
   * Persists adjustments (OT/Leave) to ll_fAttendanceRecord in Dataverse,
   * then updates the local snapshot.
   */
  const handleConfirm = useCallback(async () => {
    // Only save NEW adjustments (those not yet persisted)
    // In a full implementation, we'd track which are already in Dataverse.
    // For now, we save all adjustments that don't have a Dataverse ID pattern.
    const newAdjustments = adjustments.filter(adj => {
      // Local IDs are timestamp-based (numeric strings); Dataverse IDs are GUIDs
      return /^\d+$/.test(adj.id);
    });

    if (newAdjustments.length > 0) {
      try {
        // Save each adjustment to ll_fAttendanceRecord
        const savePromises = newAdjustments.map(adj => {
          // Map shiftTeam to colorshift value expected by Dataverse
          const colorShift = adj.shiftTeam ?? 'Green';
          
          return createAttendanceRecord({
            hours: String(adj.hours),
            action: adj.adjustmentType ?? 'Overtime', // 'Overtime' or 'Leave'
            dayNightShift: adj.isNight ? 'Night' : 'Day',
            colorShift: colorShift,
            area: '', // Could be derived from employee's area if available
            department: '' // Could be derived from employee's department if available
          });
        });

        await Promise.all(savePromises);
        console.log(`Saved ${newAdjustments.length} adjustment(s) to Dataverse`);
      } catch (error) {
        console.error('Failed to save adjustments to Dataverse:', error);
        alert(t('attendance.saveFailed') || 'Failed to save some adjustments. Please try again.');
        return; // Don't update local state if save failed
      }
    }

    // Update local snapshot
    setSavedEmployees(JSON.parse(JSON.stringify(employees)));
    setSavedAdjustments(JSON.parse(JSON.stringify(adjustments)));
    setHasChanges(false);
    alert(t('attendance.changesSaved') || 'Changes saved successfully!');
  }, [employees, adjustments, t]);

  /**
   * "Reset" action.
   * Reverts unsaved UI edits back to the last confirmed snapshot.
   */
  const handleReset = useCallback(() => {
    setEmployees(JSON.parse(JSON.stringify(savedEmployees)));
    setAdjustments(JSON.parse(JSON.stringify(savedAdjustments)));
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

    // Validate the change against attendance rules
    const validation = validateShiftChange(emp, date, isNight, newHours, employees, allDates);
    
    if (!validation.isValid) {
      // Show violation alert - don't modify employee state or adjustments
      const violationMessage = validation.violations.join('\n\n');
      setAlertMessage(violationMessage);
      const inputKey = `${emp.id}-${date}-${isNight ? 'night' : 'day'}`;
      setFailedInputKey(inputKey);
      setShowAlertModal(true);
      return; // Don't proceed with the change - no state updates, no adjustment records
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
    if (adjustmentType) {
      const year = new Date().getFullYear();
      const [month, day] = date.split('/').map(Number);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const newAdjustment: Adjustment = {
        id: Date.now().toString(),
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        indirectDirect: emp.indirectDirect,
        workStatus: emp.status,
        shiftTeam: emp.shiftTeam,
        gender: emp.gender,
        date: dateStr,
        isNight: isNight,
        originalHours: originalHours,
        hours: newHours,
        adjustmentType: adjustmentType,
        reason: reason,
        comments: ''
      };
      
      setAdjustments(prev => [...prev, newAdjustment]);
    }
    setHasChanges(true);
  }, [employees, allDates]);

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
  // Uses debounced search for better performance when typing.
  // Color shift filter only applies in pivot view, not in gallery view.
  const filteredEmployees = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();
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
  }, [employees, selectedShift, debouncedSearch, viewMode]);

  /** Maps a shift team value to a CSS badge class. */
  const getShiftClass = (team: string) => {
    switch (team) {
      case 'Green': return 'badge-green';
      case 'Blue': return 'badge-blue';
      case 'Orange': return 'badge-orange';
      case 'Yellow': return 'badge-yellow';
      default: return '';
    }
  };

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
      if (Number.isFinite(parsed) && parsed > 0) ids.push(emp.id);
    }
    return ids;
  }, [employees, selectedDateKey, selectedShiftType]);

  const scheduledIdSet = useMemo(() => new Set<string>(scheduledIdsForSlice), [scheduledIdsForSlice]);

  const galleryEmployees = useMemo(() => {
    // Apply the same search + team filters to the gallery rows
    return filteredEmployees.filter(emp => scheduledIdSet.has(emp.id));
  }, [filteredEmployees, scheduledIdSet]);

  const availableEmployeesForGallery = useMemo(() => {
    // Per spec: choose from whole list not currently in this gallery slice
    return employees.filter(emp => !scheduledIdSet.has(emp.id));
  }, [employees, scheduledIdSet]);

  const filteredAvailableEmployeesForGallery = useMemo(() => {
    const query = addSearchQuery.toLowerCase().trim();
    return availableEmployeesForGallery.filter(emp => {
      if (addTeamFilter !== 'All' && emp.shiftTeam !== addTeamFilter) return false;
      if (!query) return true;
      return emp.id.toLowerCase().includes(query) || emp.name.toLowerCase().includes(query);
    });
  }, [availableEmployeesForGallery, addSearchQuery, addTeamFilter]);

  /*---------------------------------------------------------------------------
   * ADJUSTMENT RECORDS → ll_fAttendanceRecord (exceptions only)
   * -------------------------------------------------------------------------
   * The base schedule from ll_dShiftPlan is READ-ONLY and never written back.
   * Only EXCEPTIONS (Overtime / Leave) are captured in Adjustment records.
   * When the user manually changes hours or marks leave, we create an
   * Adjustment that will eventually be persisted to ll_fAttendanceRecord.
   *--------------------------------------------------------------------------*/

  /**
   * Appends a new Adjustment record and marks the plan dirty.
   * Uses a timestamp-based id for local uniqueness.
   */
  const addAdjustmentRecord = useCallback((payload: Omit<Adjustment, 'id'>) => {
    const record: Adjustment = {
      ...payload,
      id: Date.now().toString()
    };
    setAdjustments(prev => [...prev, record]);
    setHasChanges(true);
  }, []);

  useEffect(() => {
    setGalleryHourDrafts({});
  }, [gallerySliceKey]);

  /**
   * Creates a Leave adjustment for the currently selected date + Day/Night slice.
   * This record is destined for ll_fAttendanceRecord (not ll_dShiftPlan).
   */
  const handleLeaveClick = useCallback((emp: Employee) => {
    const dateStr = toIsoDateFromKey(planYear, selectedDateKey);
    const shiftEntry = emp.shifts[selectedDateKey];
    const originalValue = selectedShiftType === 'Day' ? (shiftEntry?.day || '') : (shiftEntry?.night || '');
    const originalHours = parseInt(originalValue) || 0;

    addAdjustmentRecord({
      employeeId: emp.id,
      name: emp.name,
      role: emp.role,
      indirectDirect: emp.indirectDirect,
      workStatus: emp.status,
      shiftTeam: emp.shiftTeam,
      gender: emp.gender,
      date: dateStr,
      isNight: selectedShiftType === 'Night',
      originalHours,
      hours: 0,
      adjustmentType: 'Leave',
      reason: 'Leave',
      comments: ''
    });
  }, [addAdjustmentRecord, planYear, selectedDateKey, selectedShiftType]);

  /**
   * Toggles Leave for the selected slice:
   * - If a matching Leave adjustment exists, remove it.
   * - Otherwise add one.
   */
  const toggleLeaveForEmployee = useCallback((emp: Employee) => {
    const dateStr = toIsoDateFromKey(planYear, selectedDateKey);
    const isNight = selectedShiftType === 'Night';

    const existing = adjustments.find(a =>
      a.employeeId === emp.id &&
      a.date === dateStr &&
      a.isNight === isNight &&
      a.adjustmentType === 'Leave'
    );

    if (existing) {
      setAdjustments(prev => prev.filter(a => a.id !== existing.id));
      setHasChanges(true);
      return;
    }

    handleLeaveClick(emp);
  }, [adjustments, handleLeaveClick, planYear, selectedDateKey, selectedShiftType]);

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
    setAddSearchQuery('');
    setAddTeamFilter('All');
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
        // Set hours to 0 to remove from slice
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
    setAddSearchQuery('');
    setAddTeamFilter('All');
  }, []);

  const selectedDateIso = useMemo(() => {
    return toIsoDateFromKey(planYear, selectedDateKey);
  }, [selectedDateKey]);

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

  // Detect which team is scheduled in the current slice (auto-detect from scheduled workers)
  const currentSliceTeam = useMemo(() => {
    // Get all employees scheduled in the current slice
    const scheduledEmps = employees.filter(emp => scheduledIdSet.has(emp.id));
    if (scheduledEmps.length === 0) return null;
    
    // Find the most common team among scheduled employees
    const teamCounts: Record<string, number> = {};
    for (const emp of scheduledEmps) {
      teamCounts[emp.shiftTeam] = (teamCounts[emp.shiftTeam] || 0) + 1;
    }
    
    // Return the team with most scheduled workers
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

  // Last slice (previous working shift for the auto-detected team from current slice)
  const lastSlice = useMemo(() => {
    const fallbackLastShiftType: ShiftType = selectedShiftType === 'Day' ? 'Night' : 'Day';
    const fallbackLastDateIso = selectedShiftType === 'Day' ? isoAddDays(selectedDateIso, -1) : selectedDateIso;
    const fallbackLastDateKey = toDateKeyFromIso(fallbackLastDateIso);
    const fallbackResult = { lastShiftType: fallbackLastShiftType, lastDateIso: fallbackLastDateIso, lastDateKey: fallbackLastDateKey, lastTeam: currentSliceTeam };

    // Use auto-detected team from current slice
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

    // If user is viewing Night, check same-date Day first (Day is earlier within the same date).
    if (selectedShiftType === 'Night') {
      const dayHours = getHours(selectedDateKey, 'Day');
      if (dayHours > 0) {
        const iso = toIsoDateFromKey(planYear, selectedDateKey);
        return { lastShiftType: 'Day' as const, lastDateIso: iso, lastDateKey: selectedDateKey, lastTeam: currentSliceTeam };
      }
    }

    // Scan backwards by date; for each date, Night is later than Day.
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
    // Use the auto-detected team from current slice
    const teamFiltered = currentSliceTeam ? employees.filter(e => e.shiftTeam === currentSliceTeam) : employees;
    return teamFiltered.filter(e => lastScheduledIdSet.has(e.id));
  }, [employees, currentSliceTeam, lastScheduledIdSet]);

  const lastSliceAdjustments = useMemo(() => {
    const isNight = lastSlice.lastShiftType === 'Night';
    // Use the auto-detected team from current slice
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
        .map(a => a.employeeId)
    );
    const arrived = lastSliceEmployees.filter(e => e.indirectDirect === 'Direct' && !leaveIds.has(e.id)).length;
    return arrived;
  }, [lastSliceAdjustments, lastSliceEmployees]);

  const lastSliceThirdPartyArrived = useMemo(() => {
    const leaveIds = new Set(
      lastSliceAdjustments
        .filter(a => a.adjustmentType === 'Leave' && a.indirectDirect === 'Indirect')
        .map(a => a.employeeId)
    );
    const arrived = lastSliceEmployees.filter(e => e.indirectDirect === 'Indirect' && !leaveIds.has(e.id)).length;
    return arrived;
  }, [lastSliceAdjustments, lastSliceEmployees]);

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
        <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading') || 'Loading data from Dataverse...'}</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
      {/* Header - Compact single line */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{t('attendance.title')}</h1>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t('attendance.subtitle')}</span>
        </div>
        <span style={{
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '10px',
          background: '#e8f5e9',
          color: '#2e7d32',
          fontWeight: 500
        }}>
          {`☁️ Dataverse (${dataverseData?.employees.length ?? 0} employees)`}
        </span>
      </div>

      {/* Schedule Editor */}
      <div className='card' style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
          <div className='flex items-center gap-4'>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input 
                type='text' 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('attendance.search')} 
                className='input'
                style={{ paddingLeft: '36px', width: '250px' }}
              />
            </div>
            {/* Color shift filter only visible in pivot view */}
            {viewMode === 'pivot' && (
              <div className='flex gap-2'>
                {['All', 'Green', 'Blue', 'Orange', 'Yellow'].map(filter => (
                  <button 
                    key={filter} 
                    onClick={() => setSelectedShift(filter)}
                    className={`btn ${selectedShift === filter ? 'btn-secondary' : 'btn-ghost'}`}
                    style={{ 
                      fontSize: '14px', 
                      padding: '8px 20px',
                      backgroundColor: selectedShift === filter ? '#eff6ff' : 'transparent',
                      color: selectedShift === filter ? 'var(--accent-blue)' : 'inherit'
                    }}
                  >
                    {t(filterKeys[filter])}
                  </button>
                ))}
              </div>
            )}

          </div>
          {/* Confirm and Reset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className='nav-tabs' aria-label='Attendance view mode'>
              <button
                onClick={() => setViewMode('pivot')}
                className={`nav-tab ${viewMode === 'pivot' ? 'active' : ''}`}
                type='button'
              >
                {t('attendance.viewPivot')}
              </button>
              <button
                onClick={() => setViewMode('gallery')}
                className={`nav-tab ${viewMode === 'gallery' ? 'active' : ''}`}
                type='button'
              >
                {t('attendance.viewGallery')}
              </button>
            </div>
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className='btn'
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: hasChanges ? '#fff3e0' : '#f5f5f5',
                color: hasChanges ? '#e65100' : '#999',
                border: `1px solid ${hasChanges ? '#ffcc80' : '#e0e0e0'}`,
                cursor: hasChanges ? 'pointer' : 'not-allowed',
                opacity: hasChanges ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              <RotateCcw size={16} />
              {t('attendance.reset') || 'Reset'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!hasChanges}
              className='btn'
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: hasChanges ? '#4caf50' : '#f5f5f5',
                color: hasChanges ? '#fff' : '#999',
                border: `1px solid ${hasChanges ? '#4caf50' : '#e0e0e0'}`,
                cursor: hasChanges ? 'pointer' : 'not-allowed',
                opacity: hasChanges ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              <Check size={16} />
              {t('attendance.confirm') || 'Confirm'}
            </button>
          </div>
        </div>

        {viewMode === 'pivot' ? (
          <div className='table-container' style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', minWidth: '40px', position: 'sticky', top: 0, left: 0, background: '#fafafa', zIndex: 5 }}>{t('attendance.id')}</th>
                  <th style={{ width: '80px', minWidth: '80px', position: 'sticky', top: 0, left: '40px', background: '#fafafa', zIndex: 5 }}>{t('attendance.name')}</th>
                  <th style={{ width: '70px', minWidth: '70px', position: 'sticky', top: 0, left: '120px', background: '#fafafa', zIndex: 5 }}>{t('attendance.role')}</th>
                  <th style={{ width: '70px', minWidth: '70px', position: 'sticky', top: 0, left: '190px', background: '#fafafa', zIndex: 5 }}>{t('attendance.id_status')}</th>
                  <th style={{ width: '70px', minWidth: '70px', position: 'sticky', top: 0, left: '260px', background: '#fafafa', zIndex: 5 }}>{t('attendance.status')}</th>
                  <th style={{ width: '70px', minWidth: '70px', position: 'sticky', top: 0, left: '330px', background: '#fafafa', zIndex: 5 }}>{t('attendance.shift')}</th>
                  <th style={{ width: '70px', minWidth: '70px', position: 'sticky', top: 0, left: '400px', background: '#fafafa', zIndex: 5, boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>{t('attendance.gender')}</th>
                  {dates.map(date => {
                    const todayHighlight = isToday(date);
                    const headerStyle = {
                      textAlign: 'center' as const,
                      minWidth: '60px',
                      borderLeft: '1px solid #eee',
                      position: 'sticky' as const,
                      top: 0,
                      background: '#fafafa',
                      zIndex: 4,
                      ...(todayHighlight && {
                        background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                      })
                    };
                    return (
                      <React.Fragment key={date}>
                        <th style={headerStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontWeight: todayHighlight ? 'bold' : 'normal' }}>{date}</span>
                            <span style={{ fontSize: '10px', color: todayHighlight ? 'rgba(255,255,255,0.8)' : '#999', fontWeight: 'normal' }}>{t('attendance.day')}</span>
                          </div>
                        </th>
                        <th style={headerStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontWeight: todayHighlight ? 'bold' : 'normal' }}>{date}</span>
                            <span style={{ fontSize: '10px', color: todayHighlight ? 'rgba(255,255,255,0.8)' : '#999', fontWeight: 'normal' }}>{t('attendance.night')}</span>
                          </div>
                        </th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, rowIndex) => {
                  const rowBg = getRowBackgroundColor(emp.shiftTeam);
                  return (
                  <tr key={`${emp.id}-${rowIndex}`} style={{ backgroundColor: rowBg }}>
                    <td style={{ color: '#666', position: 'sticky', left: 0, background: rowBg, zIndex: 1, width: '40px', minWidth: '40px' }}>{emp.id}</td>
                    <td style={{ fontWeight: '500', position: 'sticky', left: '40px', background: rowBg, zIndex: 1, width: '80px', minWidth: '80px' }}>{emp.name}</td>
                    <td style={{ color: '#666', position: 'sticky', left: '120px', background: rowBg, zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <select defaultValue={emp.role} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}>
                        <option value="TC.L1">TC.L1</option>
                        <option value="TC.L2">TC.L2</option>
                        <option value="TC.L3">TC.L3</option>
                        <option value="Hall Asist">Hall Asist</option>
                        <option value="Infeeder">Infeeder</option>
                        <option value="Sr.Infeeder">Sr.Infeeder</option>
                        <option value="Ops.L1">Ops.L1</option>
                      </select>
                    </td>
                    <td style={{ color: '#666', position: 'sticky', left: '190px', background: rowBg, zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <select defaultValue={emp.indirectDirect} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}>
                        <option value="Direct">{t('id.direct')}</option>
                        <option value="Indirect">{t('id.indirect')}</option>
                      </select>
                    </td>
                    <td style={{ color: '#666', position: 'sticky', left: '260px', background: rowBg, zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <select defaultValue={emp.status} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}>
                        <option value="Prod.">Prod.</option>
                        <option value="Jail">Jail</option>
                        <option value="DailyProduction">DailyProduction</option>
                      </select>
                    </td>
                    <td style={{ position: 'sticky', left: '330px', background: rowBg, zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <select 
                        value={emp.shiftTeam} 
                        onChange={(e) => handleEmployeeUpdate(emp.id, 'shiftTeam', e.target.value)}
                        className={`badge ${getShiftClass(emp.shiftTeam)}`} 
                        style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="Green">{t('filter.green')}</option>
                        <option value="Blue">{t('filter.blue')}</option>
                        <option value="Orange">{t('filter.orange')}</option>
                        <option value="Yellow">{t('filter.yellow')}</option>
                      </select>
                    </td>
                    <td style={{ color: '#666', position: 'sticky', left: '400px', background: rowBg, zIndex: 1, width: '70px', minWidth: '70px', boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>
                      <select defaultValue={emp.gender} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}>
                        <option value="Male">{t('gender.male')}</option>
                        <option value="Female">{t('gender.female')}</option>
                      </select>
                    </td>
                    {dates.map(date => (
                      <React.Fragment key={date}>
                        <td style={{ padding: '0', borderLeft: '1px solid #f5f5f5' }}>
                          <input 
                            type='number' 
                            step='0.5'
                            min='0'
                            value={emp.shifts[date]?.day || ''}
                            key={`${emp.id}-${date}-day`}
                            onChange={(e) => {
                              // Update local state immediately for responsive typing
                              const inputValue = e.target.value.trim();
                              setEmployees(prevEmployees => 
                                prevEmployees.map(e => {
                                  if (e.id === emp.id) {
                                    const newShifts = { ...e.shifts };
                                    if (!newShifts[date]) {
                                      newShifts[date] = { day: '', night: '' };
                                    }
                                    newShifts[date] = { ...newShifts[date], day: inputValue };
                                    return { ...e, shifts: newShifts };
                                  }
                                  return e;
                                })
                              );
                            }}
                            onBlur={(e) => {
                              const originalValue = emp.shifts[date]?.day || '';
                              const inputValue = e.target.value.trim();
                              
                              // Validate numeric input
                              if (inputValue && (isNaN(Number(inputValue)) || Number(inputValue) < 0)) {
                                return;
                              }
                              
                              if (inputValue !== originalValue) {
                                handleShiftChange(emp, date, false, inputValue);
                              }
                            }}
                            style={{ 
                              width: '100%',
                              height: '100%',
                              padding: '8px',
                              textAlign: 'center', 
                              border: 'none', 
                              background: 'transparent', 
                              outline: 'none',
                              MozAppearance: 'textfield',
                              WebkitAppearance: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </td>
                        <td style={{ padding: '0', borderLeft: '1px solid #f5f5f5' }}>
                          <input 
                            type='number' 
                            step='0.5'
                            min='0'
                            value={emp.shifts[date]?.night || ''}
                            key={`${emp.id}-${date}-night`}
                            onChange={(e) => {
                              // Update local state immediately for responsive typing
                              const inputValue = e.target.value.trim();
                              setEmployees(prevEmployees => 
                                prevEmployees.map(e => {
                                  if (e.id === emp.id) {
                                    const newShifts = { ...e.shifts };
                                    if (!newShifts[date]) {
                                      newShifts[date] = { day: '', night: '' };
                                    }
                                    newShifts[date] = { ...newShifts[date], night: inputValue };
                                    return { ...e, shifts: newShifts };
                                  }
                                  return e;
                                })
                              );
                            }}
                            onBlur={(e) => {
                              const originalValue = emp.shifts[date]?.night || '';
                              const inputValue = e.target.value.trim();
                              
                              // Validate numeric input
                              if (inputValue && (isNaN(Number(inputValue)) || Number(inputValue) < 0)) {
                                return;
                              }
                              
                              if (inputValue !== originalValue) {
                                handleShiftChange(emp, date, true, inputValue);
                              }
                            }}
                            style={{ 
                              width: '100%',
                              height: '100%',
                              padding: '8px',
                              textAlign: 'center', 
                              border: 'none', 
                              background: 'transparent', 
                              outline: 'none',
                              MozAppearance: 'textfield',
                              WebkitAppearance: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                borderRight: '1px solid var(--border-color)'
              }}
            >
              <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
                <input
                  type='date'
                  className='input'
                  value={selectedDateIso}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    const parts = value.split('-').map(Number);
                    if (parts.length !== 3) return;
                    const [, month, day] = parts;
                    setSelectedDateKey(toDateKey(month, day));
                  }}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ overflowY: 'auto', padding: '6px 0' }}>
                {dates.map(dateKey => {
                  const todayHighlight = isToday(dateKey);
                  const dateSelected = selectedDateKey === dateKey;

                  // Small helper for rendering the Day/Night pills for a specific date row.
                  const renderShiftButton = (shift: ShiftType) => {
                    const selected = selectedDateKey === dateKey && selectedShiftType === shift;
                    const Icon = shift === 'Day' ? Sun : Moon;
                    const pillBg = shift === 'Day' ? '#48b6c8' : '#111827';
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
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '999px',
                          background: pillBg,
                          color: 'white',
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          border: '1px solid rgba(255,255,255,0.12)',
                          boxShadow: shift === 'Day' ? '0 10px 18px rgba(72, 182, 200, 0.22)' : '0 10px 18px rgba(17, 24, 39, 0.18)',
                          opacity: selected ? 1 : 0.35,
                          filter: selected ? 'none' : 'grayscale(10%)',
                          minWidth: 0,
                          whiteSpace: 'nowrap'
                        }}
                        aria-pressed={selected}
                      >
                        <Icon size={14} color='white' />
                        <span style={{ fontSize: '13px' }}>{shift === 'Day' ? t('attendance.day') : t('attendance.night')}</span>
                      </button>
                    );
                  };

                  return (
                    <div
                      key={dateKey}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #f5f5f5',
                        background: dateSelected ? '#f3f8ff' : (todayHighlight ? '#f8fafc' : 'transparent')
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{dateKey}</div>
                        {todayHighlight && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 10px',
                              borderRadius: '999px',
                              border: '1px solid #dbeafe',
                              background: '#eff6ff',
                              color: 'var(--accent-blue)',
                              fontWeight: 700
                            }}
                          >
                            {t('attendance.today')}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {renderShiftButton('Day')}
                        {renderShiftButton('Night')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main: cards + table */}
            <div style={{ padding: '8px', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Compact horizontal stats row */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Quick stats - inline compact cards */}
                <div className='card' style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('attendance.totalWorkers')}</span>
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{employees.length}</span>
                </div>
                <div className='card' style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('attendance.scheduledSlice')}</span>
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{galleryEmployees.length}</span>
                </div>
                <div className='card' style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('attendance.overtimeSlice')}</span>
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{sliceOvertimeCount}</span>
                </div>
                <div className='card' style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('attendance.leaveSlice')}</span>
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{sliceLeaveCount}</span>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

                {/* Last Color Shift label + meta + compact cards (same height as other cards) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    {t('attendance.lastColorShift')}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 10px',
                      borderRadius: '999px',
                      border: '1px solid #dbeafe',
                      background: '#eff6ff',
                      color: 'var(--accent-blue)',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {lastSlice.lastDateKey} • {lastSlice.lastShiftType === 'Day' ? t('attendance.day') : t('attendance.night')} • {lastSlice.lastTeam ? t(filterKeys[lastSlice.lastTeam] || lastSlice.lastTeam) : '-'}
                  </span>

                  <div className='card' style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t('attendance.actualArrivedPlanInternal')}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 800, whiteSpace: 'nowrap' }}>{lastSliceInternalArrived}/{lastSliceInternalPlan}</span>
                  </div>
                  <div className='card' style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t('attendance.actualArrivedPlanThirdParty')}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 800, whiteSpace: 'nowrap' }}>{lastSliceThirdPartyArrived}/{lastSliceThirdPartyPlan}</span>
                  </div>
                  <div className='card' style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('attendance.overtimeWorkers')}</span>
                    <span style={{ fontSize: '16px', fontWeight: 800 }}>{lastSliceOvertimeCount}</span>
                  </div>
                  <div className='card' style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('attendance.leaveWorkers')}</span>
                    <span style={{ fontSize: '16px', fontWeight: 800 }}>{lastSliceLeaveCount}</span>
                  </div>
                </div>
              </div>

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
                    <button className='btn btn-secondary' type='button' disabled style={{ opacity: 0.7, padding: '4px 10px', fontSize: '12px' }}>
                      {t('attendance.export')}
                    </button>
                    <button
                      className='btn btn-primary'
                      type='button'
                      onClick={() => (showAddPicker ? closeAddWorkerModal() : setShowAddPicker(true))}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      {`+ ${t('attendance.addWorker')}`}
                    </button>
                  </div>
                </div>

                {/* Add Worker Modal */}
                {showAddPicker && (
                  <div
                    role='dialog'
                    aria-modal='true'
                    onMouseDown={(e) => {
                      if (e.currentTarget === e.target) closeAddWorkerModal();
                    }}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(0,0,0,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9999,
                      padding: 12
                    }}
                  >
                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        width: 'min(920px, 96vw)',
                        maxHeight: 'min(640px, 92vh)',
                        background: 'white',
                        borderRadius: 12,
                        border: '1px solid rgba(0,0,0,0.12)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>{t('attendance.addWorker')}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {t('attendance.selected') ?? 'Selected'}: {addEmployeeIds.size}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={closeAddWorkerModal}
                            className='btn btn-secondary'
                            type='button'
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            {t('attendance.close') ?? 'Close'}
                          </button>
                          <button
                            onClick={handleAddWorkersToGallery}
                            disabled={addEmployeeIds.size === 0}
                            className='btn'
                            type='button'
                            style={{
                              padding: '6px 14px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: addEmployeeIds.size > 0 ? '#4caf50' : '#f5f5f5',
                              color: addEmployeeIds.size > 0 ? '#fff' : '#999',
                              border: `1px solid ${addEmployeeIds.size > 0 ? '#4caf50' : '#e0e0e0'}`,
                              cursor: addEmployeeIds.size > 0 ? 'pointer' : 'not-allowed',
                              opacity: addEmployeeIds.size > 0 ? 1 : 0.6
                            }}
                          >
                            {t('attendance.addSelected') ?? 'Add'} {addEmployeeIds.size > 0 ? `(${addEmployeeIds.size})` : ''}
                          </button>
                        </div>
                      </div>

                      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          {/* Team slicer - only affects the add-worker list */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {(['All', 'Green', 'Blue', 'Orange', 'Yellow'] as const).map(team => {
                              const active = addTeamFilter === team;
                              return (
                                <button
                                  key={team}
                                  type='button'
                                  className='btn'
                                  onClick={() => setAddTeamFilter(team)}
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '12px',
                                    borderRadius: '16px',
                                    border: active ? '1px solid var(--accent-blue)' : '1px solid #e0e0e0',
                                    background: active ? '#eff6ff' : 'white',
                                    color: active ? 'var(--accent-blue)' : 'var(--text-primary)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {team}
                                </button>
                              );
                            })}
                          </div>

                          <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 360 }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                            <input
                              type='text'
                              value={addSearchQuery}
                              onChange={(e) => setAddSearchQuery(e.target.value)}
                              placeholder={t('attendance.searchByIdOrName')}
                              className='input'
                              style={{ paddingLeft: '32px', width: '100%', height: '32px', fontSize: '13px' }}
                            />
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {filteredAvailableEmployeesForGallery.length} available
                        </div>

                        <div
                          style={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            border: '1px solid var(--border-color)',
                            borderRadius: 10,
                            background: 'linear-gradient(to bottom, #f8fafc, #fff)',
                            padding: 10,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                            alignContent: 'flex-start'
                          }}
                        >
                          {filteredAvailableEmployeesForGallery.map(emp => {
                            const isSelected = addEmployeeIds.has(emp.id);
                            return (
                              <button
                                key={emp.id}
                                onClick={() => toggleAddEmployeeSelection(emp.id)}
                                className='btn'
                                type='button'
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  borderRadius: '16px',
                                  border: isSelected ? '1px solid var(--accent-blue)' : '1px solid #e0e0e0',
                                  background: isSelected ? '#eff6ff' : 'white',
                                  color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {isSelected && <span>✓</span>}
                                <span style={{ fontWeight: 600 }}>{emp.id}</span>
                                <span style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>{emp.name}</span>
                                <span style={{
                                  marginLeft: 6,
                                  padding: '1px 6px',
                                  borderRadius: 999,
                                  background: 'rgba(0,0,0,0.06)',
                                  fontSize: 10,
                                  color: 'var(--text-secondary)'
                                }}>
                                  {emp.shiftTeam}
                                </span>
                              </button>
                            );
                          })}
                          {filteredAvailableEmployeesForGallery.length === 0 && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px' }}>
                              {t('attendance.noMatchingWorkers')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                            style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                          />
                        </th>
                        <th style={{ width: '90px', padding: '6px 8px' }}>{t('attendance.id')}</th>
                        <th style={{ width: '180px', padding: '6px 8px' }}>{t('attendance.name')}</th>
                        <th style={{ width: '70px', padding: '6px 8px' }}>{t('attendance.role')}</th>
                        <th style={{ width: '60px', padding: '6px 8px' }}>{t('attendance.id_status')}</th>
                        <th style={{ width: '70px', padding: '6px 8px' }}>{t('attendance.status')}</th>
                        <th style={{ width: '60px', padding: '6px 8px' }}>{t('attendance.shift')}</th>
                        <th style={{ width: '60px', padding: '6px 8px' }}>{t('attendance.gender')}</th>
                        <th style={{ width: '80px', padding: '6px 8px' }}>{t('attendance.workingHour')}</th>
                        <th style={{ width: '70px', padding: '6px 8px' }}>{t('attendance.actions')}</th>
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
                          const initials = emp.name
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map(part => part[0]?.toUpperCase())
                            .join('') || emp.name.slice(0, 2).toUpperCase();
                          const isNight = selectedShiftType === 'Night';
                          const draftKey = `${gallerySliceKey}|${emp.id}`;
                          const draft = galleryHourDrafts[draftKey];
                          const shiftEntry = emp.shifts[selectedDateKey];
                          const storedRaw = isNight ? (shiftEntry?.night || '') : (shiftEntry?.day || '');
                          const storedParsed = parseInt(String(storedRaw), 10);
                          const storedHours = Number.isFinite(storedParsed) && storedParsed > 0 ? String(storedParsed) : '';
                          const displayValue = draft ? draft.value : (storedHours || '12');

                          const dateStr = toIsoDateFromKey(planYear, selectedDateKey);
                          const leaveOn = adjustments.some(a =>
                            a.employeeId === emp.id &&
                            a.date === dateStr &&
                            a.isNight === isNight &&
                            a.adjustmentType === 'Leave'
                          );
                          const isRowSelected = selectedRowIds.has(emp.id);
                          return (
                            <tr 
                              key={emp.id}
                              style={{ 
                                background: isRowSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                <input
                                  type='checkbox'
                                  checked={isRowSelected}
                                  onChange={() => toggleRowSelection(emp.id)}
                                  style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                                />
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '12px', padding: '4px 8px' }}>
                                {emp.id}
                              </td>
                              <td style={{ padding: '4px 8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '999px',
                                      border: '1px solid var(--border-color)',
                                      background: 'white',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      color: 'var(--text-secondary)'
                                    }}
                                  >
                                    {initials}
                                  </div>
                                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{emp.name}</span>
                                </div>
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '12px', padding: '4px 8px' }}>{emp.role}</td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '12px', padding: '4px 8px' }}>{emp.indirectDirect}</td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '12px', padding: '4px 8px' }}>{emp.status}</td>
                              <td style={{ padding: '4px 8px' }}>
                                <span className={`badge ${getShiftClass(emp.shiftTeam)}`} style={{ fontSize: '11px', padding: '2px 6px' }}>{emp.shiftTeam}</span>
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '12px', padding: '4px 8px' }}>{emp.gender}</td>
                              <td style={{ padding: '4px 8px' }}>
                                <input
                                  type='number'
                                  min={0}
                                  step={1}
                                  className='input'
                                  value={displayValue}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setGalleryHourDrafts(prev => ({
                                      ...prev,
                                      [draftKey]: { value, touched: true }
                                    }));
                                  }}
                                  onBlur={() => {
                                    const current = galleryHourDrafts[draftKey];
                                    if (!current?.touched) return;
                                    const nextValue = String(parseInt(current.value, 10) || 0);
                                    const prevValue = String(parseInt(String(storedRaw || '0'), 10) || 0);
                                    if (nextValue === prevValue) {
                                      setGalleryHourDrafts(prev => ({
                                        ...prev,
                                        [draftKey]: { value: displayValue, touched: false }
                                      }));
                                      return;
                                    }

                                    handleShiftChange(emp, selectedDateKey, isNight, nextValue);
                                    // Reset to original value if validation failed
                                    setGalleryHourDrafts(prev => ({
                                      ...prev,
                                      [draftKey]: { value: String(storedRaw || ''), touched: false }
                                    }));
                                  }}
                                  style={{ width: '60px', height: '26px', fontSize: '12px' }}
                                />
                              </td>
                              <td style={{ padding: '4px 8px' }}>
                                <button
                                  onClick={() => toggleLeaveForEmployee(emp)}
                                  className='btn'
                                  type='button'
                                  style={{
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    backgroundColor: leaveOn ? 'rgba(255, 59, 48, 0.12)' : '#f5f5f5',
                                    color: leaveOn ? 'var(--danger)' : 'var(--text-secondary)',
                                    border: `1px solid ${leaveOn ? 'rgba(255, 59, 48, 0.35)' : 'var(--border-color)'}`,
                                    cursor: 'pointer'
                                  }}
                                  aria-pressed={leaveOn}
                                >
                                  {t('adjustment.leave')}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Adjustment Table shows auto-generated adjustments from shift edits */}
      <AdjustmentTable adjustments={adjustments} setAdjustments={setAdjustments} selectedShift={selectedShift} />
      
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
          zIndex: 10000
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
                  setFailedInputKey(null);
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
