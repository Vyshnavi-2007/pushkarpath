import React from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Compass, Navigation } from 'lucide-react';

export default function GhatMarker({
  ghat,
  isSelected = false,
  onClick,
  onViewLots,
}) {
  const lat = ghat.location?.lat ?? ghat.lat;
  const lng = ghat.location?.lng ?? ghat.lng;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  // Sacred ghat insignia icon
  const customIcon = L.divIcon({
    className: 'custom-ghat-marker',
    html: `
      <div style="
        background: #0F5C5C;
        color: #F6C945;
        border: 2px solid ${isSelected ? '#F29F05' : '#FAF5EC'};
        width: 42px;
        height: 42px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg) translate(-10%, -10%);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${isSelected ? '0 0 0 4px rgba(246, 201, 69, 0.6), 0 4px 10px rgba(0,0,0,0.3)' : '0 3px 8px rgba(0,0,0,0.3)'};
        cursor: pointer;
      ">
        <div style="transform: rotate(45deg); display: flex; flex-direction: column; align-items: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F6C945" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
            <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
            <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
  });

  return (
    <Marker
      position={[lat, lng]}
      icon={customIcon}
      eventHandlers={{
        click: () => {
          if (onClick) onClick(ghat);
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -42]} opacity={0.95}>
        <div className="text-center font-sans">
          <div className="font-bold text-xs text-maroon">{ghat.name}</div>
          {ghat.nameTe && <div className="text-[11px] text-teal font-medium">{ghat.nameTe}</div>}
        </div>
      </Tooltip>
      <Popup className="custom-ghat-popup">
        <div className="p-1 max-w-[240px] font-sans">
          <div className="border-b border-stone-200 pb-1 mb-2">
            <h4 className="font-bold text-sm text-stone-900 leading-tight font-heading">{ghat.name}</h4>
            {ghat.nameTe && <p className="text-teal text-xs font-heading font-medium">{ghat.nameTe}</p>}
          </div>
          <p className="text-xs text-stone-600 line-clamp-2 mb-3">{ghat.description}</p>
          {onViewLots && (
            <button
              type="button"
              onClick={() => onViewLots(ghat)}
              className="w-full py-1.5 px-3 text-xs font-semibold bg-maroon text-white rounded hover:bg-maroon-light flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Compass className="w-3.5 h-3.5" /> Find Nearby Parking
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
