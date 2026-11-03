import React, { useMemo } from 'react';
import Icon from './Icon.jsx';
import ListingCard from './ListingCard.jsx';
import {
  CATEGORIES, PRICE_LIMITS, filterListings, formatPrice, hasActiveFilters, isSold, label, sortListings,
} from '../lib/listings.js';

function Hero({ items, onSell, onExplore }) {
  const available = items.filter((x) => !isSold(x));
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Student to student</p>
        <h1>Second-hand finds, right around campus.</h1>
        <p className="hero-lead">Compare prices from other students, meet up on campus, and pass on what you no longer need.</p>
        <button type="button" className="btn btn-primary sell-action" onClick={onSell}><Icon name="plus" /> Sell an item</button>
      </div>
      <button type="button" className="hero-tag" onClick={onExplore}>
        <span className="hero-tag-label">Available now</span>
        <span className="hero-tag-price">Explore Available Items</span>
        <span className="hero-tag-link">{available.length} {available.length === 1 ? 'item' : 'items'} <Icon name="chevronRight" size={16} /></span>
      </button>
    </section>
  );
}

function Filters({ filters, onChange, counts }) {
  const set = (key) => (event) => onChange({ [key]: event.target.value });
  return (
    <section className="filters" aria-label="Search and filter listings">
      <div className="filter-row">
        <div className="control control-search">
          <label htmlFor="search">Search</label>
          <div className="search-box">
            <Icon name="search" />
            <input id="search" type="search" placeholder="Try “calculus” or “headphones”" value={filters.query} onChange={set('query')} autoComplete="off" />
            {filters.query && (
              <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { onChange({ query: '' }); document.getElementById('search').focus(); }}>
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="control">
          <label htmlFor="max-price">Max budget</label>
          <select id="max-price" value={filters.maxPrice} onChange={set('maxPrice')}>
            <option value="any">Any price</option>
            {PRICE_LIMITS.map((limit) => <option key={limit} value={limit}>Up to {formatPrice(limit)}</option>)}
          </select>
        </div>
        <div className="control">
          <label htmlFor="sort">Sort by</label>
          <select id="sort" value={filters.sort} onChange={set('sort')}>
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </div>
      </div>
      <div className="filter-row filter-row-chips">
        <div className="chips" role="group" aria-label="Category">
          {['all', ...CATEGORIES].map((category) => (
            <button
              key={category}
              type="button"
              className={`chip ${filters.category === category ? 'is-on' : ''}`}
              aria-pressed={filters.category === category}
              onClick={() => onChange({ category })}
            >
              {category === 'all' ? 'All' : label(category)}
              <span className="chip-count">{counts[category] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="switch">
          <input type="checkbox" checked={filters.availableOnly} onChange={(event) => onChange({ availableOnly: event.target.checked })} />
          <span className="switch-track" aria-hidden="true" />
          Available only
        </label>
      </div>
    </section>
  );
}

function NoResults({ filters, onClear, onSell }) {
  const parts = [];
  if (filters.query.trim()) parts.push(`“${filters.query.trim()}”`);
  if (filters.category !== 'all') parts.push(`in ${label(filters.category)}`);
  if (filters.maxPrice !== 'any') parts.push(`up to ${formatPrice(filters.maxPrice)}`);
  if (filters.availableOnly) parts.push('that are available');
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name="search" size={28} /></span>
      <h3>No listings match{parts.length ? ` ${parts.join(' ')}` : ''}</h3>
      <p>Try a different word, raise your budget, or look through every category. Got one to sell? You could be the first.</p>
      <div className="empty-actions">
        <button type="button" className="btn btn-primary" onClick={onClear}>Clear search and filters</button>
        <button type="button" className="btn btn-ghost" onClick={onSell}>Sell an item</button>
      </div>
    </div>
  );
}

export default function Marketplace({ items, filters, onFiltersChange, onClearFilters, onOpen, onSell, onExplore, highlight }) {
  const results = useMemo(() => sortListings(filterListings(items, filters), filters.sort), [items, filters]);

  // Chip counts respect the other filters, so each number matches what the chip will show.
  const counts = useMemo(() => {
    const scoped = filterListings(items, { ...filters, category: 'all' });
    const tally = { all: scoped.length };
    scoped.forEach((x) => { tally[x.category] = (tally[x.category] || 0) + 1; });
    return tally;
  }, [items, filters]);

  const soldCount = results.filter(isSold).length;

  return (
    <>
      <Hero items={items} onSell={onSell} onExplore={onExplore} />
      <Filters filters={filters} onChange={onFiltersChange} counts={counts} />
      <section aria-labelledby="results-heading">
        <div className="results-bar">
          <h2 id="results-heading" tabIndex={-1}>{filters.category === 'all' ? 'All items' : label(filters.category)}</h2>
          <p className="results-count" aria-live="polite">
            {results.length === items.length ? `${results.length} ${results.length === 1 ? 'listing' : 'listings'}` : `${results.length} of ${items.length} listings`}
            {soldCount > 0 && ` · ${soldCount} sold`}
          </p>
          {hasActiveFilters(filters) && (
            <button type="button" className="link-button" onClick={onClearFilters}>Clear filters</button>
          )}
        </div>
        {results.length === 0 ? (
          <NoResults filters={filters} onClear={onClearFilters} onSell={onSell} />
        ) : (
          <div className="card-grid">
            {results.map((item) => (
              <ListingCard
                key={item.id}
                item={item}
                highlightLabel={highlight?.id === item.id ? highlight.label : undefined}
                onOpen={onOpen}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
