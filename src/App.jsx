import React, { useCallback, useEffect, useRef, useState } from 'react';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import Header from './components/Header.jsx';
import Icon from './components/Icon.jsx';
import ListingDetails from './components/ListingDetails.jsx';
import ListingForm from './components/ListingForm.jsx';
import Marketplace from './components/Marketplace.jsx';
import MyListings from './components/MyListings.jsx';
import Toast from './components/Toast.jsx';
import { seedListings } from './data/seedListings.js';
import { DEFAULT_FILTERS, deleteListing, isOwned, saveListing, setListingStatus } from './lib/listings.js';
import { MARKET_HASH, MINE_HASH, SELL_HASH, editHash, isFormRoute } from './lib/routes.js';
import { STORAGE_KEY, loadListings, saveListings } from './lib/storage.js';
import { useGuardedRouter } from './lib/useGuardedRouter.js';

export default function App() {
  const [items, setItems] = useState(() => loadListings());
  const { route, navigate, replace, setDirty, pendingLeave, stayOnPage, leavePage } = useGuardedRouter();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [detailsId, setDetailsId] = useState(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [highlight, setHighlight] = useState(null); // { id, label } of the item just published or updated.
  const [toast, setToast] = useState(null);
  const [focusResults, setFocusResults] = useState(0);

  // Toast actions can run later, so they read the latest listings from here rather than a stale closure.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  // The page Cancel and a finished save return to.
  const returnHash = useRef(MARKET_HASH);
  const firstRender = useRef(true);

  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = (type, message, action) => setToast({ id: Date.now(), type, message, action });

  useEffect(() => {
    // Keep this tab in step when another tab saves, so it can't overwrite newer data.
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setItems(loadListings());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const routeKey = `${route.view}:${route.id ?? ''}`;

  useEffect(() => {
    if (!isFormRoute(route)) returnHash.current = route.view === 'mine' ? MINE_HASH : MARKET_HASH;
    setDetailsId(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (isFormRoute(route)) setToast(null); // Its Undo or View actions don't belong on a form.
    else if (!firstRender.current) document.getElementById('main')?.focus({ preventScroll: true });
    firstRender.current = false;
  }, [routeKey]);

  useEffect(() => {
    if (!focusResults) return;
    const heading = document.getElementById('results-heading');
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }, [focusResults]);

  useEffect(() => {
    if (highlight) document.getElementById(`listing-${highlight.id}`)?.scrollIntoView({ block: 'center' });
  }, [highlight]);

  // State changes only after the write succeeds, so the screen can't claim something that wasn't saved.
  function commit(nextItems) {
    const result = saveListings(nextItems);
    if (result.ok) {
      itemsRef.current = nextItems;
      setItems(nextItems);
    }
    return result;
  }

  function openSell() {
    navigate(SELL_HASH);
  }

  function openEdit(id) {
    if (!isOwned(items.find((x) => x.id === id))) {
      showToast('error', 'You can only edit your own listings.');
      return;
    }
    navigate(editHash(id));
  }

  function handleSave(values, editingId) {
    const result = saveListing(items, values, editingId);
    if (!result.ok) return result;
    const stored = commit(result.items);
    if (!stored.ok) return stored;

    const target = returnHash.current;
    if (target === MARKET_HASH) setFilters(DEFAULT_FILTERS); // Make sure no active filter hides the item.
    replace(target);
    setHighlight({ id: result.item.id, label: editingId ? 'Updated' : 'Just listed' });
    showToast(
      'success',
      editingId ? `Changes to “${result.item.title}” saved.` : `“${result.item.title}” is now live.`,
      { label: 'View listing', onClick: () => { dismissToast(); setDetailsId(result.item.id); } },
    );
    return result;
  }

  function handleSetStatus(id, status) {
    const previous = itemsRef.current.find((x) => x.id === id)?.status;
    const result = setListingStatus(itemsRef.current, id, status);
    const stored = result.ok ? commit(result.items) : result;
    if (!stored.ok) {
      if (!detailsId) showToast('error', stored.error); // An open dialog shows the error inline instead.
      return stored;
    }
    setDetailsId(null);
    showToast('success', `“${result.item.title}” marked as ${status}.`, {
      label: 'Undo',
      onClick: () => {
        const undone = setListingStatus(itemsRef.current, id, previous);
        const write = undone.ok ? commit(undone.items) : undone;
        if (write.ok) showToast('success', `Undone. “${result.item.title}” is ${previous} again.`);
        else showToast('error', write.error);
      },
    });
    return stored;
  }

  function requestDelete(id) {
    if (!isOwned(itemsRef.current.find((x) => x.id === id))) {
      showToast('error', 'You can only delete your own listings.');
      return;
    }
    setDeletingId(id);
  }

  function handleDelete(id) {
    setDeletingId(null);
    setDetailsId(null);
    const result = deleteListing(itemsRef.current, id); // Checks ownership again against the latest data.
    const stored = result.ok ? commit(result.items) : result;
    if (!stored.ok) {
      showToast('error', stored.error);
      return;
    }
    setHighlight((current) => (current?.id === id ? null : current));
    showToast('success', `“${result.item.title}” was deleted.`);
  }

  function selectCategory(category) {
    navigate(MARKET_HASH, () => {
      setFilters((f) => ({ ...f, category }));
      setDetailsId(null);
      setFocusResults((n) => n + 1);
    });
  }

  function exploreAvailable() {
    navigate(MARKET_HASH, () => {
      setFilters((f) => ({ ...f, availableOnly: true }));
      setFocusResults((n) => n + 1);
    });
  }

  function handleBrand() {
    navigate(MARKET_HASH, () => {
      setFilters(DEFAULT_FILTERS);
      setHighlight(null);
      window.scrollTo(0, 0);
    });
  }

  function handleReset() {
    setConfirmingReset(false);
    const result = commit(seedListings);
    if (!result.ok) {
      showToast('error', result.error);
      return;
    }
    setDirty(false); // This dialog already warned about losing changes, so don't ask a second time.
    setDetailsId(null);
    setFilters(DEFAULT_FILTERS);
    setHighlight(null);
    setDeletingId(null);
    navigate(MARKET_HASH);
    window.scrollTo(0, 0);
    showToast('success', 'Example items restored.');
  }

  function skipToContent(event) {
    event.preventDefault();
    document.getElementById('main')?.focus();
  }

  const myCount = items.filter(isOwned).length;
  const detailsItem = detailsId ? items.find((x) => x.id === detailsId) : null;
  const editItem = route.view === 'edit' ? items.find((x) => x.id === route.id) : null;

  function renderPage() {
    if (route.view === 'market') {
      return (
        <Marketplace
          items={items}
          filters={filters}
          onFiltersChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          onClearFilters={() => setFilters((f) => ({ ...DEFAULT_FILTERS, sort: f.sort }))}
          onOpen={setDetailsId}
          onSell={openSell}
          onExplore={exploreAvailable}
          highlight={highlight}
        />
      );
    }
    if (route.view === 'mine') {
      return (
        <MyListings
          key={highlight?.id ?? 'mine'} // A fresh mount clears the status tab, so a saved item can't be hidden.
          items={items}
          onOpen={setDetailsId}
          onEdit={openEdit}
          onSetStatus={handleSetStatus}
          onDelete={requestDelete}
          onSell={openSell}
          highlight={highlight}
        />
      );
    }
    if (route.view === 'edit' && !isOwned(editItem)) {
      // Also reached by typing an #/edit/ address for someone else's listing.
      return (
        <div className="form-page">
          <div className="empty-state">
            <span className="empty-icon"><Icon name="lock" size={28} /></span>
            <h1 className="form-unavailable">This listing can't be edited</h1>
            <p>It may have been removed, or it belongs to another seller. You can only edit your own listings.</p>
            <div className="empty-actions">
              <button type="button" className="btn btn-primary" onClick={() => navigate(MARKET_HASH)}>Back to Marketplace</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <ListingForm
        key={route.id ?? 'new'}
        item={editItem}
        onSave={handleSave}
        onCancel={() => navigate(returnHash.current)}
        onBack={() => navigate(MARKET_HASH)}
        onDirtyChange={setDirty}
      />
    );
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={skipToContent}>Skip to main content</a>
      <Header
        view={route.view}
        myCount={myCount}
        onNavigate={navigate}
        onBrand={handleBrand}
      />

      <main id="main" tabIndex={-1}>{renderPage()}</main>

      <footer className="site-footer">
        <div>
          <strong>Campus Exchange</strong>
          <p>From students, for students. All prices in EGP.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingReset(true)}>Reset demo</button>
      </footer>

      <Toast toast={toast} onDismiss={dismissToast} />

      {detailsItem && (
        <ListingDetails
          key={detailsItem.id}
          item={detailsItem}
          onClose={() => setDetailsId(null)}
          onEdit={openEdit}
          onSetStatus={handleSetStatus}
          onDelete={requestDelete}
          onBrowseCategory={selectCategory}
        />
      )}
      {confirmingReset && (
        <ConfirmDialog
          title="Reset the demo?"
          message="This removes the listings you added and any edits, then restores the original example items."
          confirmLabel="Reset demo"
          cancelLabel="Keep my changes"
          onCancel={() => setConfirmingReset(false)}
          onConfirm={handleReset}
        />
      )}
      {deletingId && (
        <ConfirmDialog
          title="Delete this listing?"
          message="This action will permanently remove the listing from your marketplace."
          confirmLabel="Delete Listing"
          cancelLabel="Cancel"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => handleDelete(deletingId)}
        />
      )}
      {pendingLeave && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="You have unsaved changes. Are you sure you want to leave this page?"
          confirmLabel="Discard Changes"
          cancelLabel="Keep Editing"
          onCancel={stayOnPage}
          onConfirm={leavePage}
        />
      )}
    </div>
  );
}
