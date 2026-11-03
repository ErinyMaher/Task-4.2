import React from 'react';
import Icon from './Icon.jsx';
import { CURRENT_USER } from '../lib/listings.js';
import { MARKET_HASH, MINE_HASH } from '../lib/routes.js';

export default function Header({ view, myCount, onNavigate, onBrand }) {
  // Links stay real links for opening in a new tab; a plain click goes through the unsaved-changes check.
  const follow = (action) => (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    action();
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand" href={MARKET_HASH} onClick={follow(onBrand)} aria-label="Campus Exchange, back to all listings">
          <span className="brand-mark" aria-hidden="true"><Icon name="tag" size={18} /></span>
          <span>Campus<em>Exchange</em></span>
        </a>
        <nav className="site-nav" aria-label="Main">
          <a className={`nav-link ${view === 'market' ? 'is-current' : ''}`} href={MARKET_HASH} aria-current={view === 'market' ? 'page' : undefined} onClick={follow(() => onNavigate(MARKET_HASH, () => window.scrollTo(0, 0)))}>
            <Icon name="grid" />
            <span>Browse</span>
          </a>
          <a className={`nav-link ${view === 'mine' ? 'is-current' : ''}`} href={MINE_HASH} aria-current={view === 'mine' ? 'page' : undefined} onClick={follow(() => onNavigate(MINE_HASH))}>
            <Icon name="list" />
            <span>My listings</span>
            <span className="nav-count"><span className="sr-only">, </span>{myCount}</span>
          </a>
        </nav>
        <span className="account" title={`Signed in as ${CURRENT_USER.email}`}>
          <span className="avatar" aria-hidden="true">Y</span>
          <span className="sr-only">Signed in as</span> {CURRENT_USER.name}
        </span>
      </div>
    </header>
  );
}
