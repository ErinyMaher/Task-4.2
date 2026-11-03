# Campus Marketplace — ACL UI/UX Lab

This is a **standalone React demo** for one session of the UI/UX Rescue Challenge. It uses realistic example records stored in this browser; it does not connect to MongoDB or the previous lab API.

## Run

```bash
npm install
npm run dev
```

The terminal prints **one local URL**. Open that link in your normal external browser. The development server will **not** open a browser automatically. Press `Ctrl+C` to stop it.

## Functional brief

Users browse listings; creating, editing and marking their own item sold must work. Keep prices numeric and non-negative. A new listing starts active; only the owner may edit it.

### Fields from the prior lab

- `title` — Item title: required text
- `price` — Price: non-negative number
- `category` — Category: textbooks, electronics, furniture, clothing, other
- `condition` — Condition: new, like-new, used, worn
- `description` — Description: optional
- `pickup` — Item-specific pickup/meetup location (extra field for this standalone demo)
- `status` — Status: active or sold when editing

The demo supports create/edit and stores your updates in browser `localStorage` for this browser. The current demo account email is filled automatically in the Sell form; no separate contact-email entry is needed. Contact Seller opens the default email application with a sample recipient address; it does not send an in-app message. Existing example listings use remote stock photos, which require an internet connection; an icon fallback appears if an image cannot load. **Reset demo** restores the example records. You can assume the current signed-in user is `You`.

## User scenario for this session

A student wants to compare second-hand campus items, find an affordable listing and publish an item of their own.

Your redesign should support the scenario above without removing or weakening the existing features.


## Solution notes

```bash
npm test        # Unit tests for validation, ownership, filters and storage (Node's built-in runner)
npm run build   # Production build
```

- `src/lib/listings.js` holds the marketplace rules, `src/lib/storage.js` the `localStorage` layer and `src/data/seedListings.js` the original example records.
- `src/components/` holds the screens and shared UI. `src/App.jsx` owns the state and connects them.
- Creating and editing listings use dedicated pages (`#/sell` and `#/edit/<id>`). `src/lib/useGuardedRouter.js` asks before leaving a form with unsaved changes, including on browser Back and Forward; reloading or closing the tab uses the browser's own prompt.
- A change is applied to the screen only after it has been written to `localStorage`, so a failed save shows an error, never a success message.
- Added beyond the brief, to support the scenario: a maximum budget filter, an available-only filter and listing deletion. New and edited listings need at least one photo; uploads are resized and kept in this browser only.
