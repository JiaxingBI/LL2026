import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  standalone?: boolean;
  className?: string;
  style?: React.CSSProperties;
  minWidth?: number | string;
  minDate?: string;
  maxDate?: string;
}

interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

function parseIsoDate(value: string): ParsedDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(year, month - 1 + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

function compareIsoDate(left: string, right: string): number {
  return left.localeCompare(right);
}

export default function CustomDatePicker({
  value,
  onChange,
  compact = false,
  standalone = false,
  className = '',
  style,
  minWidth,
  minDate,
  maxDate,
}: CustomDatePickerProps) {
  const { language, t } = useLanguage();
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseIsoDate(value);
  const today = new Date();
  const todayIso = formatIsoDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const initialMonth = selectedDate?.month ?? today.getMonth() + 1;
  const initialYear = selectedDate?.year ?? today.getFullYear();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!selectedDate) return;
    setViewYear(selectedDate.year);
    setViewMonth(selectedDate.month);
  }, [selectedDate?.year, selectedDate?.month]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const resolvedMinWidth = typeof minWidth === 'number'
        ? Math.max(rect.width, minWidth)
        : minWidth ?? Math.max(rect.width, compact ? 280 : 320);

      setPopoverStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: resolvedMinWidth,
        maxWidth: 'min(360px, calc(100vw - 16px))',
        zIndex: 20000,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [compact, minWidth, open]);

  const weekdayLabels = useMemo(() => {
    const base = new Date(Date.UTC(2024, 0, 1));
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(base);
      day.setUTCDate(base.getUTCDate() + index);
      return new Intl.DateTimeFormat(locale, { weekday: compact ? 'narrow' : 'short' }).format(day);
    });
  }, [compact, locale]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth - 1, 1)),
    [locale, viewMonth, viewYear],
  );

  const displayValue = useMemo(() => {
    if (!selectedDate) return '';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: compact ? 'numeric' : 'short',
      day: 'numeric',
    }).format(new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day));
  }, [compact, locale, selectedDate]);

  const prevMonthDisabled = useMemo(() => {
    if (!minDate) return false;
    const prev = shiftMonth(viewYear, viewMonth, -1);
    const prevMonthEnd = formatIsoDate(prev.year, prev.month, daysInMonth(prev.year, prev.month));
    return compareIsoDate(prevMonthEnd, minDate) < 0;
  }, [minDate, viewMonth, viewYear]);

  const nextMonthDisabled = useMemo(() => {
    if (!maxDate) return false;
    const next = shiftMonth(viewYear, viewMonth, 1);
    const nextMonthStart = formatIsoDate(next.year, next.month, 1);
    return compareIsoDate(nextMonthStart, maxDate) > 0;
  }, [maxDate, viewMonth, viewYear]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const currentMonthDays = daysInMonth(viewYear, viewMonth);
    const previous = shiftMonth(viewYear, viewMonth, -1);
    const previousMonthDays = daysInMonth(previous.year, previous.month);
    const days: Array<{ iso: string; label: number; outside: boolean; disabled: boolean }> = [];

    for (let index = 0; index < 42; index += 1) {
      const dayOffset = index - firstWeekday + 1;
      let year = viewYear;
      let month = viewMonth;
      let day = dayOffset;
      let outside = false;

      if (dayOffset <= 0) {
        outside = true;
        year = previous.year;
        month = previous.month;
        day = previousMonthDays + dayOffset;
      } else if (dayOffset > currentMonthDays) {
        outside = true;
        const next = shiftMonth(viewYear, viewMonth, 1);
        year = next.year;
        month = next.month;
        day = dayOffset - currentMonthDays;
      }

      const iso = formatIsoDate(year, month, day);
      const disabled = Boolean((minDate && compareIsoDate(iso, minDate) < 0) || (maxDate && compareIsoDate(iso, maxDate) > 0));
      days.push({ iso, label: day, outside, disabled });
    }

    return days;
  }, [maxDate, minDate, viewMonth, viewYear]);

  const triggerPadding = compact ? '4px 8px' : standalone ? '10px 12px' : '8px 10px';
  const fontSize = compact ? '12px' : '14px';
  const radius = compact ? '6px' : '12px';
  return (
    <div
      ref={ref}
      className={`custom-date-picker ${className}`}
      style={{ position: 'relative', display: 'inline-flex', width: compact ? '100%' : undefined, ...style }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`cdp-trigger ${open ? 'cdp-open' : ''} ${standalone ? 'cdp-standalone' : ''} ${compact ? 'cdp-compact' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: compact ? '6px' : '10px',
          padding: triggerPadding,
          borderRadius: radius,
          fontSize,
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? '6px' : '8px', minWidth: 0 }}>
          <CalendarDays size={compact ? 12 : 16} />
          <span className="cdp-trigger-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayValue}
          </span>
        </span>
        <ChevronDown size={compact ? 10 : 14} style={{ flexShrink: 0, transition: 'transform 0.15s ease', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          className="cdp-popover"
          role="dialog"
          aria-modal="false"
          style={popoverStyle}
        >
          <div className="cdp-header">
            <button
              type="button"
              className="cdp-nav"
              onClick={() => {
                const prev = shiftMonth(viewYear, viewMonth, -1);
                setViewYear(prev.year);
                setViewMonth(prev.month);
              }}
              disabled={prevMonthDisabled}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="cdp-month-label">{monthLabel}</div>
            <button
              type="button"
              className="cdp-nav"
              onClick={() => {
                const next = shiftMonth(viewYear, viewMonth, 1);
                setViewYear(next.year);
                setViewMonth(next.month);
              }}
              disabled={nextMonthDisabled}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="cdp-weekdays">
            {weekdayLabels.map((label) => (
              <div key={label} className="cdp-weekday">{label}</div>
            ))}
          </div>

          <div className="cdp-grid">
            {calendarDays.map((day) => {
              const active = day.iso === value;
              const isToday = day.iso === todayIso;
              return (
                <button
                  key={day.iso}
                  type="button"
                  className={`cdp-day ${day.outside ? 'cdp-outside' : ''} ${active ? 'cdp-active' : ''} ${isToday ? 'cdp-today' : ''}`}
                  disabled={day.disabled}
                  onClick={() => {
                    onChange(day.iso);
                    setOpen(false);
                  }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>

          <div className="cdp-footer">
            <button
              type="button"
              className="cdp-today-button"
              disabled={Boolean((minDate && compareIsoDate(todayIso, minDate) < 0) || (maxDate && compareIsoDate(todayIso, maxDate) > 0))}
              onClick={() => {
                onChange(todayIso);
                const parsedToday = parseIsoDate(todayIso);
                if (parsedToday) {
                  setViewYear(parsedToday.year);
                  setViewMonth(parsedToday.month);
                }
                setOpen(false);
              }}
            >
              {t('attendance.today')}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}