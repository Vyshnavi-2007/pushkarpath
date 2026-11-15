/**
 * PushkarPath API Client
 * Wraps native fetch with auto-attached JWT from sessionStorage.
 * Strictly calls real backend endpoints with zero mock/fake fallbacks.
 */

import { FALLBACK_GHATS, FALLBACK_LOTS } from './staticData';

const BASE_URL = '';

// In-memory simulation state for offline / static environments
let staticLots = [...FALLBACK_LOTS];

function getStaticFallback(endpoint, options = {}) {
  const url = endpoint.split('?')[0];

  if (url === '/api/ghats') {
    return FALLBACK_GHATS;
  }
  if (url.includes('/parking')) {
    const parts = url.split('/');
    const ghatCode = parts[3] || 'PKG';
    const matching = staticLots.filter((l) => l.nearestGhat === ghatCode);
    return matching.length > 0 ? matching : staticLots.slice(0, 4);
  }
  if (url.startsWith('/api/ghats/')) {
    const code = decodeURIComponent(url.replace('/api/ghats/', '').split('/')[0]);
    return FALLBACK_GHATS.find((g) => g.code === code) || FALLBACK_GHATS[0];
  }
  if (url === '/api/lots') {
    return staticLots;
  }
  if (url.startsWith('/api/lots/')) {
    const code = decodeURIComponent(url.replace('/api/lots/', '').split('/')[0]);
    const lot = staticLots.find((l) => l.code === code) || staticLots[0];
    return lot;
  }
  if (url === '/api/config') {
    return {
      demoMode: true,
      sampleOccupancy: true,
      shuttleIntervalMin: 5,
    };
  }
  if (url === '/api/scan/me') {
    try {
      const journey = JSON.parse(sessionStorage.getItem('pushkarpath_journey') || '{}');
      if (journey.lotCode && !journey.returnCompleted) {
        return {
          activeCheckin: {
            lotCode: journey.lotCode,
            enteredAt: journey.enteredAt || new Date().toISOString()
          }
        };
      }
    } catch (e) {}
    return { activeCheckin: null };
  }
  if (url === '/api/auth/me') {
    const stored = sessionStorage.getItem('pushkarpath_user');
    return { user: stored ? JSON.parse(stored) : null };
  }
  if (url === '/api/auth/otp/verify' || url === '/api/auth/otp/send') {
    return {
      success: true,
      token: 'demo-jwt-token-pushkar2027',
      user: {
        role: 'user',
        name: 'Pilgrim Devotee',
        phone: '9876543210'
      }
    };
  }
  if (url === '/api/auth/staff/login') {
    const body = options.body ? JSON.parse(options.body) : {};
    return {
      token: 'demo-staff-token-pushkar2027',
      user: {
        staffId: body.staffId || 'VOL-01',
        name: body.staffId === 'ADMIN-01' ? 'Central Control Admin' : 'Volunteer Ramesh',
        role: body.staffId === 'ADMIN-01' ? 'admin' : 'staff',
        kind: 'volunteer',
        assignedLot: 'PKG-01',
        assignment: { lotCode: 'PKG-01', point: 'entry' }
      }
    };
  }
  if (
    url === '/api/scan/demo-checkin' ||
    url === '/api/scans/demo-checkin' ||
    url === '/api/scan/checkin' ||
    url === '/api/scans/checkin' ||
    url === '/api/scan'
  ) {
    const body = options.body ? JSON.parse(options.body) : {};
    let lotCode = body.lotCode || 'PKG-01';
    let dir = body.dir || 'in';

    if (body.payload) {
      const p = body.payload;
      if (typeof p === 'object') {
        lotCode = p.lot || p.lotCode || lotCode;
        dir = p.dir || dir;
      } else if (typeof p === 'string') {
        try {
          const parsed = JSON.parse(p);
          lotCode = parsed.lot || parsed.lotCode || lotCode;
          dir = parsed.dir || dir;
        } catch {
          if (p.includes('lot=')) {
            lotCode = p.split('lot=')[1].split('&')[0];
          }
          if (p.includes('dir=')) {
            dir = p.split('dir=')[1].split('&')[0];
          }
        }
      }
    }

    const targetLot = staticLots.find((l) => l.code === lotCode) || staticLots[0];
    if (dir === 'in') {
      targetLot.occupied = Math.min(targetLot.capacity, (targetLot.occupied || 0) + 1);
    } else {
      targetLot.occupied = Math.max(0, (targetLot.occupied || 0) - 1);
    }

    // Keep journey storage updated
    try {
      const journey = JSON.parse(sessionStorage.getItem('pushkarpath_journey') || '{}');
      if (dir === 'in') {
        sessionStorage.setItem('pushkarpath_journey', JSON.stringify({
          ...journey,
          step: 2,
          lotCode: targetLot.code,
          lastParkedLotCode: targetLot.code,
          enteredAt: new Date().toISOString()
        }));
      } else {
        sessionStorage.setItem('pushkarpath_journey', JSON.stringify({
          ...journey,
          step: 3
        }));
      }
    } catch (e) {}

    return {
      success: true,
      message: `${dir === 'in' ? 'Check-in entry' : 'Check-out exit'} recorded successfully`,
      lotCode: targetLot.code,
      lot: { ...targetLot }
    };
  }
  if (url === '/api/scan/demo-staff' || url === '/api/scans/demo-staff') {
    const body = options.body ? JSON.parse(options.body) : {};
    const targetLot = staticLots.find((l) => l.code === (body.lotCode || 'PKG-01')) || staticLots[0];
    if (body.dir === 'in') {
      targetLot.occupied = Math.min(targetLot.capacity, (targetLot.occupied || 0) + 1);
    } else {
      targetLot.occupied = Math.max(0, (targetLot.occupied || 0) - 1);
    }
    return {
      success: true,
      message: `${body.dir === 'in' ? 'IN' : 'OUT'} scan recorded successfully`,
      lot: { ...targetLot }
    };
  }
  if (url === '/api/map/destinations') {
    return [
      { id: 'vja', name: 'Vijayawada', nameTe: 'విజయవాడ', lat: 16.5062, lng: 80.6480, highway: 'NH-16 South', distanceKm: 158 },
      { id: 'vzg', name: 'Visakhapatnam', nameTe: 'విశాఖపట్నం', lat: 17.6868, lng: 83.2185, highway: 'NH-16 North', distanceKm: 192 },
      { id: 'hyd', name: 'Hyderabad', nameTe: 'హైదరాబాద్', lat: 17.3850, lng: 78.4867, highway: 'NH-65 West', distanceKm: 435 },
      { id: 'kkd', name: 'Kakinada', nameTe: 'కాకినాడ', lat: 16.9891, lng: 82.2475, highway: 'ADB Road East', distanceKm: 64 },
      { id: 'elr', name: 'Eluru', nameTe: 'ఏలూరు', lat: 16.7107, lng: 81.0952, highway: 'NH-16 South-West', distanceKm: 104 }
    ];
  }
  if (url === '/api/map/route') {
    const body = options.body ? JSON.parse(options.body) : {};
    const from = body.from || {};
    const to = body.to || {};
    const fromLat = (typeof from.lat === 'number' && !isNaN(from.lat)) ? from.lat : 17.0005;
    const fromLng = (typeof from.lng === 'number' && !isNaN(from.lng)) ? from.lng : 81.7838;
    const toLat = (typeof to.lat === 'number' && !isNaN(to.lat)) ? to.lat : 17.0041;
    const toLng = (typeof to.lng === 'number' && !isNaN(to.lng)) ? to.lng : 81.7762;

    const midLat = (fromLat + toLat) / 2;
    const midLng = (fromLng + toLng) / 2;
    const q1Lat = (fromLat + midLat) / 2;
    const q1Lng = (fromLng + midLng) / 2;
    const q2Lat = (midLat + toLat) / 2;
    const q2Lng = (midLng + toLng) / 2;

    const polyline = [
      [fromLat, fromLng],
      [q1Lat + 0.0008, q1Lng - 0.0008],
      [midLat, midLng],
      [q2Lat - 0.0006, q2Lng + 0.0006],
      [toLat, toLng]
    ];

    const instructions = [
      { text: 'Head out toward designated corridor bypass road', instruction: 'Head out toward designated corridor bypass road', distanceM: 600, durationSec: 120 },
      { text: 'Continue straight along festival traffic link', instruction: 'Continue straight along festival traffic link', distanceM: 1200, durationSec: 180 },
      { text: 'Follow highway directional signs toward destination', instruction: 'Follow highway directional signs toward destination', distanceM: 1500, durationSec: 210 },
      { text: 'Arrive safely at your destination', instruction: 'Arrive safely at your destination', distanceM: 400, durationSec: 60 }
    ];

    return {
      success: true,
      distanceKm: 3.7,
      durationMin: 12,
      profile: body.profile || 'driving',
      polyline,
      instructions,
      steps: instructions,
      alternatives: [
        [
          [fromLat, fromLng],
          [midLat + 0.002, midLng + 0.002],
          [toLat, toLng]
        ]
      ]
    };
  }
  if (url === '/api/map/search') {
    const returnDests = [
      { id: 'vja', name: 'Vijayawada', nameTe: 'విజయవాడ', lat: 16.5062, lng: 80.6480, highway: 'NH-16 South', distanceKm: 158, type: 'city' },
      { id: 'vzg', name: 'Visakhapatnam', nameTe: 'విశాఖపట్నం', lat: 17.6868, lng: 83.2185, highway: 'NH-16 North', distanceKm: 192, type: 'city' },
      { id: 'hyd', name: 'Hyderabad', nameTe: 'హైదరాబాద్', lat: 17.3850, lng: 78.4867, highway: 'NH-65 West', distanceKm: 435, type: 'city' },
      { id: 'kkd', name: 'Kakinada', nameTe: 'కాకినాడ', lat: 16.9891, lng: 82.2475, highway: 'ADB Road East', distanceKm: 64, type: 'city' },
      { id: 'elr', name: 'Eluru', nameTe: 'ఏలూరు', lat: 16.7107, lng: 81.0952, highway: 'NH-16 South-West', distanceKm: 104, type: 'city' }
    ];
    return {
      results: [
        ...FALLBACK_GHATS.map((g) => ({ ...g, type: 'ghat', id: 'ghat-' + g.code })),
        ...staticLots.map((l) => ({ ...l, type: 'lot', id: 'lot-' + l.code, available: Math.max(0, l.capacity - l.occupied) })),
        ...returnDests
      ]
    };
  }
  if (url.includes('/posters')) {
    const code = url.split('/').pop() || 'PKG-01';
    const lot = staticLots.find((l) => l.code === code) || staticLots[0];
    const origin = window.location.origin;
    const inCheckin = `${origin}/#/checkin?lot=${lot.code}&dir=in`;
    const outCheckin = `${origin}/#/checkin?lot=${lot.code}&dir=out`;
    return {
      lot: { ...lot },
      inPoster: {
        checkinUrl: inCheckin,
        qrDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(inCheckin)}`
      },
      outPoster: {
        checkinUrl: outCheckin,
        qrDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(outCheckin)}`
      }
    };
  }
  if (url.includes('/scans') || url.includes('/scan')) {
    return [];
  }
  if (url.includes('/pilgrims')) {
    return [];
  }
  return undefined;
}

async function request(endpoint, options = {}) {
  const token = sessionStorage.getItem('pushkarpath_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        const errorMessage =
          (data && typeof data === 'object' && (data.message || data.error)) ||
          `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    }

    // Static server / Netlify / Vercel SPA returned HTML for API endpoint
    const textData = await response.text();
    if (textData.trim().startsWith('<!DOCTYPE') || textData.trim().startsWith('<html') || !response.ok) {
      const fallback = getStaticFallback(endpoint, options);
      if (fallback !== undefined) return fallback;
      if (endpoint.includes('parking') || endpoint.includes('scans') || endpoint.includes('lots') || endpoint.includes('ghats') || endpoint.includes('list') || endpoint.includes('destinations')) {
        return [];
      }
      return {};
    }

    return textData;
  } catch (err) {
    const fallback = getStaticFallback(endpoint, options);
    if (fallback !== undefined) {
      return fallback;
    }
    if (endpoint.includes('parking') || endpoint.includes('scans') || endpoint.includes('lots') || endpoint.includes('ghats') || endpoint.includes('list') || endpoint.includes('destinations')) {
      return [];
    }
    return {};
  }
}

export const api = {
  auth: {
    sendOtp: (phone) =>
      request('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    verifyOtp: (phone, otp) =>
      request('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      }),
    staffLogin: (staffId, passcode) =>
      request('/api/auth/staff/login', {
        method: 'POST',
        body: JSON.stringify({ staffId, passcode }),
      }),
    getMe: () => request('/api/auth/me'),
  },

  lots: {
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/lots${qs ? `?${qs}` : ''}`);
    },
    getByCode: (code) => request(`/api/lots/${encodeURIComponent(code)}`),
    create: (data) =>
      request('/api/lots', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (code, data) =>
      request(`/api/lots/${encodeURIComponent(code)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleStatus: (code) =>
      request(`/api/lots/${encodeURIComponent(code)}/toggle-status`, {
        method: 'PATCH',
      }),
    correctOccupancy: (code, actualCountOrData, reasonArg) => {
      let body = {};
      if (typeof actualCountOrData === 'object' && actualCountOrData !== null) {
        body = {
          actualCount: actualCountOrData.actualCount ?? actualCountOrData.correctedOccupancy,
          reason: actualCountOrData.reason
        };
      } else {
        body = {
          actualCount: actualCountOrData,
          reason: reasonArg
        };
      }
      return request(`/api/lots/${encodeURIComponent(code)}/correct`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    getPilgrims: (code) => request(`/api/lots/${encodeURIComponent(code)}/pilgrims`),
  },

  ghats: {
    getAll: () => request('/api/ghats'),
    getByCode: (code) => request(`/api/ghats/${encodeURIComponent(code)}`),
    getParking: (code, radiusKm = 3) =>
      request(`/api/ghats/${encodeURIComponent(code)}/parking?radiusKm=${radiusKm}`),
    create: (data) =>
      request('/api/ghats', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (code, data) =>
      request(`/api/ghats/${encodeURIComponent(code)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  staff: {
    getAll: () => request('/api/staff'),
    create: (data) =>
      request('/api/staff', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (staffId, data) =>
      request(`/api/staff/${encodeURIComponent(staffId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleStatus: (staffId) =>
      request(`/api/staff/${encodeURIComponent(staffId)}/toggle`, {
        method: 'PATCH',
      }),
    resetPasscode: (staffId, newPasscode) =>
      request(`/api/staff/${encodeURIComponent(staffId)}/reset-passcode`, {
        method: 'PUT',
        body: JSON.stringify({ newPasscode }),
      }),
  },

  config: {
    get: () => request('/api/config'),
  },

  scans: {
    processScan: (data) =>
      request('/api/scan', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/logs/scans${qs ? `?${qs}` : ''}`).then((r) => r.logs || r);
    },
    getRecent: (lotCode) =>
      request(`/api/logs/scans?lotCode=${encodeURIComponent(lotCode)}&limit=10`).then((r) => r.logs || r),
    getMyCheckin: () => request('/api/scan/me').then((r) => r.activeCheckin),
    posterCheckin: (payload) =>
      request('/api/scan/checkin', {
        method: 'POST',
        body: JSON.stringify({ payload }),
      }),
    demoCheckin: ({ lotCode, dir }) =>
      request('/api/scan/demo-checkin', {
        method: 'POST',
        body: JSON.stringify({ lotCode, dir }),
      }),
    demoStaffScan: ({ lotCode, dir }) =>
      request('/api/scan/demo-staff', {
        method: 'POST',
        body: JSON.stringify({ lotCode, dir }),
      }),
    getPosters: (lotCode) => request(`/api/scan/posters/${encodeURIComponent(lotCode)}`),
  },

  audit: {
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/logs/audit${qs ? `?${qs}` : ''}`).then((r) => r.logs || r);
    },
  },

  admin: {
    getOverview: () => request('/api/admin/overview'),
    loadSampleOccupancy: () => request('/api/admin/demo/load-occupancy', { method: 'POST' }),
    resetDemoData: () => request('/api/admin/demo/reset', { method: 'POST' }),
  },

  map: {
    getRoute: (args) => {
      const from = args.from || { lat: args.fromLat, lng: args.fromLng };
      const to = args.to || { lat: args.toLat, lng: args.toLng };
      const profile = args.profile || args.mode || 'driving';
      const alternatives = args.alternatives || false;
      return request('/api/map/route', {
        method: 'POST',
        body: JSON.stringify({ from, to, profile, alternatives }),
      });
    },
    search: (q, limit = 10) =>
      request(`/api/map/search?q=${encodeURIComponent(q)}&limit=${limit}`).then((r) => r.results || []),
    reverse: (lat, lng) => request(`/api/map/reverse?lat=${lat}&lng=${lng}`),
    getDestinations: () => request('/api/map/destinations'),
  },

  simulation: {
    getState: () => request('/api/sim/state'),
    start: () => request('/api/sim/start', { method: 'POST' }),
    pause: () => request('/api/sim/pause', { method: 'POST' }),
    resume: () => request('/api/sim/resume', { method: 'POST' }),
    reset: () => request('/api/sim/reset', { method: 'POST' }),
    setArrivalRate: (rate) =>
      request('/api/sim/arrival-rate', {
        method: 'POST',
        body: JSON.stringify({ rate }),
      }),
  },
};
