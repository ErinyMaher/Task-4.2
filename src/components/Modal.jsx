import React, { useId, useLayoutEffect, useRef } from 'react';
import Icon from './Icon.jsx';

// Native <dialog> gives us the focus trap, inert background and top-layer stacking.
// This wrapper adds Escape and backdrop dismissal routed through onClose, and returns focus on unmount.
export default function Modal({ title, eyebrow, onClose, footer, size = 'md', headingFocus = false, children }) {
  const ref = useRef(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    dialog.querySelector('[data-autofocus]')?.focus();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus();
      // The opener may vanish in the same update (e.g. a card filtered out), so give focus a safe home.
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) document.getElementById('main')?.focus({ preventScroll: true });
      });
    };
  }, []);

  function handleMouseDown(event) {
    if (event.target !== ref.current) return;
    const box = ref.current.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) onClose();
  }

  function handleKeyDown(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  }

  // Escape pressed while focus is outside the dialog (e.g. tabbed to the browser UI) skips keydown above.
  function handleCancel(event) {
    event.preventDefault();
    onClose();
  }

  // Browsers may force-close a dialog on repeated Escape. Reopen it so onClose stays the only way out,
  // otherwise a form with unsaved changes could vanish without its discard prompt.
  function handleNativeClose() {
    if (ref.current && !ref.current.open) {
      ref.current.showModal();
      onClose();
    }
  }

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClose={handleNativeClose}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
    >
      <header className="modal-head">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={titleId} tabIndex={headingFocus ? -1 : undefined} data-autofocus={headingFocus ? '' : undefined}>{title}</h2>
        </div>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
      </header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-foot">{footer}</footer>}
    </dialog>
  );
}
