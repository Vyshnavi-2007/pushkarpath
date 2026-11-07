import React from 'react';
import { MapPin, Navigation, Compass, Waves, Check } from 'lucide-react';
import GhatPhoto from './GhatPhoto';

export default function GhatCard({
  ghat,
  onViewNearbyLots,
  onShowRoute,
  onNavigate,
  className = '',
}) {
  return (
    <div className={`bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs hover:border-stone-300 transition-all ${className}`}>
      {/* Photo or Illustration Fallback */}
      <div className="relative h-44 w-full overflow-hidden bg-stone-100">
        <GhatPhoto ghat={ghat} />

        {/* Ghat Code Badge */}
        <div className="absolute top-3 right-3 bg-maroon/90 backdrop-blur-xs text-white text-xs font-mono font-semibold px-2 py-0.5 rounded shadow-sm">
          {ghat.code}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Names (English + Telugu) */}
        <div className="mb-2">
          <h3 className="font-bold text-lg text-stone-900 font-heading leading-tight">
            {ghat.name}
          </h3>
          {ghat.nameTe && (
            <p className="text-teal font-medium text-sm mt-0.5 font-heading">
              {ghat.nameTe}
            </p>
          )}
        </div>

        {/* Description */}
        {ghat.description && (
          <p className="text-stone-600 text-xs sm:text-sm line-clamp-2 mb-3 leading-relaxed">
            {ghat.description}
          </p>
        )}

        {/* Facilities Chips */}
        {ghat.facilities && ghat.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {ghat.facilities.slice(0, 4).map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] font-medium bg-stone-50 border border-stone-200 text-stone-700 px-2 py-0.5 rounded-full"
              >
                <Check className="w-2.5 h-2.5 text-teal" />
                {f}
              </span>
            ))}
            {ghat.facilities.length > 4 && (
              <span className="text-[11px] text-stone-400 font-medium px-1.5 py-0.5">
                +{ghat.facilities.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
          {onViewNearbyLots && (
            <button
              type="button"
              onClick={() => onViewNearbyLots(ghat)}
              className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-teal hover:bg-teal-dark text-white font-medium text-xs sm:text-sm rounded-lg transition-colors focus:ring-2 focus:ring-marigold"
            >
              <Compass className="w-4 h-4" />
              Find Parking
            </button>
          )}
          {onShowRoute && (
            <button
              type="button"
              onClick={() => onShowRoute(ghat)}
              className="inline-flex items-center justify-center gap-1 py-2 px-3 border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium text-xs sm:text-sm rounded-lg transition-colors focus:ring-2 focus:ring-marigold"
              title="Show route to this ghat"
            >
              <MapPin className="w-4 h-4 text-maroon" />
              Route
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
