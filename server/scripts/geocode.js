/**
 * PushkarPath Geocode Verification Script
 *
 * Reads ghats and parking lots from seed data that have approx coordinates,
 * queries the Photon API (Komoot) within the Rajahmundry bounding box,
 * and prints matching candidate coordinates for manual review.
 *
 * NOTE: Per specification, this script does NOT auto-update the database.
 * Usage: node scripts/geocode.js (from server directory) or npm run geocode (from root)
 */

const https = require('https');
const path = require('path');
const { URL } = require('url');

// Load seed data
const seedDataPath = path.join(__dirname, '../seed/data');
let seedData;
try {
  seedData = require(seedDataPath);
} catch (err) {
  console.error(`Error loading seed data from ${seedDataPath}: ${err.message}`);
  process.exit(1);
}

const { ghats = [], lots = [] } = seedData;

const USER_AGENT = 'PushkarPath/1.0 (pushkarpath-demo@example.com)';
const PHOTON_BASE = process.env.PHOTON_BASE_URL || 'https://photon.komoot.io';
const BBOX = '81.6,16.9,81.95,17.1'; // Rajahmundry & Godavari river perimeter

/**
 * Perform HTTPS GET request with User-Agent header
 */
function queryPhoton(query) {
  return new Promise((resolve, reject) => {
    const encodedQuery = encodeURIComponent(`${query} Rajahmundry`);
    const fullUrl = `${PHOTON_BASE}/api/?q=${encodedQuery}&bbox=${BBOX}&limit=3`;
    const parsedUrl = new URL(fullUrl);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Failed to parse Photon JSON response: ${e.message}`));
          }
        } else {
          reject(new Error(`Photon returned HTTP ${res.statusCode}: ${data.slice(0, 150)}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Photon query timed out after 10 seconds'));
    });

    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('='.repeat(80));
  console.log('  PushkarPath — Photon Geocoding Verification Tool');
  console.log('  Bounding Box: Rajahmundry [81.6, 16.9, 81.95, 17.1]');
  console.log('  Rate Limit  : 1 request/second');
  console.log('='.repeat(80));

  // Collect items with approx coordinates
  const itemsToGeocode = [];

  for (const ghat of ghats) {
    if (ghat.coordSource === 'approx') {
      itemsToGeocode.push({
        type: 'GHAT',
        code: ghat.code,
        name: ghat.name,
        currentLat: ghat.location.lat,
        currentLng: ghat.location.lng
      });
    }
  }

  for (const lot of lots) {
    if (lot.coordSource === 'approx') {
      itemsToGeocode.push({
        type: 'LOT',
        code: lot.code,
        name: lot.name,
        currentLat: lot.location.lat,
        currentLng: lot.location.lng
      });
    }
  }

  console.log(`\nFound ${itemsToGeocode.length} items with approx coordinates needing review.\n`);

  let count = 0;
  for (const item of itemsToGeocode) {
    count++;
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[${count}/${itemsToGeocode.length}] ${item.type} | ${item.code} — "${item.name}"`);
    console.log(`Current Approx Coordinates : lat: ${item.currentLat}, lng: ${item.currentLng}`);

    try {
      const result = await queryPhoton(item.name);
      const features = (result && result.features) || [];

      if (features.length === 0) {
        console.log(`  Photon Matches: (No matches found in bounding box)`);
      } else {
        features.forEach((feat, idx) => {
          const props = feat.properties || {};
          const geom = feat.geometry || {};
          const [lng, lat] = (geom.coordinates || [null, null]);

          const matchedName = props.name || props.street || props.district || props.city || 'Unnamed feature';
          const osmType = props.osm_key && props.osm_value ? `${props.osm_key}=${props.osm_value}` : 'N/A';
          const state = props.state || '';
          const city = props.city || '';
          const confidence = props.extent ? 'High (polygon extent)' : (idx === 0 ? 'Primary Match' : 'Secondary Match');

          console.log(`  Match #${idx + 1}:`);
          console.log(`    Matched Result : ${matchedName} (${osmType}, ${city} ${state})`);
          console.log(`    Coordinates    : lat: ${lat}, lng: ${lng}`);
          console.log(`    Confidence     : ${confidence}`);
        });
      }
    } catch (err) {
      console.log(`  Photon Query Error: ${err.message}`);
    }

    // Strict 1 request per second rate limiting
    if (count < itemsToGeocode.length) {
      await sleep(1000);
    }
  }

  console.log(`\n================================================================================`);
  console.log('Geocoding lookup completed. Review matches above to refine coordinates.');
  console.log('Database was NOT modified (read-only verification).');
  console.log('================================================================================\n');
}

run().catch((err) => {
  console.error('Fatal error running geocode script:', err);
  process.exit(1);
});
