import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let _setToasts: React.Dispatch<React.SetStateAction<ToastMessage[]>> | null = null;

/** Show a toast from anywhere in the app (no context needed). */
export function showToast(message: string, type: ToastType = 'success') {
  if (!_setToasts) return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  _setToasts(prev => [...prev, { id, message, type }]);
  setTimeout(() => {
    _setToasts?.(prev => prev.filter(t => t.id !== id));
  }, 3500);
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} color="#34c759" />,
  error:   <AlertTriangle size={18} color="#ff3b30" />,
  info:    <CheckCircle size={18} color="#0071e3" />,
};

const BG: Record<ToastType, string> = {
  success: '#f0fdf4',
  error:   '#fff0f0',
  info:    '#eff6ff',
};

const BORDER: Record<ToastType, string> = {
  success: '#bbf7d0',
  error:   '#fca5a5',
  info:    '#bfdbfe',
};

function ToastItem({ item, onDismiss }: { item: ToastMessage; onDismiss: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="toast"
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: BG[item.type],
        border: `1px solid ${BORDER[item.type]}`,
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-md)',
        minWidth: 240,
        maxWidth: 400,
        fontSize: 14,
        color: 'var(--text-primary)',
      }}
    >
      {ICONS[item.type]}
      <span style={{ flex: 1 }}>{item.message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          color: 'var(--text-secondary)',
        }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/** Mount this once at the App root. */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  _setToasts = setToasts;

  return (
    <div
      style={{
        position: 'fixed',
        top: 72,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem
            item={t}
            onDismiss={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          />
        </div>
      ))}
    </div>
  );
}
