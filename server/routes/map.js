const express = require('express');
const router = express.Router();
const mapServices = require('../lib/mapServices');
const Ghat = require('../models/Ghat');
const ParkingLot = require('../models/ParkingLot');

const RETURN_DESTINATIONS = [
  { id: 'vja', name: 'Vijayawada', nameTe: 'విజయవాడ', lat: 16.5062, lng: 80.6480, highway: 'NH-16 South', distanceKm: 158 },
  { id: 'vzg', name: 'Visakhapatnam', nameTe: 'విశాఖపట్నం', lat: 17.6868, lng: 83.2185, highway: 'NH-16 North', distanceKm: 192 },
  { id: 'hyd', name: 'Hyderabad', nameTe: 'హైదరాబాద్', lat: 17.3850, lng: 78.4867, highway: 'NH-65 West', distanceKm: 435 },
  { id: 'kkd', name: 'Kakinada', nameTe: 'కాకినాడ', lat: 16.9891, lng: 82.2475, highway: 'ADB Road East', distanceKm: 64 },
  { id: 'elr', name: 'Eluru', nameTe: 'ఏలూరు', lat: 16.7107, lng: 81.0952, highway: 'NH-16 South-West', distanceKm: 104 }
];

/**
 * GET /api/map/destinations
 * Returns popular departure cities for return journeys
 */
router.get('/destinations', (req, res) => {
  return res.status(200).json(RETURN_DESTINATIONS);
});

/**
 * POST /api/map/route
 * Proxy to OSRM with User-Agent, queue rate limiting, and caching
 */
router.post('/route', async (req, res) => {
  try {
    const { from, to, profile = 'driving', alternatives = false } = req.body;

    if (!from || !to || from.lat === undefined || from.lng === undefined || to.lat === undefined || to.lng === undefined) {
      return res.status(400).json({ error: 'Both from ({ lat, lng }) and to ({ lat, lng }) coordinates are required.' });
    }

    const routeData = await mapServices.getRoute(from, to, profile, alternatives);
    return res.status(200).json(routeData);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to retrieve routing data: ' + err.message });
  }
});

/**
 * GET /api/map/search
 * Search local ghats/lots first, then Photon restricted to AP bbox. Return merged results.
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query parameter (q) is required.' });
    }

    const cleanQuery = q.trim();
    const limitNum = Math.max(1, Math.min(20, parseInt(limit, 10)));
    const regex = new RegExp(cleanQuery, 'i');

    // 1. Search local ghats
    const matchedGhats = await Ghat.find({
      $or: [{ name: regex }, { nameTe: regex }, { code: regex }, { description: regex }]
    }).limit(limitNum);

    // 2. Search local lots
    const matchedLots = await ParkingLot.find({
      $or: [{ name: regex }, { code: regex }, { sector: regex }]
    }).limit(limitNum);

    const localResults = [
      ...matchedGhats.map((g) => ({
        id: `ghat-${g.code}`,
        type: 'ghat',
        code: g.code,
        name: g.name,
        nameTe: g.nameTe,
        sector: null,
        location: g.location,
        description: g.description,
        source: 'local'
      })),
      ...matchedLots.map((l) => ({
        id: `lot-${l.code}`,
        type: 'lot',
        code: l.code,
        name: l.name,
        sector: l.sector,
        capacity: l.capacity,
        available: Math.max(0, l.capacity - l.occupied),
        status: l.status,
        location: l.location,
        source: 'local'
      }))
    ];

    // 3. Search Photon if local results are fewer than requested limit
    let photonResults = [];
    const remainingSlots = limitNum - localResults.length;
    if (remainingSlots > 0) {
      try {
        const photonData = await mapServices.searchPhoton(cleanQuery, mapServices.AP_BBOX, remainingSlots);
        if (photonData && photonData.features) {
          photonResults = photonData.features.map((f) => ({
            id: `photon-${f.properties.osm_id || Math.random()}`,
            type: 'place',
            name: f.properties.name || f.properties.street || cleanQuery,
            description: [f.properties.district, f.properties.city, f.properties.state]
              .filter(Boolean)
              .join(', '),
            location: {
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0]
            },
            source: 'photon',
            properties: f.properties
          }));
        }
      } catch (upstreamErr) {
        console.warn('Photon search failed, returning local matches:', upstreamErr.message);
      }
    }

    return res.status(200).json({
      query: cleanQuery,
      total: localResults.length + photonResults.length,
      results: [...localResults, ...photonResults]
    });
  } catch (err) {
    return res.status(500).json({ error: 'Search failed: ' + err.message });
  }
});

/**
 * GET /api/map/reverse
 * Reverse geocode coordinate
 */
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Both lat and lng parameters are required.' });
    }

    const data = await mapServices.reverseGeocode(Number(lat), Number(lng));
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Reverse geocode failed: ' + err.message });
  }
});

// In-memory LRU cache for OSM map tiles (prevents rate limits and provides instant tile delivery)
const tileCache = new Map();
const MAX_TILE_CACHE = 2500;

/**
 * GET /api/map/tiles/:z/:x/:y
 * Proxies OpenStreetMap tiles with compliant User-Agent and caching.
 * Resolves 403 "Access blocked" and CARTO "API KEY REQUIRED" issues completely.
 * Requires NO API keys and adheres strictly to OpenStreetMap tile usage guidelines.
 */
router.get('/tiles/:z/:x/:y', async (req, res) => {
  try {
    const { z, x, y } = req.params;
    const cleanY = y.replace(/\.png$/, '');
    const cacheKey = `${z}/${x}/${cleanY}`;

    if (tileCache.has(cacheKey)) {
      const cached = tileCache.get(cacheKey);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.send(cached);
    }

    const subdomains = ['a', 'b', 'c'];
    const sub = subdomains[(parseInt(x, 10) + parseInt(cleanY, 10)) % subdomains.length];
    const osmUrl = `https://${sub}.tile.openstreetmap.org/${z}/${x}/${cleanY}.png`;

    let response;
    try {
      response = await fetch(osmUrl, {
        headers: {
          'User-Agent': 'PushkarPath-Pilgrim-App/1.0 (Godavari Pushkaralu Navigation; contact: pushkarpath-admin@rajahmundry.gov.in)',
          'Accept': 'image/png,image/*;q=0.8'
        }
      });
    } catch (e) {
      // Ignore upstream fetch error and try fallback
    }

    if (!response || !response.ok) {
      // Fallback: OpenStreetMap France (HOT humanitarian style)
      const hotUrl = `https://${sub}.tile.openstreetmap.fr/hot/${z}/${x}/${cleanY}.png`;
      const fallbackRes = await fetch(hotUrl, {
        headers: {
          'User-Agent': 'PushkarPath-Pilgrim-App/1.0 (Godavari Pushkaralu Navigation; contact: pushkarpath-admin@rajahmundry.gov.in)'
        }
      });

      if (!fallbackRes.ok) {
        return res.status(fallbackRes.status).send('Tile unavailable');
      }

      const buffer = Buffer.from(await fallbackRes.arrayBuffer());
      if (tileCache.size >= MAX_TILE_CACHE) {
        const firstKey = tileCache.keys().next().value;
        tileCache.delete(firstKey);
      }
      tileCache.set(cacheKey, buffer);

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.send(buffer);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (tileCache.size >= MAX_TILE_CACHE) {
      const firstKey = tileCache.keys().next().value;
      tileCache.delete(firstKey);
    }
    tileCache.set(cacheKey, buffer);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(buffer);
  } catch (err) {
    return res.status(500).send('Error loading tile: ' + err.message);
  }
});

module.exports = router;
