import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

// Invalidate size on load and window resize
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize({ animate: false });
    };
    const timer = setTimeout(handleResize, 150);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      try {
        map.stop();
      } catch (e) {
        // Safe unmount
      }
    };
  }, [map]);
  return null;
}

// Recenter with animate: false to prevent Leaflet pos/render crash
function RecenterMap({ center, zoom, bounds }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (bounds && bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], animate: false, maxZoom: 17 });
      } catch (e) {
        // Ignore fitBounds errors if coords invalid
      }
    } else if (center && center[0] && center[1]) {
      try {
        map.setView(center, zoom || map.getZoom(), { animate: false });
      } catch (e) {
        // Ignore setView errors
      }
    }
  }, [center, zoom, bounds, map]);

  return null;
}

export default function MapView({
  center = [17.0005, 81.7800], // Rajahmundry center
  zoom = 14,
  bounds = null,
  minZoom = 10,
  maxZoom = 19,
  children,
  className = '',
}) {
  return (
    <div className={`absolute inset-0 w-full h-full ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="/api/map/tiles/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapResizer />
        <RecenterMap center={center} zoom={zoom} bounds={bounds} />
        {children}
      </MapContainer>
    </div>
  );
}
