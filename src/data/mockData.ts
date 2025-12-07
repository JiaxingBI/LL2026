import type { Employee, Adjustment, AssemblyLine } from '../types';

export const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Alex',
    role: 'TC.L1',
    indirectDirect: 'Direct',
    status: 'Prod.',
    shiftTeam: 'Green',
    gender: 'Male',
    shifts: {}
  },
  {
    id: '2',
    name: 'Ben',
    role: 'TC.L2',
    indirectDirect: 'Direct',
    status: 'Prod.',
    shiftTeam: 'Blue',
    gender: 'Male',
    shifts: {}
  },
  {
    id: '3',
    name: 'Charles',
    role: 'TC.L3',
    indirectDirect: 'Direct',
    status: 'Prod.',
    shiftTeam: 'Orange',
    gender: 'Male',
    shifts: {}
  },
  {
    id: '4',
    name: 'Daniels',
    role: 'Hall Asist',
    indirectDirect: 'Indirect',
    status: 'Jail',
    shiftTeam: 'Yellow',
    gender: 'Male',
    shifts: {}
  },
  {
    id: '5',
    name: 'Eric',
    role: 'Infeeder',
    indirectDirect: 'Direct',
    status: 'Prod.',
    shiftTeam: 'Green',
    gender: 'Male',
    shifts: {}
  },
  {
    id: '6',
    name: 'Frank',
    role: 'Sr.Infeeder',
    indirectDirect: 'Direct',
    status: 'Prod.',
    shiftTeam: 'Blue',
    gender: 'Male',
    shifts: {}
  },
  {
    id: '7',
    name: 'George',
    role: 'Ops.L1',
    indirectDirect: 'Indirect',
    status: 'DailyProduction',
    shiftTeam: 'Orange',
    gender: 'Male',
    shifts: {}
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
