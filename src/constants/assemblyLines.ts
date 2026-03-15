import type { AssemblyLine } from '../types';

/** Shared default assembly line configuration used by LaborScheduling and EmployeeView. */
export const DEFAULT_ASSEMBLY_LINES: AssemblyLine[] = [
  { id: 'L1', name: 'L1 - Assembly Line 1', capacity: 8,  currentWorkers: 0, assignedWorkers: [] },
  { id: 'L2', name: 'L2 - Assembly Line 2', capacity: 10, currentWorkers: 0, assignedWorkers: [] },
  { id: 'L3', name: 'L3 - Assembly Line 3', capacity: 6,  currentWorkers: 0, assignedWorkers: [] },
  { id: 'L4', name: 'L4 - Assembly Line 4', capacity: 12, currentWorkers: 0, assignedWorkers: [] },
  { id: 'L5', name: 'L5 - Assembly Line 5', capacity: 8,  currentWorkers: 0, assignedWorkers: [] },
  { id: 'L6', name: 'L6 - Assembly Line 6', capacity: 10, currentWorkers: 0, assignedWorkers: [] },
];
