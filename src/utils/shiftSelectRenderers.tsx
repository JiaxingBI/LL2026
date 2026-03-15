import type { SelectOption } from '../components/ui/CustomSelect';

function getShiftParts(option: SelectOption) {
  const [dateLabel, shiftLabelFromText] = option.label.split(/\s*-\s*/);
  const isNight = /night|夜/i.test(option.value) || /night|夜/i.test(shiftLabelFromText ?? '');

  return {
    dateLabel: dateLabel ?? option.label,
    shiftLabel: shiftLabelFromText ?? option.label,
    tone: isNight ? 'night' : 'day',
  };
}

export function renderShiftSelectValue(option?: SelectOption) {
  if (!option) return null;

  const { dateLabel, shiftLabel, tone } = getShiftParts(option);

  return (
    <span className="cs-shift-value">
      <span className="cs-shift-date">{dateLabel}</span>
      <span className={`cs-shift-pill cs-shift-pill-${tone}`}>{shiftLabel}</span>
    </span>
  );
}

export function renderShiftSelectOption(option: SelectOption, active: boolean) {
  const { dateLabel, shiftLabel, tone } = getShiftParts(option);

  return (
    <span className="cs-shift-option">
      <span className="cs-shift-meta">
        <span className="cs-shift-date">{dateLabel}</span>
        <span className="cs-shift-subtitle">{tone === 'night' ? 'Night Shift' : 'Day Shift'}</span>
      </span>
      <span className="cs-shift-option-tail">
        <span className={`cs-shift-pill cs-shift-pill-${tone}`}>{shiftLabel}</span>
        {active ? <span className="cs-option-check">✓</span> : null}
      </span>
    </span>
  );
}