import React, { useState } from 'react';
import Icon from './Icon.jsx';
import ListingImage from './ListingImage.jsx';
import { StatusBadge } from './ListingCard.jsx';
import { CURRENT_USER, formatPrice, isOwned, isSold, label } from '../lib/listings.js';

const TABS = [['all', 'All'], ['active', 'Active'], ['sold', 'Sold']];

export default function MyListings({ items, onOpen, onEdit, onSetStatus, onDelete, onSell, highlight }) {
  const [tab, setTab] = useState('all');
  const mine = items.filter(isOwned);
  const counts = { all: mine.length, active: mine.filter((x) => !isSold(x)).length, sold: mine.filter(isSold).length };
  const shown = tab === 'all' ? mine : mine.filter((x) => x.status === tab);

  return (
    <section className="mine">
      <div className="mine-head">
        <div>
          <p className="eyebrow">Signed in as {CURRENT_USER.name} · {CURRENT_USER.email}</p>
          <h1>My listings</h1>
          <p className="mine-lead">{counts.active} active and {counts.sold} sold. Only you can edit these.</p>
        </div>
        <button type="button" className="btn btn-primary sell-action" onClick={onSell}><Icon name="plus" /> Sell an item</button>
      </div>

      <div className="chips" role="group" aria-label="Filter my listings by status">
        {TABS.map(([value, text]) => (
          <button key={value} type="button" className={`chip ${tab === value ? 'is-on' : ''}`} aria-pressed={tab === value} onClick={() => setTab(value)}>
            {text}<span className="chip-count">{counts[value]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><Icon name="tag" size={28} /></span>
          {mine.length === 0 ? (
            <>
              <h2>You haven't listed anything yet</h2>
              <p>Turn the things you no longer need into cash from students nearby.</p>
              <div className="empty-actions"><button type="button" className="btn btn-primary" onClick={onSell}>Sell your first item</button></div>
            </>
          ) : (
            <>
              <h2>No {tab} listings</h2>
              <p>{tab === 'sold' ? 'Items you mark as sold will show up here.' : 'All of your items are marked as sold. Publish something new?'}</p>
              <div className="empty-actions"><button type="button" className="btn btn-ghost" onClick={() => setTab('all')}>Show all my listings</button></div>
            </>
          )}
        </div>
      ) : (
        <ul className="mine-list">
          {shown.map((item) => {
            const sold = isSold(item);
            return (
              <li key={item.id} id={`listing-${item.id}`} className={`mine-row ${sold ? 'is-sold' : ''} ${highlight?.id === item.id ? 'is-highlighted' : ''}`}>
                <div className="mine-thumb"><ListingImage src={item.photos?.[0]} alt="" emoji={item.emoji} /></div>
                <div className="mine-info">
                  <h2 className="mine-title">{item.title}</h2>
                  <p className="mine-meta">
                    <strong>{formatPrice(item.price)}</strong>
                    <span>{label(item.category)}</span>
                    <span>{label(item.condition)}</span>
                  </p>
                  <div className="mine-status">
                    <StatusBadge item={item} wording="seller" />
                    {highlight?.id === item.id && <span className="pill pill-accent">{highlight.label}</span>}
                  </div>
                </div>
                <div className="mine-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpen(item.id)}><Icon name="eye" size={16} /> View<span className="sr-only"> {item.title}</span></button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(item.id)}><Icon name="edit" size={16} /> Edit<span className="sr-only"> {item.title}</span></button>
                  <button type="button" className="btn btn-ghost btn-sm btn-status" onClick={() => onSetStatus(item.id, sold ? 'active' : 'sold')}>
                    <Icon name="refresh" size={16} /> {sold ? 'Mark as active' : 'Mark as sold'}<span className="sr-only"> {item.title}</span>
                  </button>
                  <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => onDelete(item.id)}><Icon name="trash" size={16} /> Delete<span className="sr-only"> {item.title}</span></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
