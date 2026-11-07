import React, { useEffect, useState } from 'react';
import { Marker, Circle, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

export default function UserLocationDot({
  position: propPosition,
  accuracy: propAccuracy,
  isDemo = false,
  onLocationUpdate,
  followUser = false,
}) {
  const [internalPos, setInternalPos] = useState(null);
  const [internalAcc, setInternalAcc] = useState(0);
  const map = useMap();

  useEffect(() => {
    if (propPosition) {
      if (followUser && propPosition.lat && propPosition.lng) {
        map.panTo([propPosition.lat, propPosition.lng], { animate: false });
      }
      return;
    }

    if (!navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        const newPos = [latitude, longitude];
        setInternalPos(newPos);
        setInternalAcc(acc);

        if (onLocationUpdate) {
          onLocationUpdate({ lat: latitude, lng: longitude, accuracy: acc });
        }

        if (followUser) {
          map.panTo(newPos, { animate: false });
        }
      },
      (err) => {
        // GPS only from navigator. Never invent coordinates.
        console.warn('Geolocation notice:', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [map, followUser, propPosition, onLocationUpdate]);

  const activePos = propPosition ? [propPosition.lat, propPosition.lng] : internalPos;
  const activeAcc = propAccuracy !== undefined ? propAccuracy : (propPosition?.accuracy || internalAcc);

  if (!activePos || !activePos[0] || !activePos[1]) return null;

  const dotIcon = L.divIcon({
    className: 'user-gps-pulse-container',
    html: `
      <div class="user-gps-pulse">
        <div class="user-gps-dot"></div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  return (
    <>
      {activeAcc > 0 && activeAcc < 500 && (
        <Circle
          center={activePos}
          radius={activeAcc}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            weight: 1,
          }}
        />
      )}
      <Marker position={activePos} icon={dotIcon}>
        {isDemo && (
          <Tooltip permanent direction="top" offset={[0, -12]} className="bg-amber-100 text-amber-950 font-bold text-[11px] px-1.5 py-0.5 rounded border border-amber-300 shadow-xs">
            Demo start
          </Tooltip>
        )}
      </Marker>
    </>
  );
}
