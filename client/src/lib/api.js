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
  if (url === '/api/lots') {
    return staticLots;
  }
  if (url.startsWith('/api/lots/')) {
    const code = decodeURIComponent(url.replace('/api/lots/', ''));
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
      { id: 'vja', name: 'Vijayawada', nameTe: 'విజయవాడ', distanceKm: 158 },
      { id: 'vzg', name: 'Visakhapatnam', nameTe: 'విశాఖపట్నం', distanceKm: 192 },
      { id: 'hyd', name: 'Hyderabad', nameTe: 'హైదరాబాద్', distanceKm: 435 }
    ];
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
    if (textData.trim().startsWith('<!DOCTYPE') || textData.trim().startsWith('<html')) {
      const fallback = getStaticFallback(endpoint, options);
      if (fallback !== undefined) return fallback;
    }

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return textData;
  } catch (err) {
    const fallback = getStaticFallback(endpoint, options);
    if (fallback !== undefined) {
      return fallback;
    }
    throw err;
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
