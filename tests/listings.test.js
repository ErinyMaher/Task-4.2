import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES, CONDITIONS, IMAGE_MAX_MB, deleteListing, filterListings, formatPrice, hasActiveFilters, DEFAULT_FILTERS, isValidRecord,
  imageFileError, mailtoHref, saveListing, setListingStatus, sortListings, validateListing,
} from '../src/lib/listings.js';
import { loadListings, saveListings, STORAGE_KEY } from '../src/lib/storage.js';
import { seedListings as seed } from '../src/data/seedListings.js';
import { editHash, isFormRoute, parseHash } from '../src/lib/routes.js';

const valid = { title: 'Lab goggles', price: '50', category: 'other', condition: 'used', description: '', pickup: '', status: 'active', photos: ['data:image/jpeg;base64,AAAA'] };
const fakeStorage = (initial = {}) => {
  const data = { ...initial };
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, data };
};

test('seed data is intact and valid', () => {
  assert.equal(seed.length, 8);
  assert.ok(seed.every(isValidRecord));
  assert.equal(seed.find((x) => x.id === 'm7').status, 'sold');
  assert.equal(seed.find((x) => x.id === 'm3').photos.length, 3);
});

test('validation accepts a complete form', () => {
  assert.deepEqual(validateListing(valid), {});
  assert.deepEqual(validateListing({ ...valid, price: '0' }), {});
  assert.deepEqual(validateListing({ ...valid, price: '99.50' }), {});
});

test('validation rejects bad fields with a message per field', () => {
  assert.ok(validateListing({ ...valid, title: '   ' }).title);
  for (const price of ['', '  ', '-1', 'abc', '1e5', '0x10', 'Infinity', 'NaN', '1.234', `1${'0'.repeat(400)}`]) {
    assert.ok(validateListing({ ...valid, price }).price, `price "${price}" should be rejected`);
  }
  assert.ok(validateListing({ ...valid, category: 'cars' }).category);
  assert.ok(validateListing({ ...valid, category: 'all' }).category);
  assert.ok(validateListing({ ...valid, condition: '' }).condition);
  assert.ok(validateListing({ ...valid, status: 'deleted' }).status);
});

test('a new listing always starts active and belongs to the current user', () => {
  const r = saveListing(seed, { ...valid, title: '  Lab goggles ', status: 'sold', owner: 'other' }, null, 1);
  assert.equal(r.ok, true);
  assert.equal(r.item.owner, 'you');
  assert.equal(r.item.sellerEmail, 'you@example.com');
  assert.equal(r.item.title, 'Lab goggles');
  assert.equal(r.item.price, 50);
  assert.equal(r.item.status, 'active');
  assert.equal(r.items[0], r.item);
  assert.equal(r.items.length, seed.length + 1);
});

test('new listing ids never collide', () => {
  const first = saveListing(seed, valid, null, 5);
  const second = saveListing(first.items, valid, null, 5);
  assert.notEqual(first.item.id, second.item.id);
});

test('invalid forms change nothing', () => {
  const r = saveListing(seed, { ...valid, price: '-5' });
  assert.equal(r.ok, false);
  assert.ok(r.fieldErrors.price);
  assert.equal(r.items, undefined);
});

test('editing keeps id, ownership and photos and leaves other records alone', () => {
  const original = seed.find((x) => x.id === 'm1');
  const r = saveListing(seed, { ...valid, photos: undefined, title: 'Renamed', price: '10', status: 'sold' }, 'm1');
  assert.equal(r.ok, true);
  assert.equal(r.item.id, 'm1');
  assert.equal(r.item.owner, 'you');
  assert.equal(r.item.status, 'sold');
  assert.deepEqual(r.item.photos, original.photos);
  assert.equal(r.items.length, seed.length);
  r.items.filter((x) => x.id !== 'm1').forEach((x) => assert.equal(x, seed.find((s) => s.id === x.id)));
  assert.equal(seed.find((x) => x.id === 'm1').title, 'Calculus II textbook');
});

test("another seller's listing can never be edited or have its status changed", () => {
  const edit = saveListing(seed, valid, 'm2');
  assert.equal(edit.ok, false);
  assert.equal(edit.items, undefined);
  const status = setListingStatus(seed, 'm2', 'sold');
  assert.equal(status.ok, false);
  assert.equal(status.items, undefined);
});

test('a listing that disappeared cannot be saved', () => {
  assert.equal(saveListing(seed, valid, 'nope').ok, false);
  assert.equal(setListingStatus(seed, 'nope', 'sold').ok, false);
});

test('status toggles on owned listings only touch that record', () => {
  const r = setListingStatus(seed, 'm1', 'sold');
  assert.equal(r.item.status, 'sold');
  assert.equal(setListingStatus(r.items, 'm1', 'active').item.status, 'active');
  assert.equal(r.items.find((x) => x.id === 'm2'), seed.find((x) => x.id === 'm2'));
  assert.equal(setListingStatus(seed, 'm1', 'gone').ok, false);
});

test('search covers multiple words, trims input and ignores case', () => {
  const ids = (q) => filterListings(seed, { query: q }).map((x) => x.id);
  assert.deepEqual(ids('  BLUETOOTH  '), ['m3']);
  assert.deepEqual(ids('headphones gate'), ['m3']);
  assert.deepEqual(ids('zzz-nothing'), []);
  assert.equal(ids('').length, seed.length);
});

test('filters combine', () => {
  assert.ok(filterListings(seed, { category: 'textbooks' }).every((x) => x.category === 'textbooks'));
  assert.ok(filterListings(seed, { maxPrice: '200' }).every((x) => x.price <= 200));
  assert.ok(!filterListings(seed, { availableOnly: true }).some((x) => x.status === 'sold'));
  assert.deepEqual(filterListings(seed, { category: 'textbooks', maxPrice: '100', availableOnly: true }), []);
  assert.equal(hasActiveFilters(DEFAULT_FILTERS), false);
  assert.equal(hasActiveFilters({ ...DEFAULT_FILTERS, query: ' a' }), true);
});

test('sorting orders by price without mutating its input', () => {
  const before = seed.map((x) => x.id);
  const low = sortListings(seed, 'low').map((x) => x.price);
  assert.deepEqual(low, [...low].sort((a, b) => a - b));
  const high = sortListings(seed, 'high').map((x) => x.price);
  assert.deepEqual(high, [...high].sort((a, b) => b - a));
  assert.deepEqual(sortListings(seed, 'featured').map((x) => x.id), before);
  assert.deepEqual(seed.map((x) => x.id), before);
});

test('formatting and contact links', () => {
  assert.equal(formatPrice(1450), 'EGP 1,450');
  assert.equal(formatPrice(99.5), 'EGP 99.5');
  const href = mailtoHref(seed.find((x) => x.id === 'm2'));
  assert.ok(href.startsWith('mailto:mariam.seller@example.com?subject='));
  assert.ok(decodeURIComponent(href).includes('Student desk lamp'));
});

test('storage round-trips and falls back on bad data', () => {
  const s = fakeStorage();
  assert.equal(loadListings(s), seed);
  assert.equal(saveListings(seed.slice(0, 2), s).ok, true);
  assert.equal(loadListings(s).length, 2);
  assert.equal(loadListings(fakeStorage({ [STORAGE_KEY]: '{not json' })), seed);
  assert.equal(loadListings(fakeStorage({ [STORAGE_KEY]: '{"a":1}' })), seed);
  assert.equal(loadListings(null), seed);
});

test('storage drops only the corrupt records', () => {
  const bad = [seed[0], { id: 'x', title: 'no price' }, { ...seed[1], price: 'free' }, { ...seed[2], status: 'gone' }, null, { ...seed[3], photos: 'nope' }];
  const loaded = loadListings(fakeStorage({ [STORAGE_KEY]: JSON.stringify(bad) }));
  assert.deepEqual(loaded.map((x) => x.id), ['m1', 'm4']);
  assert.deepEqual(loaded[1].photos, []);
});

test('failed writes are reported, never treated as saved', () => {
  const quota = { setItem() { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); } };
  const r = saveListings(seed, quota);
  assert.equal(r.ok, false);
  assert.match(r.error, /full/);
  assert.equal(saveListings(seed, null).ok, false);
});

test('hash routes parse, including unknown and malformed addresses', () => {
  assert.deepEqual(parseHash(''), { view: 'market' });
  assert.deepEqual(parseHash('#/'), { view: 'market' });
  assert.deepEqual(parseHash('#/nope'), { view: 'market' });
  assert.deepEqual(parseHash('#/my-listings'), { view: 'mine' });
  assert.deepEqual(parseHash('#/sell'), { view: 'sell' });
  assert.deepEqual(parseHash(editHash('m-1 2')), { view: 'edit', id: 'm-1 2' });
  assert.deepEqual(parseHash('#/edit/%E0%A4%A'), { view: 'market' });
  assert.equal(isFormRoute(parseHash('#/sell')), true);
  assert.equal(isFormRoute(parseHash('#/edit/m1')), true);
  assert.equal(isFormRoute(parseHash('#/')), false);
});

test('photos are required when publishing and when editing', () => {
  for (const photos of [[], undefined, null]) {
    const r = saveListing(seed, { ...valid, photos });
    assert.equal(r.ok, false);
    assert.ok(r.fieldErrors.photos);
  }
  assert.equal(saveListing(seed, { ...valid, photos: [] }, 'm1').ok, false);
  assert.ok(saveListing(seed, { ...valid, photos: ['a', 'b', 'c', 'd', 'e'] }).fieldErrors.photos);
  assert.equal(saveListing(seed, valid).item.photos, valid.photos);
});

test('remote demo photos stay valid and photo order is saved', () => {
  const original = seed.find((x) => x.id === 'm1');
  const reversed = [...original.photos].reverse();
  const r = saveListing(seed, { ...valid, photos: reversed }, 'm1');
  assert.equal(r.ok, true);
  assert.deepEqual(r.item.photos, reversed);
  assert.ok(r.item.photos[0].startsWith('https://'));
});

test('image files are checked for type and size', () => {
  const file = (type, mb, name = 'x') => ({ type, name, size: mb * 1024 * 1024 });
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(imageFileError(file(type, 1)), '');
  assert.match(imageFileError(file('application/pdf', 1, 'a.pdf')), /a\.pdf.*JPEG/);
  assert.match(imageFileError(file('image/gif', 1)), /JPEG/);
  assert.match(imageFileError(file('image/png', IMAGE_MAX_MB + 1, 'big.png')), /big\.png.*MB/);
  assert.equal(imageFileError(file('image/png', IMAGE_MAX_MB)), '');
});

test('only the owner can delete, and only that record is removed', () => {
  const r = deleteListing(seed, 'm1');
  assert.equal(r.ok, true);
  assert.equal(r.items.length, seed.length - 1);
  assert.ok(!r.items.some((x) => x.id === 'm1'));
  assert.equal(r.items.find((x) => x.id === 'm2'), seed.find((x) => x.id === 'm2'));
  const foreign = deleteListing(seed, 'm2');
  assert.equal(foreign.ok, false);
  assert.match(foreign.error, /your own/);
  assert.equal(foreign.items, undefined);
  assert.equal(deleteListing(seed, 'nope').ok, false);
  assert.equal(seed.length, 8);
});

test('category and condition lists match the brief', () => {
  assert.deepEqual(CATEGORIES, ['textbooks', 'electronics', 'furniture', 'clothing', 'other']);
  assert.deepEqual(CONDITIONS, ['new', 'like-new', 'used', 'worn']);
});
