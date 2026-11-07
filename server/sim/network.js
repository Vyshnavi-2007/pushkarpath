const fs = require('fs');
const path = require('path');
const { getDistanceMeters } = require('../routes/ghats');
const mapServices = require('../lib/mapServices');

const CACHE_FILE = path.join(__dirname, 'network-cache.json');

const ENTRY_CORRIDORS = [
  { id: 'DVC', name: 'NH16 Diwancheruvu', location: { lat: 17.015, lng: 81.84 } },
  { id: 'KVR', name: 'Godavari Fourth Bridge/Kovvur', location: { lat: 17.005, lng: 81.72 } },
  { id: 'KDM', name: 'Kadiyam Entry Corridor', location: { lat: 16.93, lng: 81.81 } }
];

// Target 12 major parking lots across sectors with coordinates
const MAJOR_LOTS = [
  { code: 'KDM-01', name: 'Kadiyam Nursery Belt Parking', capacity: 600, location: { lat: 16.932, lng: 81.813 } },
  { code: 'PKG-02', name: 'Arts College Ground', capacity: 500, location: { lat: 17.003, lng: 81.785 } },
  { code: 'SHT-01', name: 'Shuttle Point Alpha', capacity: 500, location: { lat: 17.018, lng: 81.835 } },
  { code: 'DWR-01', name: 'Dowleswaram Barrage Parking', capacity: 400, location: { lat: 16.942, lng: 81.776 } },
  { code: 'DVC-02', name: 'NH16 Diwancheruvu Lot', capacity: 400, location: { lat: 17.016, lng: 81.842 } },
  { code: 'SHT-02', name: 'Shuttle Point Beta', capacity: 400, location: { lat: 16.935, lng: 81.805 } },
  { code: 'DWR-02', name: 'Barrage South Bank', capacity: 350, location: { lat: 16.939, lng: 81.772 } },
  { code: 'KVR-02', name: 'Fourth Bridge North Lot', capacity: 350, location: { lat: 17.008, lng: 81.723 } },
  { code: 'PKG-01', name: 'Pushkar Ghat Main Parking', capacity: 300, location: { lat: 17.001, lng: 81.783 } },
  { code: 'KDM-03', name: 'NH16 Kadiyam Bypass Lot', capacity: 300, location: { lat: 16.928, lng: 81.815 } },
  { code: 'MRP-02', name: 'Morampudi Ring Road Parking', capacity: 300, location: { lat: 17.012, lng: 81.802 } },
  { code: 'VMG-01', name: 'Vemagiri Open Ground', capacity: 300, location: { lat: 16.955, lng: 81.795 } }
];

/**
 * Interpolates points between two coordinates at roughly 100-meter steps
 */
function interpolateWaypoints(start, end, targetStepMeters = 100) {
  const dist = getDistanceMeters(start.lat, start.lng, end.lat, end.lng);
  const steps = Math.max(1, Math.round(dist / targetStepMeters));
  const points = [];

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const lat = Number((start.lat + (end.lat - start.lat) * fraction).toFixed(6));
    const lng = Number((start.lng + (end.lng - start.lng) * fraction).toFixed(6));
    points.push({ lat, lng });
  }

  return points;
}

/**
 * Builds cell segments from route polyline coordinates
 */
function buildRoadCellsFromCoordinates(coordinates, routeId) {
  const cells = [];
  const CELL_TARGET_METERS = 100;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const pt1 = { lat: coordinates[i][1] || coordinates[i].lat, lng: coordinates[i][0] || coordinates[i].lng };
    const pt2 = { lat: coordinates[i + 1][1] || coordinates[i + 1].lat, lng: coordinates[i + 1][0] || coordinates[i + 1].lng };

    const segmentPoints = interpolateWaypoints(pt1, pt2, CELL_TARGET_METERS);
    // Ignore first point if not beginning
    const sliceStart = i === 0 ? 0 : 1;
    for (let j = sliceStart; j < segmentPoints.length; j++) {
      const idx = cells.length;
      cells.push({
        id: `${routeId}-cell-${idx}`,
        routeId,
        index: idx,
        lat: segmentPoints[j].lat,
        lng: segmentPoints[j].lng
      });
    }
  }

  return cells;
}

/**
 * Generates synthetic road coordinates connecting corridor to destination lot
 */
function generateSyntheticRoute(fromLoc, toLoc, corridorId, lotCode) {
  // Intermediate waypoint to simulate road bend
  const midLat = (fromLoc.lat + toLoc.lat) / 2 + (Math.random() - 0.5) * 0.005;
  const midLng = (fromLoc.lng + toLoc.lng) / 2 + (Math.random() - 0.5) * 0.005;

  const pts1 = interpolateWaypoints(fromLoc, { lat: midLat, lng: midLng }, 100);
  const pts2 = interpolateWaypoints({ lat: midLat, lng: midLng }, toLoc, 100);
  const allPts = pts1.concat(pts2.slice(1));

  const routeId = `${corridorId}_TO_${lotCode}`;
  return {
    id: routeId,
    corridorId,
    lotCode,
    coordinates: allPts.map((p) => [p.lng, p.lat]),
    cells: allPts.map((p, idx) => ({
      id: `${routeId}-cell-${idx}`,
      routeId,
      index: idx,
      lat: p.lat,
      lng: p.lng
    }))
  };
}

/**
 * Builds or loads the road network
 */
async function buildNetwork(forceRebuild = false) {
  if (!forceRebuild && fs.existsSync(CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (cached && cached.routes && cached.routes.length > 0) {
        return cached;
      }
    } catch (e) {
      console.warn('Network cache invalid, rebuilding network:', e.message);
    }
  }

  const network = {
    corridors: ENTRY_CORRIDORS,
    lots: MAJOR_LOTS,
    routes: [],
    cells: []
  };

  for (const corridor of ENTRY_CORRIDORS) {
    for (const lot of MAJOR_LOTS) {
      const routeId = `${corridor.id}_TO_${lot.code}`;
      let routeObj = null;

      try {
        const routeData = await mapServices.getRoute(corridor.location, lot.location, 'driving');
        if (routeData && routeData.routes && routeData.routes[0]?.geometry?.coordinates) {
          const coords = routeData.routes[0].geometry.coordinates;
          const cells = buildRoadCellsFromCoordinates(coords, routeId);
          routeObj = {
            id: routeId,
            corridorId: corridor.id,
            lotCode: lot.code,
            distance: routeData.routes[0].distance,
            duration: routeData.routes[0].duration,
            coordinates: coords,
            cells
          };
        }
      } catch (err) {
        // Fallback to synthetic route
        routeObj = generateSyntheticRoute(corridor.location, lot.location, corridor.id, lot.code);
      }

      if (!routeObj) {
        routeObj = generateSyntheticRoute(corridor.location, lot.location, corridor.id, lot.code);
      }

      network.routes.push(routeObj);
      network.cells.push(...routeObj.cells);
    }
  }

  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(network, null, 2), 'utf8');
  } catch (writeErr) {
    console.warn('Failed to save network cache file:', writeErr.message);
  }

  return network;
}

module.exports = {
  ENTRY_CORRIDORS,
  MAJOR_LOTS,
  buildNetwork,
  CACHE_FILE
};
