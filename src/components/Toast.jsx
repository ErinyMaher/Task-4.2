import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

const SUCCESS_MS = 8000;

// The live region stays mounted so screen readers announce each new message.
// Success messages time out unless hovered or focused; errors stay until dismissed.
export default function Toast({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => setPaused(false), [toast?.id]);

  useEffect(() => {
    if (!toast || toast.type === 'error' || paused) return undefined;
    const timer = setTimeout(onDismiss, SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [toast, paused, onDismiss]);

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <Icon name={toast.type === 'error' ? 'alert' : 'check'} />
          <p>{toast.message}</p>
          {toast.action && (
            <button type="button" className="toast-action" onClick={toast.action.onClick}>{toast.action.label}</button>
          )}
          <button type="button" className="toast-close" aria-label="Dismiss message" onClick={onDismiss}><Icon name="close" size={16} /></button>
        </div>
      )}
    </div>
  );
}
