import { useCallback, useEffect, useRef, useState } from 'react';
import { MARKET_HASH, parseHash } from './routes.js';

const currentHash = () => window.location.hash || MARKET_HASH;

// Hash router with one checkpoint for leaving a page that has unsaved changes.
// Each history entry stores its index, so a blocked Back or Forward can be undone by the exact
// distance it moved, and repeated later if the user discards, without adding history entries.
export function useGuardedRouter() {
  const [route, setRoute] = useState(() => parseHash(currentHash()));
  const [pendingLeave, setPendingLeave] = useState(null);
  const dirty = useRef(false);
  const index = useRef(0);
  const current = useRef(currentHash());
  const historyLength = useRef(window.history.length);
  const undoingMove = useRef(false); // The next hashchange is our own undo of a blocked move.
  const leaving = useRef(false); // The next hashchange is a discarded-and-resumed move.

  const commit = useCallback((hash) => {
    current.current = hash;
    setRoute(parseHash(hash));
  }, []);

  useEffect(() => {
    const stored = window.history.state?.idx;
    if (stored == null) window.history.replaceState({ idx: 0 }, '');
    else index.current = stored;

    const onHashChange = () => {
      if (undoingMove.current) {
        undoingMove.current = false;
        return;
      }
      const hash = currentHash();
      const idx = window.history.state?.idx;
      // No stored index means one of two things: a new entry typed into the address bar (history
      // grew), or an older entry from before this page load, such as in a tab left open (it didn't).
      const typedNewEntry = idx == null && window.history.length > historyLength.current;
      historyLength.current = window.history.length;

      if (!leaving.current && dirty.current && hash !== current.current) {
        if (idx != null) {
          const delta = idx - index.current;
          undoingMove.current = true;
          setPendingLeave({ delta });
          window.history.go(-delta);
        } else if (typedNewEntry) {
          undoingMove.current = true;
          setPendingLeave({ hash });
          window.history.back();
        } else {
          // The distance moved is unknown, so put the form's address back instead of guessing.
          index.current += 1;
          window.history.pushState({ idx: index.current }, '', current.current);
          historyLength.current = window.history.length;
          setPendingLeave({ hash });
        }
        return;
      }

      leaving.current = false;
      if (idx != null) {
        index.current = idx;
      } else {
        index.current += typedNewEntry ? 1 : -1; // Older entries sit behind the ones we've numbered.
        window.history.replaceState({ idx: index.current }, '');
      }
      commit(hash);
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [commit]);

  const push = useCallback((hash) => {
    if (hash === current.current) return;
    index.current += 1;
    window.history.pushState({ idx: index.current }, '', hash);
    historyLength.current = window.history.length;
    commit(hash);
  }, [commit]);

  // `after` runs once the move really happens, so a kept form never sees its side effects.
  const navigate = useCallback((hash, after) => {
    if (dirty.current && hash !== current.current) {
      setPendingLeave({ hash, after });
      return;
    }
    push(hash);
    after?.();
  }, [push]);

  // Leaves without a prompt and without keeping this page in history. For finished saves.
  const replace = useCallback((hash) => {
    dirty.current = false;
    window.history.replaceState({ idx: index.current }, '', hash);
    commit(hash);
  }, [commit]);

  const setDirty = useCallback((value) => {
    dirty.current = value;
  }, []);

  const stayOnPage = useCallback(() => setPendingLeave(null), []);

  const leavePage = useCallback(() => {
    const pending = pendingLeave;
    setPendingLeave(null);
    dirty.current = false;
    if (!pending) return;
    if (pending.delta) {
      leaving.current = true;
      window.history.go(pending.delta);
    } else {
      push(pending.hash);
      pending.after?.();
    }
  }, [pendingLeave, push]);

  return { route, navigate, replace, setDirty, pendingLeave, stayOnPage, leavePage };
}
