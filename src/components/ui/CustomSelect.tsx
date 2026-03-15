import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Compact mode for inline table cells */
  compact?: boolean;
  /** Standalone mode with full border (toolbar/form selects) */
  standalone?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Min width of the dropdown panel */
  minWidth?: number | string;
  renderValue?: (option?: SelectOption) => React.ReactNode;
  renderOption?: (option: SelectOption, active: boolean) => React.ReactNode;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  compact = false,
  standalone = false,
  className = '',
  style,
  minWidth,
  renderValue,
  renderOption,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = options.find(o => o.value === value)?.label ?? value;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const resolvedMinWidth = typeof minWidth === 'number'
        ? Math.max(rect.width, minWidth)
        : minWidth ?? rect.width;

      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: resolvedMinWidth,
        maxWidth: 'min(360px, calc(100vw - 16px))',
        maxHeight: '220px',
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
  }, [open, minWidth]);

  // Scroll active option into view
  useEffect(() => {
    if (open && listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]');
      if (active) active.scrollIntoView({ block: 'nearest' });
    }
  }, [open]);

  // Keyboard navigation
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (!open) { setOpen(true); e.preventDefault(); return; }
    }
    if (!open) return;
    const idx = options.findIndex(o => o.value === value);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(idx + 1, options.length - 1);
      onChange(options[next].value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(idx - 1, 0);
      onChange(options[prev].value);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setOpen(false);
    }
  }, [open, value, options, onChange]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  // Size classes
  const triggerPadding = compact ? '4px 6px' : standalone ? '8px 12px' : '4px 8px';
  const fontSize = compact ? '12px' : '14px';
  const iconSize = compact ? 10 : 14;
  const dropdownPad = compact ? '3px' : '4px';
  const itemPad = compact ? '6px 8px' : '8px 12px';
  const itemFont = compact ? '12px' : '13px';
  const radius = compact ? '4px' : '8px';

  return (
    <div
      ref={ref}
      className={`custom-select ${className}`}
      style={{ position: 'relative', display: 'inline-flex', ...style }}
      onKeyDown={onKeyDown}
    >
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        className={`cs-trigger ${open ? 'cs-open' : ''} ${standalone ? 'cs-standalone' : ''} ${compact ? 'cs-compact' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? '3px' : '6px',
          padding: triggerPadding,
          fontSize,
          borderRadius: radius,
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          width: '100%',
          justifyContent: 'space-between',
          minWidth: 0,
        }}
      >
        <span className="cs-trigger-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {renderValue ? renderValue(selectedOption) : selectedLabel}
        </span>
        <ChevronDown
          size={iconSize}
          style={{
            flexShrink: 0,
            transition: 'transform 0.15s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="cs-dropdown"
          role="listbox"
          style={{
            ...dropdownStyle,
            padding: dropdownPad,
            borderRadius: compact ? '6px' : '10px',
            overflowY: 'auto',
          }}
        >
          <div ref={listRef}>
            {options.map(opt => {
              const active = opt.value === value;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={active}
                  data-active={active}
                  className={`cs-option ${active ? 'cs-active' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    padding: itemPad,
                    fontSize: itemFont,
                    borderRadius: compact ? '4px' : '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  {renderOption ? (
                    renderOption(opt, active)
                  ) : (
                    <>
                      <span style={{ fontWeight: active ? 600 : 500 }}>{opt.label}</span>
                      {active ? <span className="cs-option-check">✓</span> : null}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
