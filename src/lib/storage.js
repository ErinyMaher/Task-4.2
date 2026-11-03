import { isValidRecord } from './listings.js';
import { seedListings } from '../data/seedListings.js';

export const STORAGE_KEY = 'acl-marketplace-v3';

// Reading window.localStorage can itself throw when site data is blocked.
function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadListings(storage = browserStorage()) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!Array.isArray(value)) return seedListings;
    return value.filter(isValidRecord).map((x) => ({
      ...x,
      photos: Array.isArray(x.photos) ? x.photos.filter((p) => typeof p === 'string') : [],
    }));
  } catch {
    return seedListings;
  }
}

// The caller applies a change only after this succeeds, so the screen never shows unsaved data as saved.
export function saveListings(items, storage = browserStorage()) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(items));
    return { ok: true };
  } catch (err) {
    const full = err?.name === 'QuotaExceededError' || err?.name === 'NS_ERROR_DOM_QUOTA_REACHED';
    return {
      ok: false,
      error: full
        ? "This browser's storage is full, so nothing was saved. Try removing a photo or using Reset demo."
        : 'This browser is blocking storage, so nothing was saved. Check your site data settings and try again.',
    };
  }
}
