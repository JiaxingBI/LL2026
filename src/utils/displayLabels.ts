import type { SelectOption } from '../components/ui/CustomSelect';
import { GENDER_OPTIONS, ID_STATUS_OPTIONS, ROLE_OPTIONS, SHIFT_TEAM_VALUES, WORK_STATUS_OPTIONS } from '../constants/attendanceOptions';
import type { Employee, Role, ShiftTeam, WorkStatus } from '../types';

export type TranslateFn = (key: string) => string;

const roleTranslationKeys = Object.fromEntries(
  ROLE_OPTIONS.map(option => [option.value, option.translationKey]),
) as Record<Role, string>;

const workStatusTranslationKeys = Object.fromEntries(
  WORK_STATUS_OPTIONS.map(option => [option.value, option.translationKey]),
) as Record<WorkStatus, string>;

const errorTranslationKeys: Record<string, string> = {
  'common.sdkNotInitialized': 'common.sdkNotInitialized',
  'common.dataverseLoadFailed': 'common.dataverseLoadFailed',
  'Power Platform SDK is not initialized yet.': 'common.sdkNotInitialized',
  'Failed to load data from Dataverse': 'common.dataverseLoadFailed',
};

export function buildRoleOptions(t: TranslateFn): SelectOption[] {
  return ROLE_OPTIONS.map(option => ({ value: option.value, label: t(option.translationKey) }));
}

export function buildIdStatusOptions(t: TranslateFn): SelectOption[] {
  return ID_STATUS_OPTIONS.map(option => ({ value: option.value, label: t(option.translationKey) }));
}

export function buildWorkStatusOptions(t: TranslateFn): SelectOption[] {
  return WORK_STATUS_OPTIONS.map(option => ({ value: option.value, label: t(option.translationKey) }));
}

export function buildGenderOptions(t: TranslateFn): SelectOption[] {
  return GENDER_OPTIONS.map(option => ({ value: option.value, label: t(option.translationKey) }));
}

export function buildShiftTeamOptions(t: TranslateFn): SelectOption[] {
  return SHIFT_TEAM_VALUES.map(team => ({ value: team, label: getShiftTeamLabel(team, t) }));
}

export function getRoleLabel(role: Role, t: TranslateFn): string {
  return t(roleTranslationKeys[role]);
}

export function getIndirectDirectLabel(value: 'Direct' | 'Indirect', t: TranslateFn): string {
  return t(value === 'Direct' ? 'id.direct' : 'id.indirect');
}

export function getWorkStatusLabel(status: WorkStatus, t: TranslateFn): string {
  return t(workStatusTranslationKeys[status]);
}

export function getShiftTeamLabel(team: ShiftTeam, t: TranslateFn): string {
  return t(`filter.${team.toLowerCase()}`);
}

export function getGenderLabel(gender: 'Male' | 'Female', t: TranslateFn): string {
  return t(gender === 'Male' ? 'gender.male' : 'gender.female');
}

export function getEmployeeMetaLabel(employee: Employee, t: TranslateFn): string {
  return `${getRoleLabel(employee.role, t)} · ${getIndirectDirectLabel(employee.indirectDirect, t)}`;
}

export function getAssemblyLineDisplayName(lineId: string, lineName: string, t: TranslateFn): string {
  const normalized = lineName.trim();
  const defaultPrefix = `${lineId} - Assembly Line`;
  const compactPrefix = `${lineId}-Assembly Line`;

  if (normalized.startsWith(defaultPrefix) || normalized.startsWith(compactPrefix)) {
    return `${t('labor.line')} ${lineId}`;
  }

  return normalized.replace(`${lineId}-`, '').replace(`${lineId} - `, '');
}

export function translateKnownErrorMessage(message: string, t: TranslateFn): string {
  const translationKey = errorTranslationKeys[message];
  return translationKey ? t(translationKey) : message;
}