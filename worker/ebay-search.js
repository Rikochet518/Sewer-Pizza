// Sewer Pizza eBay search helper (Cloudflare Worker).
//
// The app asks this helper for eBay listings, and the helper asks eBay.
// Your eBay keys live here as secrets, never in the app, so nobody can copy them.
// It only passes results through. It never stores any eBay data.
//
// Needs two secrets set in Cloudflare (Settings > Variables and Secrets):
//   EBAY_CLIENT_ID      your eBay App ID (Client ID)
//   EBAY_CLIENT_SECRET  your eBay Cert ID (Client Secret)
// Optional plain variable:
//   ALLOWED_ORIGINS     comma-separated sites allowed to use this helper
//                       (default: https://rikochet518.github.io)

const EBAY_TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const SCOPE = 'https://api.ebay.com/oauth/api_scope';

let cachedToken = { value: null, expires: 0 };

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || 'https://rikochet518.github.io').split(',').map((s) => s.trim());
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'Only searches are supported.' }, 405, cors);

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    if (!q) return json({ error: 'Type something to search for.' }, 400, cors);
    if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) {
      return json({ error: 'The eBay keys have not been added to this helper yet.' }, 500, cors);
    }

    try {
      const token = await getToken(env);
      const api = new URL(EBAY_SEARCH_URL);
      api.searchParams.set('q', q);
      api.searchParams.set('limit', '12');
      const res = await fetch(api.toString(), {
        headers: { Authorization: 'Bearer ' + token, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' }
      });
      if (res.status === 401) cachedToken = { value: null, expires: 0 };
      if (!res.ok) return json({ error: 'eBay search did not work (status ' + res.status + '). Try again in a minute.' }, 502, cors);
      const data = await res.json();
      const items = (data.itemSummaries || []).map((i) => ({
        title: i.title || '',
        price: i.price ? i.price.value : null,
        currency: i.price ? i.price.currency : 'USD',
        image: i.image ? i.image.imageUrl : (i.thumbnailImages && i.thumbnailImages[0] ? i.thumbnailImages[0].imageUrl : null),
        url: i.itemWebUrl || null,
        condition: i.condition || '',
        buying: (i.buyingOptions || []).includes('AUCTION') ? 'Auction' : 'Buy It Now'
      })).filter((i) => i.url);
      return json({ query: q, total: data.total || items.length, items }, 200, { ...cors, 'Cache-Control': 'public, max-age=300' });
    } catch (err) {
      return json({ error: 'eBay search is unavailable right now. Try again in a minute.' }, 502, cors);
    }
  }
};

async function getToken(env) {
  if (cachedToken.value && Date.now() < cachedToken.expires - 60000) return cachedToken.value;
  const res = await fetch(EBAY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(env.EBAY_CLIENT_ID + ':' + env.EBAY_CLIENT_SECRET)
    },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent(SCOPE)
  });
  if (!res.ok) throw new Error('token request failed: ' + res.status);
  const data = await res.json();
  cachedToken = { value: data.access_token, expires: Date.now() + (data.expires_in || 7200) * 1000 };
  return cachedToken.value;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
