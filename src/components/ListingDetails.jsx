import React, { useState } from 'react';
import Icon from './Icon.jsx';
import ListingImage from './ListingImage.jsx';
import Modal from './Modal.jsx';
import { StatusBadge } from './ListingCard.jsx';
import { formatPrice, isOwned, isSold, label, mailtoHref } from '../lib/listings.js';

function Gallery({ item }) {
  const images = item.photos || [];
  const [index, setIndex] = useState(0);
  const count = images.length;
  const go = (next) => setIndex((next + count) % count);

  function handleKeyDown(event) {
    if (count < 2) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
  }

  return (
    <div className="gallery" role="group" aria-label="Item photos" onKeyDown={handleKeyDown}>
      <div className={`gallery-main ${isSold(item) ? 'is-sold' : ''}`}>
        <ListingImage src={images[index]} alt={`${item.title}, photo ${index + 1} of ${Math.max(count, 1)}`} emoji={item.emoji} fit="contain" />
        {count > 1 && (
          <>
            <button type="button" className="gallery-arrow is-prev" aria-label="Previous photo" onClick={() => go(index - 1)}><Icon name="chevronLeft" size={22} /></button>
            <button type="button" className="gallery-arrow is-next" aria-label="Next photo" onClick={() => go(index + 1)}><Icon name="chevronRight" size={22} /></button>
            <span className="gallery-count" aria-live="polite">{index + 1} / {count}</span>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="gallery-thumbs">
          {images.map((src, i) => (
            <button
              type="button"
              key={src + i}
              className={`thumb ${i === index ? 'is-on' : ''}`}
              aria-label={`Show photo ${i + 1} of ${count}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
            >
              <ListingImage src={src} alt="" emoji={item.emoji} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListingDetails({ item, onClose, onEdit, onSetStatus, onDelete, onBrowseCategory }) {
  const [error, setError] = useState('');
  const own = isOwned(item);
  const sold = isSold(item);

  function changeStatus() {
    const result = onSetStatus(item.id, sold ? 'active' : 'sold');
    if (!result.ok) setError(result.error);
  }

  let actions;
  if (own) {
    actions = (
      <>
        <p className="detail-note"><Icon name="check" size={16} /> This is your listing. {sold ? 'Buyers see it as sold.' : 'Buyers can contact you by email.'}</p>
        <div className="detail-buttons">
          <button type="button" className="btn btn-primary" onClick={() => onEdit(item.id)}><Icon name="edit" /> Edit listing</button>
          <button type="button" className="btn btn-ghost btn-status" onClick={changeStatus}>
            <Icon name="refresh" /> {sold ? 'Mark as active' : 'Mark as sold'}
          </button>
          <button type="button" className="btn btn-danger-ghost" onClick={() => onDelete(item.id)}><Icon name="trash" /> Delete listing</button>
        </div>
      </>
    );
  } else if (sold) {
    actions = (
      <>
        <p className="detail-note is-sold"><Icon name="ban" size={16} /> This item has been sold and is no longer available.</p>
        <div className="detail-buttons">
          <button type="button" className="btn btn-ghost" onClick={() => onBrowseCategory(item.category)}>See other {label(item.category).toLowerCase()}</button>
        </div>
      </>
    );
  } else {
    actions = (
      <>
        <div className="detail-buttons">
          <a className="btn btn-primary" href={mailtoHref(item)}><Icon name="mail" /> Contact seller</a>
        </div>
        <p className="detail-hint">Opens your email app, addressed to {item.sellerEmail}.</p>
      </>
    );
  }

  return (
    <Modal title={item.title} eyebrow={`${label(item.category)} · ${label(item.condition)}`} size="lg" onClose={onClose} headingFocus>
      <div className="detail-layout">
        <Gallery key={item.id} item={item} />
        <div className="detail-info">
          <div className="detail-price-row">
            <p className="detail-price">{formatPrice(item.price)}</p>
            <StatusBadge item={item} wording={own ? 'seller' : 'buyer'} />
          </div>
          {error && <p className="form-alert" role="alert"><Icon name="alert" /> {error}</p>}
          <div className="detail-actions">{actions}</div>
          <div className="detail-section">
            <h3>Description</h3>
            <p className="detail-description">{item.description || 'The seller has not added a description.'}</p>
          </div>
          <dl className="detail-facts">
            <div><dt>Category</dt><dd>{label(item.category)}</dd></div>
            <div><dt>Condition</dt><dd>{label(item.condition)}</dd></div>
            <div className="is-wide"><dt>Pickup location</dt><dd><Icon name="pin" size={16} /> {item.pickup || 'Arrange directly with the seller'}</dd></div>
            <div className="is-wide">
              <dt>Seller</dt>
              <dd className="detail-seller">
                <span className="avatar" aria-hidden="true">{item.seller.charAt(0).toUpperCase()}</span>
                {own ? `${item.seller} (${item.sellerEmail})` : item.seller}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Modal>
  );
}
