// Hash routes. Pure, so they can be unit tested with `npm test`.

export const MARKET_HASH = '#/';
export const MINE_HASH = '#/my-listings';
export const SELL_HASH = '#/sell';
export const editHash = (id) => `#/edit/${encodeURIComponent(id)}`;

export function parseHash(hash) {
  if (hash === MINE_HASH) return { view: 'mine' };
  if (hash === SELL_HASH) return { view: 'sell' };
  const match = hash.match(/^#\/edit\/(.+)$/);
  if (match) {
    try {
      return { view: 'edit', id: decodeURIComponent(match[1]) };
    } catch {
      return { view: 'market' };
    }
  }
  return { view: 'market' };
}

export const isFormRoute = (route) => route.view === 'sell' || route.view === 'edit';
