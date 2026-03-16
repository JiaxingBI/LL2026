import type { Role, ShiftTeam, WorkStatus } from '../types';

export const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'TC.L1', label: 'TC.L1' },
  { value: 'TC.L2', label: 'TC.L2' },
  { value: 'TC.L3', label: 'TC.L3' },
  { value: 'Hall Asist', label: 'Hall Asist' },
  { value: 'Infeeder', label: 'Infeeder' },
  { value: 'Sr.Infeeder', label: 'Sr.Infeeder' },
  { value: 'Ops.L1', label: 'Ops.L1' },
];

export const ID_STATUS_OPTIONS = [
  { value: 'Direct', translationKey: 'id.direct' },
  { value: 'Indirect', translationKey: 'id.indirect' },
] as const;

export const WORK_STATUS_OPTIONS: Array<{ value: WorkStatus; label: string }> = [
  { value: 'Prod.', label: 'Prod.' },
  { value: 'Jail', label: 'Jail' },
  { value: 'DailyProduction', label: 'DailyProduction' },
];

export const GENDER_OPTIONS = [
  { value: 'Male', translationKey: 'gender.male' },
  { value: 'Female', translationKey: 'gender.female' },
] as const;

export const SHIFT_TEAM_VALUES: ShiftTeam[] = ['Green', 'Blue', 'Orange', 'Yellow'];

export function getShiftClass(team: string): string {
  switch (team) {
    case 'Green':
      return 'badge-green';
    case 'Blue':
      return 'badge-blue';
    case 'Orange':
      return 'badge-orange';
    case 'Yellow':
      return 'badge-yellow';
    default:
      return '';
  }
}