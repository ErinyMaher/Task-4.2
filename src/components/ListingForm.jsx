import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import ListingImage from './ListingImage.jsx';
import {
  CATEGORIES, CONDITIONS, CONDITION_HINTS, CURRENT_USER, DESCRIPTION_MAX, IMAGE_MAX_MB, IMAGE_TYPES, MAX_PHOTOS, TITLE_MAX, label, validateListing,
} from '../lib/listings.js';
import { compressImage } from '../lib/photos.js';
import { MARKET_HASH } from '../lib/routes.js';

const FIELD_ORDER = ['title', 'category', 'condition', 'price', 'description', 'photos', 'status'];

function initialValues(item) {
  if (!item) return { title: '', price: '', category: '', condition: '', description: '', pickup: '', status: 'active', photos: [] };
  return {
    title: item.title,
    price: String(item.price),
    category: item.category,
    condition: item.condition,
    description: item.description || '',
    pickup: item.pickup || '',
    status: item.status,
    photos: item.photos || [],
  };
}

function FieldMessage({ id, error, hint }) {
  if (error) return <p className="field-error" id={id}><Icon name="alert" size={15} /> {error}</p>;
  return hint ? <p className="field-hint" id={id}>{hint}</p> : null;
}

const Required = () => <span className="required"> <span aria-hidden="true">*</span><span className="sr-only">(required)</span></span>;

function Section({ id, title, children }) {
  return (
    <section className="form-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

export default function ListingForm({ item, onSave, onCancel, onBack, onDirtyChange }) {
  const editing = !!item;
  // Fixed when the page opens: edits are always compared with what was there at the start.
  const [initial] = useState(() => initialValues(item));
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState({});
  const [saveError, setSaveError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoStatus, setPhotoStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const formRef = useRef(null);

  const errors = validateListing(values);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const shown = (field) => (touched[field] ? errors[field] : undefined);

  useEffect(() => {
    formRef.current.querySelector('[name="title"]')?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  // Reloading, closing the tab or going to another site can only use the browser's own prompt.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    setSaveError('');
  };
  const touch = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const aria = (field) => ({
    id: `field-${field}`,
    'aria-invalid': shown(field) ? true : undefined,
    'aria-describedby': `field-${field}-msg`,
    onBlur: touch(field),
  });

  async function addPhotos(event) {
    const files = Array.from(event.target.files);
    event.target.value = ''; // Lets the same file be chosen again after removing it.
    if (!files.length) return;
    setPhotoError('');
    setPhotoStatus('');
    const room = MAX_PHOTOS - values.photos.length;
    setProcessing(true);
    const results = await Promise.allSettled(files.slice(0, room).map(compressImage));
    const added = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const problems = results.filter((r) => r.status === 'rejected').map((r) => r.reason.message);
    if (files.length > room) problems.push(`You can have up to ${MAX_PHOTOS} photos, so ${files.length - room} ${files.length - room === 1 ? 'was' : 'were'} not added.`);
    setPhotoError(problems.join(' '));
    if (added.length) setPhotoStatus(`${added.length} ${added.length === 1 ? 'photo' : 'photos'} added.`);
    setValues((v) => ({ ...v, photos: [...v.photos, ...added].slice(0, MAX_PHOTOS) }));
    setProcessing(false);
  }

  function removePhoto(index) {
    setValues((v) => ({ ...v, photos: v.photos.filter((_, i) => i !== index) }));
    setTouched((t) => ({ ...t, photos: true })); // Removing the last photo should explain the requirement now.
    setPhotoError('');
    setPhotoStatus(`Photo ${index + 1} removed.`);
  }

  // The first photo is the primary one: it shows on cards and opens the gallery.
  function makePrimary(index) {
    setValues((v) => ({ ...v, photos: [v.photos[index], ...v.photos.filter((_, i) => i !== index)] }));
    setPhotoStatus(`Photo ${index + 1} is now the primary photo.`);
  }

  function submit(event) {
    event.preventDefault();
    if (processing) return;
    setTouched(Object.fromEntries(FIELD_ORDER.map((f) => [f, true])));
    const firstInvalid = FIELD_ORDER.find((f) => errors[f]);
    if (firstInvalid) {
      setSaveError('');
      formRef.current.querySelector(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    const result = onSave(values, item?.id ?? null);
    if (!result.ok) setSaveError(result.error);
  }

  function handleBack(event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    onBack();
  }

  const errorCount = FIELD_ORDER.filter((f) => shown(f)).length;

  return (
    <div className="form-page">
      <a className="back-link" href={MARKET_HASH} onClick={handleBack}><Icon name="chevronLeft" size={16} /> Back to Marketplace</a>
      <div className="form-page-head">
        <p className="eyebrow">{editing ? item.title : 'Publish in about a minute'}</p>
        <h1>{editing ? 'Edit your listing' : 'Sell an item'}</h1>
        <p className="form-legend">Fields marked <span className="required">*</span> are required.</p>
      </div>

      <form ref={formRef} onSubmit={submit} noValidate>
        <Section id="section-item" title="Item Information">
          <div className="field">
            <label htmlFor="field-title">Item title<Required /></label>
            <input {...aria('title')} name="title" type="text" aria-required="true" maxLength={TITLE_MAX} value={values.title} onChange={set('title')} placeholder="e.g. Physics 101 textbook, 3rd edition" />
            <FieldMessage id="field-title-msg" error={shown('title')} hint={`${values.title.length}/${TITLE_MAX} characters. Include the brand or course code if there is one.`} />
          </div>
          <div className="field">
            <label htmlFor="field-category">Category<Required /></label>
            <select {...aria('category')} name="category" aria-required="true" value={values.category} onChange={set('category')}>
              <option value="">Choose a category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
            <FieldMessage id="field-category-msg" error={shown('category')} />
          </div>
          <div className="field" role="radiogroup" aria-labelledby="condition-label" aria-required="true" aria-describedby="field-condition-msg" aria-invalid={shown('condition') ? true : undefined}>
            <span className="field-label" id="condition-label">Condition<Required /></span>
            <div className="option-grid">
              {CONDITIONS.map((c) => (
                <label key={c} className={`option ${values.condition === c ? 'is-on' : ''}`}>
                  <input type="radio" name="condition" value={c} checked={values.condition === c} onChange={set('condition')} onBlur={touch('condition')} />
                  <span className="option-title">{label(c)}</span>
                  <span className="option-hint">{CONDITION_HINTS[c]}</span>
                </label>
              ))}
            </div>
            <FieldMessage id="field-condition-msg" error={shown('condition')} />
          </div>
        </Section>

        <Section id="section-pricing" title="Pricing">
          <div className="field">
            <label htmlFor="field-price">Price (EGP)<Required /></label>
            <div className="input-affix">
              <span aria-hidden="true">EGP</span>
              <input {...aria('price')} name="price" type="number" inputMode="decimal" min="0" step="0.01" aria-required="true" value={values.price} onChange={set('price')} placeholder="250" />
            </div>
            <FieldMessage id="field-price-msg" error={shown('price')} hint="Enter 0 to give it away for free." />
          </div>
        </Section>

        <Section id="section-description" title="Description">
          <div className="field">
            <label htmlFor="field-description">Description</label>
            <textarea {...aria('description')} name="description" rows={4} maxLength={DESCRIPTION_MAX} value={values.description} onChange={set('description')} placeholder="What's included, any marks or faults, and why you're selling." />
            <FieldMessage id="field-description-msg" error={shown('description')} hint={`${values.description.length}/${DESCRIPTION_MAX} characters`} />
          </div>
          <div className="field">
            <label htmlFor="field-pickup">Pickup / meetup location</label>
            <input id="field-pickup" name="pickup" type="text" aria-describedby="field-pickup-msg" maxLength={120} value={values.pickup} onChange={set('pickup')} placeholder="e.g. Library entrance, weekdays after 1 PM" />
            <FieldMessage id="field-pickup-msg" hint="Choose somewhere public on campus." />
          </div>
        </Section>

        <Section id="section-photos" title={<>Item Photos<Required /></>}>
          <div className="field" role="group" aria-labelledby="section-photos" aria-describedby="photo-msg" aria-invalid={shown('photos') || photoError ? true : undefined}>
            <div className="photo-row">
              {values.photos.map((src, index) => (
                <div className="photo-tile" key={src + index}>
                  <ListingImage src={src} alt={`Photo ${index + 1}`} emoji={item?.emoji} />
                  {index === 0 ? (
                    <span className="photo-cover">Primary</span>
                  ) : (
                    <button type="button" className="photo-primary" aria-label={`Make photo ${index + 1} the primary photo`} title="Make primary" onClick={() => makePrimary(index)}><Icon name="star" size={14} /></button>
                  )}
                  <button type="button" className="photo-remove" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(index)}><Icon name="close" size={14} /></button>
                </div>
              ))}
              {values.photos.length < MAX_PHOTOS && (
                <label className={`photo-add ${processing ? 'is-busy' : ''}`}>
                  <input className="sr-only" name="photos" type="file" accept={IMAGE_TYPES.join(',')} multiple disabled={processing} onChange={addPhotos} onBlur={touch('photos')} aria-describedby="photo-msg" />
                  <Icon name="camera" size={22} />
                  <span>{processing ? 'Preparing…' : 'Add photos'}</span>
                </label>
              )}
            </div>
            <FieldMessage id="photo-msg" error={photoError || shown('photos')} hint={`At least 1, up to ${MAX_PHOTOS}. JPEG, PNG or WebP, up to ${IMAGE_MAX_MB} MB each. Large photos are resized and stored in this browser only.`} />
            <p className="sr-only" role="status">{photoStatus}</p>
            {photoStatus && <p className="photo-status" aria-hidden="true"><Icon name="check" size={15} /> {photoStatus}</p>}
          </div>
        </Section>

        {editing && (
          <Section id="section-status" title="Status">
            <div className="field" role="radiogroup" aria-labelledby="section-status" aria-describedby="field-status-msg">
              <div className="option-grid is-two">
                {[['active', 'Active', 'Buyers can contact you'], ['sold', 'Sold', 'Shown as no longer available']].map(([value, title, hint]) => (
                  <label key={value} className={`option ${values.status === value ? 'is-on' : ''}`}>
                    <input type="radio" name="status" value={value} checked={values.status === value} onChange={set('status')} />
                    <span className="option-title">{title}</span>
                    <span className="option-hint">{hint}</span>
                  </label>
                ))}
              </div>
              <FieldMessage id="field-status-msg" error={shown('status')} />
            </div>
          </Section>
        )}

        <Section id="section-seller" title="Seller Information">
          <div className="field">
            <label htmlFor="field-email">Seller contact email</label>
            <div className="input-affix is-readonly">
              <span aria-hidden="true"><Icon name="lock" size={16} /></span>
              <input id="field-email" type="email" value={CURRENT_USER.email} readOnly aria-readonly="true" aria-describedby="field-email-msg" />
            </div>
            <FieldMessage id="field-email-msg" hint="Filled in from your account so buyers can reach you." />
          </div>
        </Section>

        {saveError && <p className="form-alert" role="alert"><Icon name="alert" /> {saveError}</p>}

        <div className="form-actions">
          {errorCount > 0 && <p className="foot-status"><Icon name="alert" size={16} /> {errorCount === 1 ? '1 field needs' : `${errorCount} fields need`} attention</p>}
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={processing}>
            {processing ? 'Preparing photos…' : editing ? 'Save Changes' : 'Publish Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
