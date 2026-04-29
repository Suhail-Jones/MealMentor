const axios = require('axios');
require('events').EventEmitter.defaultMaxListeners = 30;

const GEMINI_PRICE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const CACHE_TTL_MS = 60 * 60 * 1000;
const priceCache   = new Map();

let krogerToken      = null;
let krogerTokenExpiry = 0;
let krogerLocationId  = null;

function isCacheValid(key) {
  const e = priceCache.get(key);
  return e && e.expiresAt > Date.now();
}
function getCached(key) { return priceCache.get(key)?.prices ?? null; }
function setCache(key, prices) {
  priceCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, prices });
}

// ── Size parsing ──────────────────────────────────────────────────────────────

const MULTIPACK_RE  = /(\d+(?:\.\d+)?)\s*(?:x|pk|pack|ct|count)\W{0,3}(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|oz|lb|g\b|kg)/i;
// "16 Oz, Pack Of 4" — size before count
const MULTIPACK_RE2 = /(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|oz|lb|g\b|kg)[,\s]+(?:pack|pk|ct|count)\s+(?:of\s+)?(\d+)/i;
// "9 Ounce -- 6 per case" — size before "N per case/pack"
const MULTIPACK_RE3 = /(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|oz|lb|g\b|kg)[^a-z]{1,10}(\d+)\s+per\s+(?:case|pack|carton)/i;
const UNIT_RES = [
  { re: /(\d+(?:\.\d+)?)\s*fl\.?\s*oz/i, unit: 'oz' },
  { re: /(\d+(?:\.\d+)?)\s*oz/i,          unit: 'oz' },
  { re: /(\d+(?:\.\d+)?)\s*lb/i,          unit: 'lb' },
  { re: /(\d+(?:\.\d+)?)\s*kg/i,          unit: 'kg' },
  { re: /(\d+(?:\.\d+)?)\s*g\b/i,         unit: 'g'  },
];

function toOz(value, unit) {
  switch (unit.toLowerCase().trim()) {
    case 'oz':
    case 'fl oz': return value;
    case 'lb':    return value * 16;
    case 'g':     return value / 28.3495;
    case 'kg':    return value / 0.0283495;
    default:      return null;
  }
}

function parseSize(text) {
  if (!text) return null;
  const mp = text.match(MULTIPACK_RE);
  if (mp) {
    const qty  = parseFloat(mp[1]);
    const size = parseFloat(mp[2]);
    const raw  = mp[3].toLowerCase().trim();
    const unit = raw.startsWith('fl') ? 'oz' : raw;
    const totalOz = toOz(qty * size, unit);
    return { totalOz, label: `${qty}×${size} ${unit}` };
  }
  const mp2 = text.match(MULTIPACK_RE2);
  if (mp2) {
    const size = parseFloat(mp2[1]);
    const raw  = mp2[2].toLowerCase().trim();
    const unit = raw.startsWith('fl') ? 'oz' : raw;
    const qty  = parseInt(mp2[3]);
    const totalOz = toOz(size * qty, unit);
    return { totalOz, label: `${qty}×${size} ${unit}` };
  }
  const mp3 = text.match(MULTIPACK_RE3);
  if (mp3) {
    const size = parseFloat(mp3[1]);
    const raw  = mp3[2].toLowerCase().trim();
    const unit = raw.startsWith('fl') ? 'oz' : raw;
    const qty  = parseInt(mp3[3]);
    const totalOz = toOz(size * qty, unit);
    return { totalOz, label: `${qty}×${size} ${unit}` };
  }
  for (const { re, unit } of UNIT_RES) {
    const m = text.match(re);
    if (m) {
      const v = parseFloat(m[1]);
      return { totalOz: toOz(v, unit), label: `${v} ${unit}` };
    }
  }
  return null;
}

function calcPricePerOz(priceNum, size) {
  if (!size?.totalOz || !priceNum) return null;
  return priceNum / size.totalOz;
}

// Size proximity score: 1.0 = identical, approaches 0 as ratio diverges
function sizeProximityScore(ozA, ozB) {
  if (!ozA || !ozB) return 0;
  const ratio = ozA / ozB;
  return 1 / (1 + Math.abs(Math.log(ratio)));
}

// ── Relevance filtering ───────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','with','and','or','in','of','for','to','at','by','from','into',
  'on','is','it','its','as','up','fresh','organic','natural','whole','raw','pure',
]);

const SPICE_WORDS = new Set([
  'salt','pepper','cumin','paprika','oregano','thyme','garlic','onion','cinnamon',
  'cayenne','turmeric','ginger','basil','rosemary','chili','parsley','dill',
  'fennel','cloves','nutmeg','cardamom','coriander','sage','bay','allspice',
]);

// Processed/preserved forms that indicate a fundamentally different product
const PROCESSED_WORDS = new Set([
  'jerky','dried','dehydrated','freeze-dried','cured','smoked','pickled',
  'brined','salted','preserved','powder','flakes','extract','concentrate',
  'paste','sauce','seasoning','mix','blend','marinade',
]);

// Returns true if the product title contains processing words absent from ingredient
function isProcessedMismatch(productTitle, ingredient) {
  if (!productTitle) return false;
  const title  = productTitle.toLowerCase();
  const ingLow = ingredient.toLowerCase();
  for (const word of PROCESSED_WORDS) {
    if (title.includes(word) && !ingLow.includes(word)) return true;
  }
  return false;
}

// Composite/prepared product words (soup, stew, sauce…) — if the title has one
// and the ingredient doesn't, it's a different category of product.
const COMPOSITE_INDICATORS = new Set([
  'soup','stew','salad','bowl','sauce','salsa','dip','pizza','pasta',
  'casserole','lasagna','sandwich','wrap','burrito','taco','quesadilla',
  'medley','combo','meal','dinner','entree','kit','bake','frozen meal',
]);

function isCompositeMismatch(title, ingredient) {
  const t = title.toLowerCase();
  const i = ingredient.toLowerCase();
  for (const w of COMPOSITE_INDICATORS) {
    if (t.includes(w) && !i.includes(w)) return true;
  }
  return false;
}

// "X with Y" pattern: primary product is on the LEFT of " with ".
// If ingredient keywords appear ONLY on the right, the ingredient is just
// an accompaniment, not the actual product. (E.g. "Corn with Bell Peppers" for "bell pepper".)
function isAccompanimentOnly(title, ingredient) {
  const t = title.toLowerCase();
  const idx = t.indexOf(' with ');
  if (idx === -1) return false;
  const left = t.slice(0, idx);
  const kws  = ingredientKeywords(ingredient);
  if (!kws.length) return false;
  return !kws.some(kw => left.includes(kw));
}

function ingredientKeywords(ingredient) {
  return ingredient
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// Returns true if product title is a real match for the ingredient.
// Multi-layered: processed mismatch, composite product, "X with Y" accompaniment, then keyword overlap.
function isRelevantProduct(productTitle, ingredient) {
  if (!productTitle) return false;
  if (isProcessedMismatch(productTitle, ingredient)) return false;
  if (isCompositeMismatch(productTitle, ingredient)) return false;
  if (isAccompanimentOnly(productTitle, ingredient)) return false;

  const title = productTitle.toLowerCase();
  const kws = ingredientKeywords(ingredient);
  if (!kws.length) return true;
  const hits = kws.filter(kw => title.includes(kw));
  // Short ingredients (1-2 keywords) require ALL to match — strict, avoids partial matches
  // hijacking results (e.g. "bell" matching "bell pepper jelly", "pepper" matching "pepper jack").
  if (kws.length <= 2) return hits.length === kws.length;
  return hits.length >= Math.ceil(kws.length / 2);
}

// Prefer sensible package sizes for the ingredient type
function sizeReasonablenessScore(totalOz, ingredient) {
  if (!totalOz) return 0.5;
  const name = ingredient.toLowerCase();
  const isSpice = [...SPICE_WORDS].some(w => name.includes(w));
  if (isSpice) {
    if (totalOz <=  8) return 1.0;
    if (totalOz <= 16) return 0.7;
    if (totalOz <= 32) return 0.3;
    return 0.05; // 5 lb salt bag — deprioritize hard
  }
  // General grocery: 4–64 oz is normal
  if (totalOz >= 4 && totalOz <= 64) return 1.0;
  if (totalOz < 4)   return 0.7;
  if (totalOz <= 128) return 0.5;
  return 0.2;
}

// ── Brand extraction ──────────────────────────────────────────────────────────

// Common grocery private-label brands to deprioritize for cross-store matching
const PRIVATE_LABELS = new Set([
  'great value', 'good & gather', 'market pantry', 'simple truth',
  'kroger', 'walmart', "sam's choice", 'equate', 'signature select',
  'store brand', 'generic', 'nature\'s promise', 'open nature',
]);

function extractBrand(title, apiBrand) {
  if (apiBrand && !PRIVATE_LABELS.has(apiBrand.toLowerCase())) return apiBrand.trim();
  if (!title) return null;
  // Take first 1-2 words as potential brand (heuristic for grocery products)
  const words = title.split(/\s+/);
  // Two-word check first (e.g. "Great Value", "Bertolli Extra")
  if (words.length >= 2) {
    const twoWord = `${words[0]} ${words[1]}`.toLowerCase();
    if (!PRIVATE_LABELS.has(twoWord) && /^[A-Z]/.test(words[0]) && /^[A-Z]/.test(words[1])) {
      return `${words[0]} ${words[1]}`;
    }
  }
  // One word
  if (/^[A-Z]/.test(words[0]) && !PRIVATE_LABELS.has(words[0].toLowerCase())) {
    return words[0];
  }
  return null;
}

// ── Kroger auth ───────────────────────────────────────────────────────────────

async function getKrogerToken() {
  if (krogerToken && Date.now() < krogerTokenExpiry) return krogerToken;
  const clientId     = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Kroger credentials not configured');
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await axios.post(
    'https://api.kroger.com/v1/connect/oauth2/token',
    'grant_type=client_credentials&scope=product.compact',
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  krogerToken       = res.data.access_token;
  krogerTokenExpiry = Date.now() + (res.data.expires_in - 300) * 1000;
  return krogerToken;
}

async function getKrogerLocationId(token) {
  if (krogerLocationId) return krogerLocationId;
  const res = await axios.get('https://api.kroger.com/v1/locations', {
    headers: { Authorization: `Bearer ${token}` },
    params:  { 'filter.limit': 1 },
  });
  krogerLocationId = res.data?.data?.[0]?.locationId ?? null;
  console.log(`[Kroger] locationId: ${krogerLocationId}`);
  return krogerLocationId;
}

// ── Kroger fetch ──────────────────────────────────────────────────────────────

async function fetchKrogerCandidates(token, locationId, term) {
  const params = { 'filter.term': term, 'filter.limit': 10 };
  if (locationId) params['filter.locationId'] = locationId;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await axios.get('https://api.kroger.com/v1/products', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return res.data?.data ?? [];
    } catch (err) {
      const status = err.response?.status;
      if ((status === 503 || status === 429) && attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  return [];
}

function scoreKrogerProduct(product, targetOz, ingredient) {
  const item     = product.items?.[0];
  const priceNum = item?.price?.regular ?? item?.price?.promo ?? null;
  const size     = parseSize(item?.size ?? product.description);
  const hasPrice = priceNum !== null;
  const relevant = isRelevantProduct(product.description, ingredient);
  if (!relevant) return { priceNum, size, hasPrice, score: -999 }; // disqualify
  const proxScore = targetOz ? sizeProximityScore(size?.totalOz, targetOz) : 0.5;
  const sizeScore = sizeReasonablenessScore(size?.totalOz, ingredient);
  return { priceNum, size, hasPrice, score: (hasPrice ? 1 : 0) + proxScore * 0.6 + sizeScore * 0.4 };
}

async function fetchKrogerPrice(ingredient, { brandHint = null, targetOz = null } = {}) {
  try {
    const token      = await getKrogerToken();
    const locationId = await getKrogerLocationId(token);

    let candidates = [];

    // First pass: brand-hinted query (more specific)
    if (brandHint) {
      const brandResults = await fetchKrogerCandidates(token, locationId, `${brandHint} ${ingredient}`);
      candidates.push(...brandResults);
    }

    // Second pass: generic query for fallback + more options
    const genericResults = await fetchKrogerCandidates(token, locationId, ingredient);
    // Deduplicate by productId
    const seen = new Set(candidates.map(p => p.productId));
    for (const p of genericResults) {
      if (!seen.has(p.productId)) candidates.push(p);
    }

    if (!candidates.length) return null;

    // Score all candidates: prefer has-price + close size to Walmart's + relevance
    const scored = candidates.map(p => ({ product: p, ...scoreKrogerProduct(p, targetOz, ingredient) }));
    scored.sort((a, b) => b.score - a.score);

    // Pick best — enforce max 4x size ratio if targetOz known
    for (const { product, priceNum, size, hasPrice } of scored) {
      if (!hasPrice) continue;
      if (targetOz && size?.totalOz) {
        const ratio = Math.max(size.totalOz, targetOz) / Math.min(size.totalOz, targetOz);
        if (ratio > 4) continue; // skip wildly different sizes
      }
      const uri    = product.productPageURI;
      const url    = uri ? `https://www.kroger.com${uri.split('?')[0]}` : null;
      const perOz  = calcPricePerOz(priceNum, size);
      return {
        name:       product.description ?? ingredient,
        price:      `$${Number(priceNum).toFixed(2)}`,
        url,
        unitSize:   size?.label ?? product.items?.[0]?.size ?? null,
        totalOz:    size?.totalOz ?? null,
        pricePerOz: perOz ? Math.round(perOz * 1000) / 1000 : null,
      };
    }

    // Fallback: no size constraint, pick first relevant product with price or url
    for (const { product, priceNum, size, score } of scored) {
      if (score === -999) continue; // disqualified by relevance — never surface
      const uri = product.productPageURI;
      const url = uri ? `https://www.kroger.com${uri.split('?')[0]}` : null;
      if (!priceNum && !url) continue;
      const perOz = calcPricePerOz(priceNum, size);
      return {
        name:       product.description ?? ingredient,
        price:      priceNum ? `$${Number(priceNum).toFixed(2)}` : null,
        url,
        unitSize:   size?.label ?? product.items?.[0]?.size ?? null,
        totalOz:    size?.totalOz ?? null,
        pricePerOz: perOz ? Math.round(perOz * 1000) / 1000 : null,
      };
    }
    return null;
  } catch (err) {
    console.error(`[Kroger] failed for "${ingredient}":`, err.response?.data?.errors?.[0]?.reason ?? err.message);
    return null;
  }
}

// ── Walmart fetch ─────────────────────────────────────────────────────────────

async function fetchWalmartPrice(ingredient) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) { console.warn('[SerpAPI] key missing'); return null; }

  try {
    const res = await axios.get('https://serpapi.com/search', {
      params: { engine: 'walmart', query: ingredient, api_key: apiKey },
    });

    const results = (res.data?.organic_results ?? [])
      .filter(r => r.primary_offer?.offer_price)
      .filter(r => isRelevantProduct(r.title, ingredient)); // drop irrelevant products

    // Sort: rating + size reasonableness + price affordability (prefer single-serve packages)
    results.sort((a, b) => {
      const sizeA  = parseSize(a.title);
      const sizeB  = parseSize(b.title);
      const priceA = a.primary_offer.offer_price;
      const priceB = b.primary_offer.offer_price;
      const ratingA = (a.rating ?? 0) * Math.log10((a.reviews ?? 0) + 1);
      const ratingB = (b.rating ?? 0) * Math.log10((b.reviews ?? 0) + 1);
      // Afford score: 1.0 at $0, ~0.5 at $10, ~0.25 at $30 — penalise bulk multi-packs
      const affordA = 1 / (1 + priceA / 8);
      const affordB = 1 / (1 + priceB / 8);
      const sA = ratingA * 0.35 + sizeReasonablenessScore(sizeA?.totalOz, ingredient) * 0.35 + affordA * 0.30;
      const sB = ratingB * 0.35 + sizeReasonablenessScore(sizeB?.totalOz, ingredient) * 0.35 + affordB * 0.30;
      return sB - sA;
    });

    for (const r of results) {
      const priceNum = r.primary_offer.offer_price;
      const size     = parseSize(r.title);
      const perOz    = calcPricePerOz(priceNum, size);
      const brand    = extractBrand(r.title, r.brand);
      return {
        name:       r.title?.slice(0, 80) ?? ingredient,
        price:      `$${Number(priceNum).toFixed(2)}`,
        url:        r.product_page_url ?? null,
        rating:     r.rating ?? null,
        reviews:    r.reviews ?? null,
        brand,
        unitSize:   size?.label ?? null,
        totalOz:    size?.totalOz ?? null,
        pricePerOz: perOz ? Math.round(perOz * 1000) / 1000 : null,
      };
    }
    return null;
  } catch (err) {
    console.error(`[Walmart] failed for "${ingredient}":`, err.response?.data?.error ?? err.message);
    return null;
  }
}

// ── Gemini fallback (estimated price) ─────────────────────────────────────────

// Build a search URL pointing the user to the store's site for this ingredient.
function buildSearchUrl(store, ingredient) {
  const q = encodeURIComponent(ingredient);
  if (store === 'walmart') return `https://www.walmart.com/search?q=${q}`;
  if (store === 'kroger')  return `https://www.kroger.com/search?query=${q}`;
  return null;
}

async function estimateGeminiPrice(ingredient, store) {
  if (!process.env.GEMINI_API_KEY) return null;

  const prompt = `You are a US grocery price estimator. For the ingredient "${ingredient}" sold at ${store === 'walmart' ? 'Walmart' : 'Kroger'} in 2025, estimate a realistic price for a typical single-package size most home cooks buy.

Respond ONLY with valid JSON, no extra text:
{
  "available": true,
  "price": 4.99,
  "size": "1 lb",
  "totalOz": 16
}

Rules:
- Use realistic 2025 US prices. Be neither too high nor too low.
- "size" is a human-readable label (e.g. "1 lb", "16 oz", "12 oz").
- "totalOz" is the size converted to ounces (1 lb = 16, 1 kg = 35.27).
- If this ingredient is genuinely not sold at this store, respond with: { "available": false }
`;

  try {
    const res = await axios.post(
      `${GEMINI_PRICE_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256,
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
      { timeout: 10000 }
    );
    const raw = res.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    let jsonText = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    if (!jsonText.startsWith('{')) {
      const m = jsonText.match(/\{[\s\S]*\}/);
      if (m) jsonText = m[0];
    }
    const parsed = JSON.parse(jsonText);
    if (parsed.available === false || typeof parsed.price !== 'number') return null;

    const totalOz = typeof parsed.totalOz === 'number' ? parsed.totalOz : null;
    const perOz   = totalOz && parsed.price ? parsed.price / totalOz : null;
    return {
      name:       ingredient,
      price:      `$${Number(parsed.price).toFixed(2)}`,
      url:        buildSearchUrl(store, ingredient),
      unitSize:   parsed.size ?? null,
      totalOz,
      pricePerOz: perOz ? Math.round(perOz * 1000) / 1000 : null,
      estimated:  true, // flag for UI to show "est." badge
    };
  } catch (err) {
    console.warn(`[Gemini est] failed for "${ingredient}" @ ${store}:`, err.message);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

// Lookup a single ingredient: Walmart first → use brand/size to guide Kroger
async function lookupSingle(ingredient) {
  const key = ingredient.toLowerCase().trim();

  if (isCacheValid(key)) {
    console.log(`[cache hit] "${key}"`);
    return getCached(key);
  }

  console.log(`[fetching] "${key}"`);

  // Walmart first so we can use brand + size to guide Kroger
  let walmart = await fetchWalmartPrice(key);

  let kroger = await fetchKrogerPrice(key, {
    brandHint: walmart?.brand   ?? null,
    targetOz:  walmart?.totalOz ?? null,
  });

  // Fallback: Gemini estimate when real-store lookup found nothing relevant.
  // Run both fallbacks in parallel — only when needed, so it stays cheap.
  const fallbacks = [];
  if (!walmart) fallbacks.push(estimateGeminiPrice(key, 'walmart').then(r => { if (r) walmart = r; }));
  if (!kroger)  fallbacks.push(estimateGeminiPrice(key, 'kroger').then(r  => { if (r) kroger  = r; }));
  if (fallbacks.length) await Promise.all(fallbacks);

  const prices = { walmart, kroger };
  setCache(key, prices);
  return prices;
}

async function lookupPrices(ingredients) {
  const result = {};
  for (const ingredient of ingredients) {
    result[ingredient] = await lookupSingle(ingredient);
  }
  return result;
}

module.exports = { lookupPrices, lookupSingle };
