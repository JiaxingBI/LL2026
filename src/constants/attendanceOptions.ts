import type { Role, ShiftTeam, WorkStatus } from '../types';

export const ROLE_OPTIONS: Array<{ value: Role; translationKey: string }> = [
  { value: 'TC.L1', translationKey: 'role.tcL1' },
  { value: 'TC.L2', translationKey: 'role.tcL2' },
  { value: 'TC.L3', translationKey: 'role.tcL3' },
  { value: 'Hall Asist', translationKey: 'role.hallAssist' },
  { value: 'Infeeder', translationKey: 'role.infeeder' },
  { value: 'Sr.Infeeder', translationKey: 'role.seniorInfeeder' },
  { value: 'Ops.L1', translationKey: 'role.opsL1' },
];

export const ID_STATUS_OPTIONS = [
  { value: 'Direct', translationKey: 'id.direct' },
  { value: 'Indirect', translationKey: 'id.indirect' },
] as const;

export const WORK_STATUS_OPTIONS: Array<{ value: WorkStatus; translationKey: string }> = [
  { value: 'Prod.', translationKey: 'workStatus.production' },
  { value: 'Jail', translationKey: 'workStatus.jail' },
  { value: 'DailyProduction', translationKey: 'workStatus.dailyProduction' },
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