import { useState, useEffect, useCallback } from 'react';

// Ground-truth Demo Start location: Rajahmundry RTC Complex
export const DEMO_START = {
  lat: 17.00234,
  lng: 81.78985,
  name: 'Rajahmundry RTC Complex (Demo start)'
};

/**
 * Builds a free, keyless Google Maps navigation intent URL
 */
export function googleMapsUrl(lat, lng, label = '') {
  const query = label ? encodeURIComponent(label) : `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${query}`;
}

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function haversineDistanceM(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return Infinity;
  }
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates distance from a point to the nearest segment of a polyline in meters
 */
export function distanceToPolylineM(point, polyline) {
  if (!point || !Array.isArray(polyline) || polyline.length === 0) return Infinity;

  let minDistance = Infinity;
  for (let i = 0; i < polyline.length; i++) {
    const d = haversineDistanceM(point.lat, point.lng, polyline[i][0], polyline[i][1]);
    if (d < minDistance) {
      minDistance = d;
    }
  }
  return minDistance;
}

/**
 * useGeolocation Hook
 * Strictly reads from browser navigator.geolocation.
 * Never invents or fabricates coordinates.
 * Offers labelled "Demo start" only when explicitly activated by user.
 */
export function useGeolocation(initialDemo = false) {
  const [position, setPosition] = useState(initialDemo ? DEMO_START : null);
  const [isDemo, setIsDemo] = useState(initialDemo);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(!initialDemo);

  const fetchLiveGPS = useCallback(() => {
    if (isDemo) return;

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setError('Location needs https or localhost');
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed
        };
        console.log('[PushkarPath Geolocation] Live GPS acquired:', coords);
        setPosition(coords);
        setLoading(false);
        setError(null);
        setPermissionDenied(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setError('Location permission denied. Please allow GPS access in your browser, or select Demo Start.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Location signal unavailable. Please ensure GPS is enabled or switch to Demo Start.');
        } else {
          setError('Unable to acquire GPS fix: ' + err.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) {
      setPosition(DEMO_START);
      setLoading(false);
      setError(null);
      setPermissionDenied(false);
      return;
    }

    const cleanup = fetchLiveGPS();
    return cleanup;
  }, [isDemo, fetchLiveGPS]);

  const selectDemoStart = () => {
    setIsDemo(true);
    setPosition(DEMO_START);
    setError(null);
    setPermissionDenied(false);
  };

  const useLiveGPS = () => {
    setIsDemo(false);
    setPosition(null);
    setLoading(true);
  };

  return {
    position,
    isDemo,
    loading,
    error,
    permissionDenied,
    selectDemoStart,
    useLiveGPS,
    retry: fetchLiveGPS
  };
}

