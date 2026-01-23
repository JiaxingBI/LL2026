/**
 * Attendance Validation Rules
 * 
 * Implements labor law compliance checks:
 * 1. Average overtime per month should not exceed 36 hours per person per year
 * 2. Within any consecutive 7 days, working hours should not exceed 60 hours
 * 3. No one should work more than 6 consecutive days
 * 4. Rest time between shifts must be greater than 10 hours (max 14 hours per shift)
 */

import type { Employee } from '../types';

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
}

/**
 * Validates if a shift change violates any attendance rules
 */
export function validateShiftChange(
  employee: Employee,
  targetDate: string,
  isNight: boolean,
  newHours: number,
  _allEmployees: Employee[],
  dateKeys: string[]
): ValidationResult {
  const violations: string[] = [];

  // Only validate if actually adding/increasing hours
  if (newHours <= 0) {
    return { isValid: true, violations: [] };
  }

  // Rule 1: Check monthly overtime (average 36 hours per month across the year)
  const monthlyOvertimeViolation = checkMonthlyOvertime(employee, targetDate, isNight, newHours, dateKeys);
  if (monthlyOvertimeViolation) {
    violations.push(monthlyOvertimeViolation);
  }

  // Rule 2: Check 60 hours in any consecutive 7 days
  const weeklyHoursViolation = checkWeeklyHours(employee, targetDate, isNight, newHours, dateKeys);
  if (weeklyHoursViolation) {
    violations.push(weeklyHoursViolation);
  }

  // Rule 3: Check no more than 6 consecutive working days
  const consecutiveDaysViolation = checkConsecutiveWorkDays(employee, targetDate, isNight, newHours, dateKeys);
  if (consecutiveDaysViolation) {
    violations.push(consecutiveDaysViolation);
  }

  // Rule 4: Check rest time between shifts (>10 hours)
  const restTimeViolation = checkRestTimeBetweenShifts(employee, targetDate, isNight, newHours, dateKeys);
  if (restTimeViolation) {
    violations.push(restTimeViolation);
  }

  return {
    isValid: violations.length === 0,
    violations
  };
}

/**
 * Rule 1: Average overtime per month should not exceed 36 hours
 * This checks the month containing the target date
 */
function checkMonthlyOvertime(
  employee: Employee,
  targetDate: string,
  isNight: boolean,
  newHours: number,
  _dateKeys: string[]
): string | null {
  const [month] = targetDate.split('/').map(Number);
  
  // Calculate total hours for this month
  let monthTotal = 0;
  for (const [dateKey, shifts] of Object.entries(employee.shifts)) {
    const [m] = dateKey.split('/').map(Number);
    if (m === month) {
      const dayHours = parseInt(shifts.day) || 0;
      const nightHours = parseInt(shifts.night) || 0;
      monthTotal += dayHours + nightHours;
    }
  }

  // Add the new hours to target date
  const currentDateShift = employee.shifts[targetDate];
  const currentHours = isNight ? (parseInt(currentDateShift?.night || '0')) : (parseInt(currentDateShift?.day || '0'));
  monthTotal = monthTotal - currentHours + newHours;

  // Standard working hours: assume 12 hours per scheduled day
  // Overtime = total hours - (scheduled days × 12)
  // For simplicity, flag if total monthly hours exceed reasonable threshold
  // (e.g., 22 working days × 12 hours = 264 hours + 36 overtime = 300 hours max)
  const maxMonthlyHours = 300; // Adjust based on actual working days policy

  if (monthTotal > maxMonthlyHours) {
    return `规则违反：一年内平均每人每月加班工时不得大于36小时。当前月份总工时将达到 ${monthTotal} 小时，超过限制。\n(Rule violation: Average overtime per month should not exceed 36 hours. Current month total will be ${monthTotal} hours, exceeding the limit.)`;
  }

  return null;
}

/**
 * Rule 2: Within any consecutive 7 days, working hours should not exceed 60 hours
 */
function checkWeeklyHours(
  employee: Employee,
  targetDate: string,
  isNight: boolean,
  newHours: number,
  _dateKeys: string[]
): string | null {
  const year = new Date().getFullYear();
  const [targetMonth, targetDay] = targetDate.split('/').map(Number);
  const targetDateObj = new Date(year, targetMonth - 1, targetDay);

  // Check 7-day windows: 3 days before + target day + 3 days after
  for (let windowStart = -6; windowStart <= 0; windowStart++) {
    let weekTotal = 0;
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(targetDateObj);
      checkDate.setDate(targetDateObj.getDate() + windowStart + i);
      const checkMonth = checkDate.getMonth() + 1;
      const checkDay = checkDate.getDate();
      const checkDateKey = `${checkMonth}/${checkDay}`;

      const shifts = employee.shifts[checkDateKey];
      if (shifts) {
        let dayHours = parseInt(shifts.day) || 0;
        let nightHours = parseInt(shifts.night) || 0;

        // If this is the target date, use new hours
        if (checkDateKey === targetDate) {
          if (isNight) {
            nightHours = newHours;
          } else {
            dayHours = newHours;
          }
        }

        weekTotal += dayHours + nightHours;
      }
    }

    if (weekTotal > 60) {
      const windowStartDate = new Date(targetDateObj);
      windowStartDate.setDate(targetDateObj.getDate() + windowStart);
      const windowEndDate = new Date(windowStartDate);
      windowEndDate.setDate(windowStartDate.getDate() + 6);
      
      return `规则违反：任意连续7天内，每人工作时间不得超过60小时。从 ${windowStartDate.getMonth() + 1}/${windowStartDate.getDate()} 到 ${windowEndDate.getMonth() + 1}/${windowEndDate.getDate()} 总工时将达到 ${weekTotal} 小时。\n(Rule violation: Within any consecutive 7 days, working hours should not exceed 60 hours. From ${windowStartDate.getMonth() + 1}/${windowStartDate.getDate()} to ${windowEndDate.getMonth() + 1}/${windowEndDate.getDate()} total will be ${weekTotal} hours.)`;
    }
  }

  return null;
}

/**
 * Rule 3: No one should work more than 6 consecutive days
 */
function checkConsecutiveWorkDays(
  employee: Employee,
  targetDate: string,
  _isNight: boolean,
  _newHours: number,
  _dateKeys: string[]
): string | null {
  const year = new Date().getFullYear();
  const [targetMonth, targetDay] = targetDate.split('/').map(Number);
  const targetDateObj = new Date(year, targetMonth - 1, targetDay);

  // Count consecutive working days including the target date
  let consecutiveBefore = 0;
  let consecutiveAfter = 0;

  // Count backwards from target date
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(targetDateObj);
    checkDate.setDate(targetDateObj.getDate() - i);
    const checkDateKey = `${checkDate.getMonth() + 1}/${checkDate.getDate()}`;
    
    const shifts = employee.shifts[checkDateKey];
    if (shifts && (parseInt(shifts.day) > 0 || parseInt(shifts.night) > 0)) {
      consecutiveBefore++;
    } else {
      break;
    }
  }

  // Count forwards from target date
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(targetDateObj);
    checkDate.setDate(targetDateObj.getDate() + i);
    const checkDateKey = `${checkDate.getMonth() + 1}/${checkDate.getDate()}`;
    
    const shifts = employee.shifts[checkDateKey];
    if (shifts && (parseInt(shifts.day) > 0 || parseInt(shifts.night) > 0)) {
      consecutiveAfter++;
    } else {
      break;
    }
  }

  const totalConsecutive = consecutiveBefore + 1 + consecutiveAfter; // +1 for target date

  if (totalConsecutive > 6) {
    return `规则违反：任何人不得连续上班超过6天。此操作将导致连续工作 ${totalConsecutive} 天。\n(Rule violation: No one should work more than 6 consecutive days. This will result in ${totalConsecutive} consecutive working days.)`;
  }

  return null;
}

/**
 * Rule 4: Rest time between shifts must be greater than 10 hours (max 14 hours per shift)
 */
function checkRestTimeBetweenShifts(
  employee: Employee,
  targetDate: string,
  isNight: boolean,
  newHours: number,
  _dateKeys: string[]
): string | null {
  // Check if shift exceeds 14 hours
  if (newHours > 14) {
    return `规则违反：每次上班时间不得超过14小时。当前输入 ${newHours} 小时。\n(Rule violation: Each work session should not exceed 14 hours. Current input is ${newHours} hours.)`;
  }

  const year = new Date().getFullYear();
  const [targetMonth, targetDay] = targetDate.split('/').map(Number);
  const targetDateObj = new Date(year, targetMonth - 1, targetDay);

  // Check rest time with previous shift
  if (isNight) {
    // Night shift: check if there was a day shift on the same date
    const dayShift = employee.shifts[targetDate];
    if (dayShift && parseInt(dayShift.day) > 0) {
      // Same day has both day and night shift = less than 10 hours rest
      return `规则违反：两个班之间的休息时间必须大于10小时。同一天不能既上白班又上夜班。\n(Rule violation: Rest time between shifts must be greater than 10 hours. Cannot work both day and night shift on the same day.)`;
    }
  } else {
    // Day shift: check if there was a night shift on the previous date
    const prevDate = new Date(targetDateObj);
    prevDate.setDate(targetDateObj.getDate() - 1);
    const prevDateKey = `${prevDate.getMonth() + 1}/${prevDate.getDate()}`;
    const prevShift = employee.shifts[prevDateKey];
    
    if (prevShift && parseInt(prevShift.night) > 0) {
      // Previous night shift exists = less than 10 hours rest
      return `规则违反：两个班之间的休息时间必须大于10小时。前一天夜班后不能立即上白班。\n(Rule violation: Rest time between shifts must be greater than 10 hours. Cannot work day shift immediately after previous night shift.)`;
    }
  }

  return null;
}
