// Pure marketplace rules: no React and no browser APIs, so they can be unit tested with `npm test`.

export const CATEGORIES = ['textbooks', 'electronics', 'furniture', 'clothing', 'other'];
export const CONDITIONS = ['new', 'like-new', 'used', 'worn'];
export const STATUSES = ['active', 'sold'];
export const MAX_PHOTOS = 4;
export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 1000;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_MAX_MB = 8;

// Demo account; no login backend.
export const CURRENT_USER = { id: 'you', name: 'You', email: 'you@example.com' };

export const CONDITION_HINTS = {
  new: 'Never used',
  'like-new': 'Barely used, no marks',
  used: 'Normal signs of use',
  worn: 'Visible wear, still works',
};

export const CATEGORY_EMOJI = {
  textbooks: '📚',
  electronics: '🔌',
  furniture: '🪑',
  clothing: '👕',
  other: '📦',
};

export const PRICE_LIMITS = [200, 500, 1000];

export const DEFAULT_FILTERS = {
  query: '',
  category: 'all',
  maxPrice: 'any',
  availableOnly: false,
  sort: 'featured',
};

export const label = (value) =>
  value === 'like-new' ? 'Like new' : (value || '').replace(/\b\w/g, (m) => m.toUpperCase());

export const formatPrice = (price) =>
  `EGP ${Number(price).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export const isOwned = (item) => item?.owner === CURRENT_USER.id;

export const isSold = (item) => item?.status === 'sold';

// Returns a { field: message } map; an empty map means the form is valid.
export function validateListing(form) {
  const errors = {};
  const title = String(form.title ?? '').trim();
  const price = String(form.price ?? '').trim();

  if (!title) errors.title = 'Give your item a title so buyers can find it.';
  else if (title.length > TITLE_MAX) errors.title = `Keep the title to ${TITLE_MAX} characters or fewer.`;

  if (price === '') errors.price = 'Enter a price using numbers only, for example 250.';
  else if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(price) || !Number.isFinite(Number(price))) errors.price = 'The price must be a plain number, for example 250 or 99.50.';
  else if (Number(price) < 0) errors.price = "The price can't be negative. Use 0 if it's free.";
  else if (/\.\d{3,}$/.test(price)) errors.price = 'Use at most two decimal places.';

  if (!CATEGORIES.includes(form.category)) errors.category = 'Choose the category that fits best.';
  if (!CONDITIONS.includes(form.condition)) errors.condition = 'Choose the condition of your item.';
  if (!STATUSES.includes(form.status)) errors.status = 'Choose whether the listing is active or sold.';
  if (String(form.description ?? '').length > DESCRIPTION_MAX) errors.description = `Keep the description to ${DESCRIPTION_MAX} characters or fewer.`;
  if (!Array.isArray(form.photos) || form.photos.length === 0) errors.photos = 'Add at least one photo so buyers can see the item.';
  else if (form.photos.length > MAX_PHOTOS) errors.photos = `Use at most ${MAX_PHOTOS} photos.`;

  return errors;
}

// Creates a listing, or updates one owned by the current user. Never touches any other record.
export function saveListing(items, form, editingId = null, now = Date.now()) {
  // An edit that doesn't mention photos keeps the ones already on the listing.
  const existing = editingId ? items.find((x) => x.id === editingId)?.photos : undefined;
  const photos = Array.isArray(form.photos) ? form.photos : existing;
  const fieldErrors = validateListing({ ...form, photos });
  if (Object.keys(fieldErrors).length) {
    return { ok: false, fieldErrors, error: 'Please fix the highlighted fields.' };
  }

  const fields = {
    title: form.title.trim(),
    price: Number(form.price),
    category: form.category,
    condition: form.condition,
    description: (form.description || '').trim(),
    pickup: (form.pickup || '').trim(),
  };

  if (editingId) {
    const original = items.find((x) => x.id === editingId);
    if (!original) return { ok: false, error: 'This listing no longer exists, so it could not be saved.' };
    if (!isOwned(original)) return { ok: false, error: 'You can only edit your own listings.' };
    // Spreading the original keeps its id, owner and seller; only the editable fields change.
    const item = {
      ...original,
      ...fields,
      status: form.status,
      photos,
    };
    return { ok: true, item, items: items.map((x) => (x.id === editingId ? item : x)) };
  }

  let stamp = now;
  while (items.some((x) => x.id === `m-${stamp}`)) stamp += 1;
  const item = {
    ...fields,
    id: `m-${stamp}`,
    status: 'active', // New listings always start active, whatever the form says.
    owner: CURRENT_USER.id,
    seller: CURRENT_USER.name,
    sellerEmail: CURRENT_USER.email,
    photos,
    emoji: CATEGORY_EMOJI[form.category],
  };
  return { ok: true, item, items: [item, ...items] };
}

export function setListingStatus(items, id, status) {
  if (!STATUSES.includes(status)) return { ok: false, error: 'That is not a valid status.' };
  const original = items.find((x) => x.id === id);
  if (!original) return { ok: false, error: 'This listing no longer exists.' };
  if (!isOwned(original)) return { ok: false, error: 'You can only change your own listings.' };
  const item = { ...original, status };
  return { ok: true, item, items: items.map((x) => (x.id === id ? item : x)) };
}

export function deleteListing(items, id) {
  const original = items.find((x) => x.id === id);
  if (!original) return { ok: false, error: 'This listing no longer exists.' };
  if (!isOwned(original)) return { ok: false, error: 'You can only delete your own listings.' };
  return { ok: true, item: original, items: items.filter((x) => x.id !== id) };
}

// Returns a message when a chosen file can't be used as a listing photo, or '' when it can.
export function imageFileError(file) {
  if (!IMAGE_TYPES.includes(file.type)) return `"${file.name}" isn't a supported image. Use JPEG, PNG or WebP.`;
  if (file.size > IMAGE_MAX_MB * 1024 * 1024) return `"${file.name}" is larger than ${IMAGE_MAX_MB} MB. Choose a smaller photo.`;
  return '';
}

// Every search word must appear somewhere in the listing, in any order.
export function matchesQuery(item, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = [item.title, item.category, label(item.condition), item.description, item.pickup, item.seller]
    .join(' ')
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

export function filterListings(items, { query = '', category = 'all', maxPrice = 'any', availableOnly = false }) {
  return items.filter(
    (item) =>
      (category === 'all' || item.category === category) &&
      (maxPrice === 'any' || item.price <= Number(maxPrice)) &&
      (!availableOnly || !isSold(item)) &&
      matchesQuery(item, query),
  );
}

export function sortListings(items, sort) {
  const copy = [...items];
  if (sort === 'low') copy.sort((a, b) => a.price - b.price);
  if (sort === 'high') copy.sort((a, b) => b.price - a.price);
  return copy;
}

export const hasActiveFilters = (f) =>
  f.query.trim() !== '' || f.category !== 'all' || f.maxPrice !== 'any' || f.availableOnly;

export function mailtoHref(item) {
  const subject = encodeURIComponent(`Campus Exchange: ${item.title}`);
  const body = encodeURIComponent(
    `Hi ${item.seller},\n\nI'm interested in your listing "${item.title}" (${formatPrice(item.price)}). Is it still available?\n\n`,
  );
  return `mailto:${item.sellerEmail}?subject=${subject}&body=${body}`;
}

// Guards against hand-edited or outdated localStorage entries that would break rendering.
export function isValidRecord(x) {
  return (
    !!x &&
    typeof x === 'object' &&
    typeof x.id === 'string' && x.id !== '' &&
    typeof x.title === 'string' && x.title.trim() !== '' &&
    typeof x.price === 'number' && Number.isFinite(x.price) && x.price >= 0 &&
    CATEGORIES.includes(x.category) &&
    CONDITIONS.includes(x.condition) &&
    STATUSES.includes(x.status) &&
    typeof x.owner === 'string' &&
    typeof x.seller === 'string' &&
    typeof x.sellerEmail === 'string' && x.sellerEmail !== ''
  );
}
