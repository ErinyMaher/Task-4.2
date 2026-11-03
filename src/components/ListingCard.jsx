import React from 'react';
import Icon from './Icon.jsx';
import ListingImage from './ListingImage.jsx';
import { formatPrice, isOwned, isSold, label } from '../lib/listings.js';

export function StatusBadge({ item, wording = 'buyer' }) {
  const sold = isSold(item);
  const text = sold ? 'Sold' : wording === 'seller' ? 'Active' : 'Available';
  return (
    <span className={`status-badge ${sold ? 'is-sold' : 'is-active'}`}>
      <Icon name={sold ? 'ban' : 'check'} size={14} />
      {text}
    </span>
  );
}

export default function ListingCard({ item, highlightLabel, onOpen }) {
  const highlighted = !!highlightLabel;
  const sold = isSold(item);
  const own = isOwned(item);
  return (
    <article id={`listing-${item.id}`} className={`card ${sold ? 'is-sold' : ''} ${highlighted ? 'is-highlighted' : ''}`}>
      <div className="card-media">
        <ListingImage src={item.photos?.[0]} alt={item.title} emoji={item.emoji} />
        {sold && <span className="sold-band" aria-hidden="true">Sold</span>}
        <div className="card-badges">
          <StatusBadge item={item} />
          {highlighted ? <span className="pill pill-accent">{highlightLabel}</span> : own && <span className="pill pill-accent">Yours</span>}
        </div>
      </div>
      <div className="card-body">
        <p className="card-price">{formatPrice(item.price)}</p>
        <h3 className="card-title">
          <button type="button" className="card-open" onClick={() => onOpen(item.id)}>
            {item.title}<span className="sr-only">, view details</span>
          </button>
        </h3>
        <p className="card-meta">
          <span>{label(item.category)}</span>
          <span className="pill">{label(item.condition)}</span>
        </p>
        {sold && <p className="card-note">No longer available</p>}
      </div>
    </article>
  );
}
