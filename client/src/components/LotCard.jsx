import React from 'react';
import { MapPin, Navigation, Car, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LotCard({
  lot,
  distance,
  isSuggested = false,
  showActions = false,
  onShowRoute,
  onNavigate,
  className = '',
}) {
  const capacity = lot.capacity || 100;
  const occupied = lot.occupied ?? lot.vehiclesParked ?? 0;
  const free = Math.max(0, lot.available ?? (capacity - occupied));
  const isFull = occupied >= capacity || free === 0;
  const occupancyPercent = Math.min(100, Math.round((occupied / capacity) * 100));

  let statusColorClass = 'bg-emerald-500';
  let badgeColorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let occupancyStatus = 'Available';

  if (isFull) {
    statusColorClass = 'bg-rose-500';
    badgeColorClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    occupancyStatus = 'FULL';
  } else if (occupancyPercent >= 90) {
    statusColorClass = 'bg-rose-500';
    badgeColorClass = 'bg-rose-50 text-rose-700 border-rose-200';
    occupancyStatus = 'Almost Full / Full';
  } else if (occupancyPercent >= 70) {
    statusColorClass = 'bg-amber-500';
    badgeColorClass = 'bg-amber-50 text-amber-800 border-amber-200';
    occupancyStatus = 'Filling Fast';
  }

  const isClosed = lot.status === 'closed' || lot.isOpen === false;

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
        isSuggested
          ? 'border-marigold shadow-md ring-2 ring-marigold/40 bg-amber-50/20'
          : 'border-stone-200 shadow-xs hover:border-stone-300'
      } ${className}`}
    >
      {/* Suggested Lot Banner if selected */}
      {isSuggested && (
        <div className="bg-marigold text-maroon font-semibold px-3.5 py-1 text-xs flex items-center justify-between tracking-wide">
          <span>★ Recommended Optimal Lot</span>
          <span className="text-[11px] font-normal">Nearest with Free Spaces</span>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base sm:text-lg text-stone-900 leading-snug font-heading">
                {lot.name}
              </h3>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                {lot.code}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5 flex items-center gap-1">
              <span>{lot.sector || 'Central Sector'}</span>
              <span>•</span>
              <span>{lot.category || 'Standard'}</span>
              <span>•</span>
              <span className="font-medium text-stone-700">
                {lot.fee === 0 || !lot.fee ? 'Free' : `₹${lot.fee}`}
              </span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {isClosed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-300">
                <AlertCircle className="w-3 h-3 text-stone-500" /> Closed
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeColorClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusColorClass}`} />
                {occupancyStatus}
              </span>
            )}
            {distance !== undefined && (
              <span className="text-xs font-semibold text-teal flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {typeof distance === 'number' ? `${distance.toFixed(1)} km` : distance}
              </span>
            )}
          </div>
        </div>

        {/* Capacity Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between items-center text-xs mb-1 font-semibold">
            {isFull ? (
              <span className="text-rose-600 font-extrabold tracking-wide uppercase">
                FULL
              </span>
            ) : (
              <span className={occupancyPercent >= 70 ? (occupancyPercent >= 90 ? 'text-rose-600' : 'text-amber-800') : 'text-emerald-700'}>
                {free} free of {capacity}
              </span>
            )}
            <span className="text-stone-500 text-[11px] font-normal">
              {isFull ? `${capacity} of ${capacity}` : `${occupancyPercent}%`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
            <div
              className={`h-full transition-all duration-300 rounded-full ${statusColorClass}`}
              style={{ width: `${occupancyPercent}%` }}
              role="progressbar"
              aria-valuenow={occupancyPercent}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-center bg-stone-50 p-2.5 rounded-lg border border-stone-100 text-xs">
          <div>
            <div className="text-stone-500">Total Capacity</div>
            <div className="font-semibold text-stone-800 text-sm mt-0.5">{capacity}</div>
          </div>
          <div>
            <div className="text-stone-500">Vehicles Parked</div>
            <div className="font-semibold text-stone-800 text-sm mt-0.5">{occupied}</div>
          </div>
          <div>
            <div className="text-stone-500">Free Spaces</div>
            <div className={`font-bold text-sm mt-0.5 ${free > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {free}
            </div>
          </div>
        </div>

        {/* Action Buttons for Pilgrim */}
        {showActions && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-100">
            {onShowRoute && (
              <button
                type="button"
                onClick={() => onShowRoute(lot)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-teal text-teal hover:bg-teal-50 font-medium text-xs sm:text-sm rounded-lg transition-colors focus:ring-2 focus:ring-marigold"
              >
                <MapPin className="w-4 h-4" />
                Show Route
              </button>
            )}
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(lot)}
                disabled={isClosed}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-maroon hover:bg-maroon-light disabled:opacity-50 disabled:pointer-events-none text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-xs focus:ring-2 focus:ring-marigold"
              >
                <Navigation className="w-4 h-4" />
                Navigate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
