const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
const OSRM_FOOT_URL = process.env.OSRM_FOOT_URL || 'https://routing.openstreetmap.de/routed-foot';
const PHOTON_BASE_URL = process.env.PHOTON_BASE_URL || 'https://photon.komoot.io';
const USER_AGENT = 'PushkarPath/1.0 (pushkarpath-demo@example.com)';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const AP_BBOX = [76.5, 12.5, 84.8, 19.9]; // minLon, minLat, maxLon, maxLat

// In-memory route and search cache
const cache = new Map();

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function setCached(key, value) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

// Request rate limiter / queue (fair use: ≤1 request per second to public servers)
const queue = [];
let isProcessingQueue = false;
let lastRequestTime = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (queue.length > 0) {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < 1000) {
      await sleep(1000 - timeSinceLast);
    }

    const item = queue.shift();
    if (!item) break;

    lastRequestTime = Date.now();
    try {
      const response = await fetch(item.url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Upstream map service error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setCached(item.cacheKey, data);
      item.resolve(data);
    } catch (err) {
      item.reject(err);
    }
  }

  isProcessingQueue = false;
}

function queuedFetch(url, cacheKey) {
  const cached = getCached(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    queue.push({ url, cacheKey, resolve, reject });
    processQueue();
  });
}

/**
 * Format OSRM maneuver step into human-readable turn instruction
 */
function formatInstruction(step) {
  const m = step.maneuver || {};
  const modifier = m.modifier ? ` ${m.modifier}` : '';
  const name = step.name ? ` onto ${step.name}` : '';

  switch (m.type) {
    case 'depart':
      return `Head${modifier || ' ahead'}${name}`;
    case 'arrive':
      return `Arrive at destination`;
    case 'turn':
      return `Turn${modifier}${name}`;
    case 'continue':
    case 'new name':
      return `Continue${modifier}${name}`;
    case 'merge':
      return `Merge${modifier}${name}`;
    case 'on ramp':
      return `Take ramp${modifier}${name}`;
    case 'off ramp':
      return `Take exit${modifier}${name}`;
    case 'fork':
      return `Keep${modifier}${name}`;
    case 'roundabout':
    case 'rotary':
      return `At roundabout, take exit ${m.exit || 1}${name}`;
    default:
      return `${(m.type || 'Proceed').charAt(0).toUpperCase() + (m.type || 'Proceed').slice(1)}${modifier}${name}`;
  }
}

/**
 * Get route between two coordinates using OSRM
 * @param {Object} from { lat, lng }
 * @param {Object} to { lat, lng }
 * @param {String} profile 'driving' | 'walking'
 * @param {Boolean} alternatives
 */
async function getRoute(from, to, profile = 'driving', alternatives = false) {
  const isWalking = profile === 'walking' || profile === 'foot';
  const baseUrl = isWalking ? OSRM_FOOT_URL : OSRM_BASE_URL;
  const osrmMode = isWalking ? 'foot' : 'driving';

  const url = `${baseUrl}/route/v1/${osrmMode}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=${Boolean(alternatives)}`;
  const cacheKey = `route:${osrmMode}:${from.lat},${from.lng}->${to.lat},${to.lng}:alt=${Boolean(alternatives)}`;

  const raw = await queuedFetch(url, cacheKey);

  if (!raw || !raw.routes || raw.routes.length === 0) {
    throw new Error('No route found between coordinates');
  }

  const primary = raw.routes[0];
  const polyline = (primary.geometry && primary.geometry.coordinates)
    ? primary.geometry.coordinates.map(([lon, lat]) => [lat, lon])
    : [];

  const alts = (raw.routes.slice(1) || []).map((r) =>
    (r.geometry && r.geometry.coordinates)
      ? r.geometry.coordinates.map(([lon, lat]) => [lat, lon])
      : []
  );

  const instructions = [];
  if (primary.legs && primary.legs[0] && Array.isArray(primary.legs[0].steps)) {
    for (const step of primary.legs[0].steps) {
      instructions.push({
        text: formatInstruction(step),
        distanceM: Math.round(step.distance || 0),
        durationS: Math.round(step.duration || 0),
        maneuver: step.maneuver ? step.maneuver.type : null,
        location:
          step.maneuver && step.maneuver.location
            ? [step.maneuver.location[1], step.maneuver.location[0]]
            : null
      });
    }
  }

  return {
    distanceKm: Math.round(((primary.distance || 0) / 1000) * 10) / 10,
    durationMin: Math.max(1, Math.round((primary.duration || 0) / 60)),
    polyline,
    alternatives: alts,
    instructions
  };
}

/**
 * Search places using Photon geocoder
 */
async function searchPhoton(query, bbox = AP_BBOX, limit = 10) {
  const cleanBbox = Array.isArray(bbox) && bbox.length === 4 ? bbox.join(',') : AP_BBOX.join(',');
  const url = `${PHOTON_BASE_URL}/api?q=${encodeURIComponent(query)}&bbox=${cleanBbox}&limit=${limit}`;
  const cacheKey = `photon:${query}:${cleanBbox}:${limit}`;

  return queuedFetch(url, cacheKey);
}

/**
 * Reverse geocode coordinate using Photon
 */
async function reverseGeocode(lat, lng) {
  const url = `${PHOTON_BASE_URL}/reverse?lat=${lat}&lon=${lng}`;
  const cacheKey = `reverse:${lat},${lng}`;

  return queuedFetch(url, cacheKey);
}

module.exports = {
  getRoute,
  searchPhoton,
  reverseGeocode,
  AP_BBOX
};
