/**
 * PushkarPath API Client
 * Wraps native fetch with auto-attached JWT from sessionStorage.
 * Strictly calls real backend endpoints with zero mock/fake fallbacks.
 */

const BASE_URL = '';

async function request(endpoint, options = {}) {
  const token = sessionStorage.getItem('pushkarpath_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

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
