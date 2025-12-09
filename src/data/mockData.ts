import type { Employee, Adjustment, AssemblyLine, ShiftEntry } from '../types';

// Shift rotation: 4 days work (2 Day + 2 Night), 4 days rest
// Each shift team starts at a different point in the 8-day cycle

// Generate all dates for the current year (1/1 to 12/31)
function generateAllDates(): string[] {
  const year = new Date().getFullYear();
  const dates: string[] = [];
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(`${month + 1}/${day}`);
    }
  }
  return dates;
}

const allDates = generateAllDates();

// Shift team cycle offsets (each team is offset by 2 days)
const shiftTeamOffsets: Record<string, number> = {
  'Green': 0,   // Day 1 of cycle: Day shift
  'Blue': 2,    // Day 3 of cycle: Night shift  
  'Orange': 4,  // Day 5 of cycle: Rest
  'Yellow': 6   // Day 7 of cycle: Rest
};

// Generate shift pattern for all days based on offset
// Cycle: Day 0-1: Day shift (12h), Day 2-3: Night shift (12h), Day 4-7: Rest
function generateShifts(shiftTeam: string): Record<string, ShiftEntry> {
  const offset = shiftTeamOffsets[shiftTeam] || 0;
  const shifts: Record<string, ShiftEntry> = {};
  
  allDates.forEach((date, index) => {
    const cycleDay = (index + offset) % 8;
    
    if (cycleDay === 0 || cycleDay === 1) {
      // Day shift days
      shifts[date] = { day: '12', night: '' };
    } else if (cycleDay === 2 || cycleDay === 3) {
      // Night shift days
      shifts[date] = { day: '', night: '12' };
    } else {
      // Rest days (4-7)
      shifts[date] = { day: '', night: '' };
    }
  });
  
  return shifts;
}

export const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Alex',
    role: 'TC.L1',
    indirectDirect: 'Direct',
    status: 'Prod.',
    shiftTeam: 'Green',
    gender: 'Male',
    shifts: generateShifts('Green')
  },
  {
    id: '2',
    name: 'Ben',
    role: 'TC.L2',
    indirectDirect: 'Direct',
    status: 'Prod.',
    shiftTeam: 'Blue',
    gender: 'Male',
    shifts: generateShifts('Blue')
  },
  {
    id: '3',
    name: 'Charles',
    role: 'TC.L3',
    indirectDirect: 'Direct',
    status: 'Prod.',
    shiftTeam: 'Orange',
    gender: 'Male',
    shifts: generateShifts('Orange')
  },
  {
    id: '4',
    name: 'Daniels',
    role: 'Hall Asist',
    indirectDirect: 'Indirect',
    status: 'Jail',
    shiftTeam: 'Yellow',
    gender: 'Male',
    shifts: generateShifts('Yellow')
  },
  {
    id: '5',
    name: 'Eric',
    role: 'Infeeder',
    indirectDirect: 'Direct',
    status: 'Prod.',
    shiftTeam: 'Green',
    gender: 'Male',
    shifts: generateShifts('Green')
  },
  {
    id: '6',
    name: 'Frank',
    role: 'Sr.Infeeder',
    indirectDirect: 'Direct',
    status: 'Prod.',
    shiftTeam: 'Blue',
    gender: 'Male',
    shifts: generateShifts('Blue')
  },
  {
    id: '7',
    name: 'George',
    role: 'Ops.L1',
    indirectDirect: 'Indirect',
    status: 'DailyProduction',
    shiftTeam: 'Orange',
    gender: 'Male',
    shifts: generateShifts('Orange')
  }
];

export const mockAdjustments: Adjustment[] = [
  {
    id: '2',
    employeeId: '2',
    name: 'Ben',
    role: 'TC.L2',
    shiftTeam: 'Blue',
    gender: 'Male',
    hours: 12,
    date: '6-Dec',
    isNight: true,
    reason: '加班',
    comments: '',
    type: '加班',
    duration: '12',
    shift: 'N',
    indirectDirect: 'Direct',
    workStatus: 'Prod.'
  },
  {
    id: '3',
    employeeId: '3',
    name: 'Charles',
    role: 'TC.L3',
    shiftTeam: 'Orange',
    gender: 'Male',
    hours: 1,
    date: '6-Dec',
    isNight: true,
    reason: '加班',
    comments: '',
    type: '加班',
    duration: '1',
    shift: 'N',
    indirectDirect: 'Direct',
    workStatus: 'Prod.'
  }
];

export const mockAssemblyLines: AssemblyLine[] = [
  {
    id: 'P10B',
    name: 'P10B-SMP FULL FLEX NEW',
    capacity: 5,
    currentWorkers: 2,
    assignedWorkers: [
      { employeeId: '1', name: 'Alex', initials: 'AL', experienceCount: 15 },
      { employeeId: '2', name: 'Ben', initials: 'BE', experienceCount: 8 }
    ]
  },
  {
    id: 'P11B',
    name: 'P11B - SMP FULL FLEX New',
    capacity: 4,
    currentWorkers: 1,
    assignedWorkers: [
      { employeeId: '3', name: 'Charles', initials: 'CH', experienceCount: 25 }
    ]
  },
  {
    id: 'P12B',
    name: 'P12B-SMP FULL FLEX SPECIAL',
    capacity: 6,
    currentWorkers: 0,
    assignedWorkers: []
  }
];
