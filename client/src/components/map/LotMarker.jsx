import React from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin } from 'lucide-react';

export default function LotMarker({
  lot,
  isSelected = false,
  onClick,
  onShowRoute,
  onNavigate,
}) {
  const lat = lot.location?.lat ?? lot.lat;
  const lng = lot.location?.lng ?? lot.lng;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  const capacity = lot.capacity || 100;
  const occupied = lot.occupied ?? lot.vehiclesParked ?? 0;
  const free = Math.max(0, lot.available ?? (capacity - occupied));
  const occupancyPercent = Math.min(100, Math.round((occupied / capacity) * 100));

  let bgColor = '#10b981'; // green < 70%
  let borderColor = '#047857';

  if (lot.status === 'closed') {
    bgColor = '#6b7280';
    borderColor = '#374151';
  } else if (occupancyPercent >= 90) {
    bgColor = '#ef4444'; // red >= 90%
    borderColor = '#b91c1c';
  } else if (occupancyPercent >= 70) {
    bgColor = '#f59e0b'; // amber 70-90%
    borderColor = '#b45309';
  }

  // Custom DivIcon showing free spaces
  const customIcon = L.divIcon({
    className: 'custom-lot-marker',
    html: `
      <div style="
        background: ${bgColor};
        color: white;
        border: 2px solid ${isSelected ? '#F29F05' : borderColor};
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: ${isSelected ? '0 0 0 4px rgba(242, 159, 5, 0.5), 0 3px 8px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.25)'};
        cursor: pointer;
        font-family: sans-serif;
        transform: translate(-50%, -50%);
        transition: transform 0.15s ease;
      ">
        <span style="font-size: 11px; font-weight: 800; line-height: 1;">${free}</span>
        <span style="font-size: 8px; opacity: 0.9; text-transform: uppercase; letter-spacing: -0.5px;">free</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [0, 0],
  });

  return (
    <Marker
      position={[lat, lng]}
      icon={customIcon}
      eventHandlers={{
        click: () => {
          if (onClick) onClick(lot);
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
        <div className="text-center font-sans">
          <div className="font-bold text-xs">{lot.name}</div>
          <div className="text-[11px] text-stone-600">
            {free} free / {capacity} cap • {lot.fee ? `₹${lot.fee}` : 'Free'}
          </div>
        </div>
      </Tooltip>
      <Popup className="custom-lot-popup">
        <div className="p-1 max-w-[220px] font-sans">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4 className="font-bold text-sm text-stone-900 leading-tight font-heading">{lot.name}</h4>
            <span className="text-[10px] font-mono bg-stone-100 px-1 py-0.5 rounded">{lot.code}</span>
          </div>
          <p className="text-xs text-stone-600 mb-2">{lot.sector} • {lot.category}</p>

          <div className="bg-stone-50 p-2 rounded text-xs mb-3 border border-stone-200">
            <div className="flex justify-between mb-0.5">
              <span className="text-stone-500">Free Spaces:</span>
              <span className="font-bold text-emerald-700">{free}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Parking Fee:</span>
              <span className="font-medium">{lot.fee ? `₹${lot.fee}` : 'Free'}</span>
            </div>
          </div>

          <div className="flex gap-1.5">
            {onShowRoute && (
              <button
                type="button"
                onClick={() => onShowRoute(lot)}
                className="flex-1 py-1 px-2 text-xs font-semibold bg-teal text-white rounded hover:bg-teal-dark flex items-center justify-center gap-1"
              >
                <MapPin className="w-3 h-3" /> Route
              </button>
            )}
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(lot)}
                className="flex-1 py-1 px-2 text-xs font-semibold bg-maroon text-white rounded hover:bg-maroon-light flex items-center justify-center gap-1"
              >
                <Navigation className="w-3 h-3" /> Go
              </button>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
