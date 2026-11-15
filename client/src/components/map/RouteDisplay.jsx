import React from 'react';
import { Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export default function RouteDisplay({
  route,
  startPoint,
  destinationPoint,
  destinationName = 'Destination',
}) {
  if (!route || !route.polyline || route.polyline.length === 0) {
    return null;
  }

  // Destination custom flag/pin icon
  const destIcon = L.divIcon({
    className: 'dest-marker',
    html: `
      <div style="
        background: #7A1424;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg) translate(-10%, -10%);
        border: 2px solid #F6C945;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 13px; font-weight: bold;">★</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const safePositions = (route?.polyline || []).filter(
    (p) => Array.isArray(p) && typeof p[0] === 'number' && !isNaN(p[0]) && typeof p[1] === 'number' && !isNaN(p[1])
  );

  if (safePositions.length === 0) {
    return null;
  }

  const rawDest =
    (destinationPoint && Array.isArray(destinationPoint) && !isNaN(destinationPoint[0]) && !isNaN(destinationPoint[1]))
      ? destinationPoint
      : (safePositions.length > 0 ? safePositions[safePositions.length - 1] : null);

  const destCoords = (rawDest && Array.isArray(rawDest) && !isNaN(rawDest[0]) && !isNaN(rawDest[1]))
    ? rawDest
    : null;

  return (
    <>
      {/* Alternative routes rendered in muted dashed lines */}
      {route.alternatives &&
        route.alternatives.map((altPolyline, idx) => {
          const safeAlt = (altPolyline || []).filter(
            (p) => Array.isArray(p) && !isNaN(p[0]) && !isNaN(p[1])
          );
          if (safeAlt.length < 2) return null;
          return (
            <Polyline
              key={`alt-${idx}`}
              positions={safeAlt}
              pathOptions={{
                color: '#9ca3af',
                weight: 4,
                dashArray: '6, 8',
                opacity: 0.7,
              }}
            />
          );
        })}

      {/* Main active route with glowing underline and crisp main line */}
      <Polyline
        positions={safePositions}
        pathOptions={{
          color: '#F29F05',
          weight: 8,
          opacity: 0.5,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <Polyline
        positions={safePositions}
        pathOptions={{
          color: '#0F5C5C',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Destination Marker */}
      {destCoords && (
        <Marker position={destCoords} icon={destIcon}>
          <Popup>
            <div className="text-xs font-sans">
              <strong className="text-maroon font-heading">{destinationName}</strong>
              <div className="text-stone-600 mt-0.5">
                {route.distanceKm ? `${route.distanceKm} km` : ''} • {route.durationMin ? `${route.durationMin} mins` : ''}
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}
