import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import MapView from '../components/map/MapView';
import LotMarker from '../components/map/LotMarker';
import GhatMarker from '../components/map/GhatMarker';
import RouteDisplay from '../components/map/RouteDisplay';
import UserLocationDot from '../components/map/UserLocationDot';
import ScanModal from '../components/ScanModal';
import GhatPhoto from '../components/GhatPhoto';
import { api } from '../lib/api';
import { subscribeSocket } from '../lib/socket';
import { useGeolocation, googleMapsUrl, haversineDistanceM, DEMO_START } from '../lib/geo';
import {
  Compass,
  MapPin,
  Car,
  QrCode,
  Search,
  Navigation,
  ArrowRight,
  X,
  Footprints,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Check,
  Building2,
  Bell
} from 'lucide-react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const JOURNEY_STORAGE_KEY = 'pushkarpath_journey';

function formatGhatDistance(distanceM) {
  return distanceM < 1000 ? `${distanceM} m` : `${(distanceM / 1000).toFixed(1)} km`;
}

export default function Pilgrim() {
  const navigate = useNavigate();

  // Load journey state from sessionStorage (defaulting to live GPS)
  const [journeyState, setJourneyState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(JOURNEY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          startMode: parsed.startMode === 'demo' ? 'demo' : 'gps'
        };
      }
    } catch (e) {}
    return {
      step: 1, // 1: Ghat, 2: Park, 3: Return
      ghatCode: null,
      lotCode: null,
      lastParkedLotCode: null,
      atGhat: false,
      startMode: 'gps', // default to live GPS
    };
  });

  const updateJourney = useCallback((updates) => {
    setJourneyState((prev) => {
      const next = { ...prev, ...updates };
      try {
        sessionStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  // Geolocation: defaults to false so it immediately watches live GPS
  const {
    position: userPosition,
    isDemo,
    loading: locationLoading,
    error: locationError,
    permissionDenied,
    selectDemoStart,
    useLiveGPS,
  } = useGeolocation(journeyState.startMode === 'demo');

  const handleToggleDemo = () => {
    if (isDemo) {
      useLiveGPS();
      updateJourney({ startMode: 'gps' });
    } else {
      selectDemoStart();
      updateJourney({ startMode: 'demo' });
    }
  };

  // Base Data
  const [ghats, setGhats] = useState([]);
  const [lots, setLots] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [activeCheckin, setActiveCheckin] = useState(null);
  const [config, setConfig] = useState({ demoMode: true, shuttleIntervalMin: 5 });
  const [ghatParkingLots, setGhatParkingLots] = useState([]);
  const [loadingGhatParking, setLoadingGhatParking] = useState(false);

  // Selections
  const [selectedGhatCode, setSelectedGhatCode] = useState(journeyState.ghatCode || null);
  const [selectedLotCode, setSelectedLotCode] = useState(journeyState.lotCode || null);
  const [selectedReturnDest, setSelectedReturnDest] = useState(null);

  // Routing
  const [activeRoute, setActiveRoute] = useState(null);
  const [routeMode, setRouteMode] = useState('driving');
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Filters for Step 1 & Step 2
  const [ghatSortBy, setGhatSortBy] = useState('nearest'); // 'nearest' | 'default'
  const [sortBy, setSortBy] = useState('nearest'); // 'nearest' (from ghat) | 'free' (most free) | 'least_full' (least full) | 'user' (nearest to me)
  const [selectedReturnRouteType, setSelectedReturnRouteType] = useState('bypass'); // 'bypass' (less crowded) | 'direct'
  const [hideFull, setHideFull] = useState(false);
  const [hideClosed, setHideClosed] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Return destination search (Step 3)
  const [returnSearchQuery, setReturnSearchQuery] = useState('');
  const [returnSearchResults, setReturnSearchResults] = useState([]);
  const [isSearchingReturn, setIsSearchingReturn] = useState(false);

  // Modals & Notifications
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanModalMode, setScanModalMode] = useState('in'); // 'in' | 'out'
  const [shuttleToast, setShuttleToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showShuttleNotification = useCallback((intervalMin) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const min = intervalMin || config.shuttleIntervalMin || 5;
    setShuttleToast(`Shuttle buses to the ghats run every ${min} minutes from near this parking area.`);
    toastTimeoutRef.current = setTimeout(() => {
      setShuttleToast(null);
    }, 8000);
  }, [config.shuttleIntervalMin]);

  // Load initial data, config, and active check-in
  useEffect(() => {
    Promise.all([
      api.ghats.getAll().catch(() => []),
      api.lots.getAll().catch(() => []),
      api.map.getDestinations().catch(() => []),
      api.config.get().catch(() => ({ demoMode: true, shuttleIntervalMin: 5 })),
      api.scans.getMyCheckin().catch(() => null),
    ]).then(([gList, lList, destList, cfg, checkin]) => {
      setGhats(gList || []);
      setLots(lList || []);
      setDestinations(destList || []);
      if (cfg) setConfig(cfg);

      if (checkin && checkin.lotCode) {
        setActiveCheckin(checkin);
        setSelectedLotCode(checkin.lotCode);
        updateJourney({ lotCode: checkin.lotCode, lastParkedLotCode: checkin.lotCode });
      }
    });

    const unsubLots = subscribeSocket('lots:update', (updatedLots) => {
      if (Array.isArray(updatedLots)) setLots(updatedLots);
    });

    const unsubLot = subscribeSocket('lot:update', (singleLot) => {
      if (singleLot && singleLot.code) {
        setLots((prev) =>
          prev.map((l) => (l.code === singleLot.code ? { ...l, ...singleLot } : l))
        );
        setGhatParkingLots((prev) =>
          prev.map((l) => (l.code === singleLot.code ? { ...l, ...singleLot } : l))
        );
        api.config.get().then((cfg) => {
          if (cfg) setConfig(cfg);
        }).catch(() => {});
      }
    });

    const unsubGhatsChanged = subscribeSocket('ghats:changed', () => {
      api.ghats.getAll().then((g) => setGhats(g || [])).catch(() => {});
    });

    const unsubLotsChanged = subscribeSocket('lots:changed', () => {
      api.lots.getAll().then((l) => setLots(l || [])).catch(() => {});
      if (selectedGhatCode) {
        api.ghats.getParking(selectedGhatCode, 3).then((p) => setGhatParkingLots(p || [])).catch(() => {});
      }
    });

    return () => {
      unsubLots();
      unsubLot();
      unsubGhatsChanged();
      unsubLotsChanged();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [selectedGhatCode]);

  // Load parking for selected ghat via GET /api/ghats/:code/parking?radiusKm=3
  useEffect(() => {
    if (!selectedGhatCode) {
      setGhatParkingLots([]);
      return;
    }
    setLoadingGhatParking(true);
    api.ghats
      .getParking(selectedGhatCode, 3)
      .then((data) => {
        setGhatParkingLots(data || []);
      })
      .catch((err) => {
        console.warn('Failed to load ghat parking:', err);
      })
      .finally(() => {
        setLoadingGhatParking(false);
      });
  }, [selectedGhatCode]);

  const selectedGhat = useMemo(() => {
    return ghats.find((g) => g.code === selectedGhatCode) || null;
  }, [ghats, selectedGhatCode]);

  const selectedLot = useMemo(() => {
    return lots.find((l) => l.code === selectedLotCode) || null;
  }, [lots, selectedLotCode]);

  // Effective user coords for routing
  const effectiveUserCoords = useMemo(() => {
    if (isDemo) {
      return DEMO_START;
    }
    if (userPosition && typeof userPosition.lat === 'number' && typeof userPosition.lng === 'number') {
      return userPosition;
    }
    return null;
  }, [userPosition, isDemo]);

  // Augmented Ghats with distance from user
  const sortedGhats = useMemo(() => {
    const list = ghats.map((g) => {
      const gLat = g.location?.lat ?? g.lat;
      const gLng = g.location?.lng ?? g.lng;
      let distFromUserM = Infinity;
      let distFromUserLabel = null;
      if (effectiveUserCoords && typeof effectiveUserCoords.lat === 'number' && typeof effectiveUserCoords.lng === 'number') {
        distFromUserM = haversineDistanceM(effectiveUserCoords.lat, effectiveUserCoords.lng, gLat, gLng);
        if (Number.isFinite(distFromUserM)) {
          distFromUserLabel = formatGhatDistance(distFromUserM);
        }
      }
      return {
        ...g,
        distFromUserM,
        distFromUserLabel,
      };
    });

    if (ghatSortBy === 'nearest' && effectiveUserCoords) {
      list.sort((a, b) => a.distFromUserM - b.distFromUserM);
    }

    return list;
  }, [ghats, effectiveUserCoords, ghatSortBy]);

  const nearestGhatToUser = useMemo(() => {
    if (!effectiveUserCoords || sortedGhats.length === 0) return null;
    const sorted = [...sortedGhats].sort((a, b) => a.distFromUserM - b.distFromUserM);
    return sorted[0]?.distFromUserM < Infinity ? sorted[0] : null;
  }, [sortedGhats, effectiveUserCoords]);

  // Nearby lots for selected ghat (using GET /api/ghats/:code/parking?radiusKm=3)
  const nearbyLotsForGhat = useMemo(() => {
    if (selectedGhatCode && ghatParkingLots.length > 0) {
      return ghatParkingLots;
    }
    if (!selectedGhat) return lots;
    const gLat = selectedGhat.location?.lat ?? selectedGhat.lat;
    const gLng = selectedGhat.location?.lng ?? selectedGhat.lng;

    return lots.map((l) => {
      const lLat = l.location?.lat ?? l.lat;
      const lLng = l.location?.lng ?? l.lng;
      const distM = haversineDistanceM(gLat, gLng, lLat, lLng);
      return {
        ...l,
        distanceMeters: distM,
        distanceKm: (distM / 1000).toFixed(1),
        distanceGhatM: distM,
        distanceGhatKm: (distM / 1000).toFixed(1),
        walkMinutes: Math.round(distM / 80),
      };
    });
  }, [lots, selectedGhat, selectedGhatCode, ghatParkingLots]);

  // Filtered and sorted lots for Step 2
  const sortedFilteredLots = useMemo(() => {
    let list = [...nearbyLotsForGhat];

    if (hideClosed) {
      list = list.filter((l) => l.status !== 'closed' && l.isOpen !== false);
    }
    // "Hide full lots" checkbox (hides lots at 100%)
    if (hideFull) {
      list = list.filter((l) => {
        const cap = l.capacity || 100;
        const occ = l.occupied ?? 0;
        return occ < cap;
      });
    }

    const isLotFull = (l) => {
      const cap = l.capacity || 100;
      const occ = l.occupied ?? 0;
      return occ >= cap;
    };

    list.sort((a, b) => {
      const fullA = isLotFull(a);
      const fullB = isLotFull(b);

      // Full lots sort last!
      if (fullA && !fullB) return 1;
      if (!fullA && fullB) return -1;

      if (sortBy === 'user' && effectiveUserCoords) {
        const aLat = a.location?.lat ?? a.lat;
        const aLng = a.location?.lng ?? a.lng;
        const bLat = b.location?.lat ?? b.lat;
        const bLng = b.location?.lng ?? b.lng;
        const distA = haversineDistanceM(effectiveUserCoords.lat, effectiveUserCoords.lng, aLat, aLng);
        const distB = haversineDistanceM(effectiveUserCoords.lat, effectiveUserCoords.lng, bLat, bLng);
        return distA - distB;
      } else if (sortBy === 'least_full') {
        const capA = a.capacity || 100;
        const occA = a.occupied ?? 0;
        const pctA = occA / capA;

        const capB = b.capacity || 100;
        const occB = b.occupied ?? 0;
        const pctB = occB / capB;

        if (pctA !== pctB) return pctA - pctB;
        return (capB - occB) - (capA - occA);
      } else if (sortBy === 'free') {
        const capA = a.capacity || 100;
        const occA = a.occupied ?? 0;
        const freeA = Math.max(0, capA - occA);

        const capB = b.capacity || 100;
        const occB = b.occupied ?? 0;
        const freeB = Math.max(0, capB - occB);

        if (freeB !== freeA) return freeB - freeA;
        return (a.distanceMeters ?? a.distanceGhatM ?? 0) - (b.distanceMeters ?? b.distanceGhatM ?? 0);
      } else {
        // 'nearest' (distance from the ghat)
        return (a.distanceMeters ?? a.distanceGhatM ?? 0) - (b.distanceMeters ?? b.distanceGhatM ?? 0);
      }
    });

    return list.map((l) => {
      const lLat = l.location?.lat ?? l.lat;
      const lLng = l.location?.lng ?? l.lng;
      let distFromUserKm = null;
      if (effectiveUserCoords && typeof effectiveUserCoords.lat === 'number' && typeof effectiveUserCoords.lng === 'number') {
        const dM = haversineDistanceM(effectiveUserCoords.lat, effectiveUserCoords.lng, lLat, lLng);
        distFromUserKm = (dM / 1000).toFixed(1);
      }
      return { ...l, distFromUserKm };
    });
  }, [nearbyLotsForGhat, hideClosed, hideFull, sortBy, effectiveUserCoords]);

  // Route calculation with validation & error handling
  const handleFetchRoute = async (target, mode = 'driving', overrideStart = null) => {
    if (!target) return;
    setRouteError(null);

    const startPos = overrideStart || effectiveUserCoords;
    const tLat = target.location?.lat ?? target.lat;
    const tLng = target.location?.lng ?? target.lng;

    if (!startPos) {
      setRouteError('Location is off');
      setActiveRoute({ target, mode, polyline: [] });
      return;
    }

    setRouteLoading(true);
    try {
      const res = await api.map.getRoute({
        from: { lat: startPos.lat, lng: startPos.lng },
        to: { lat: tLat, lng: tLng },
        profile: mode,
        alternatives: mode === 'driving',
      });
      setActiveRoute({ ...res, target, mode });
      setRouteMode(mode);
    } catch (err) {
      setRouteError(err.message || 'Routing server is temporarily unavailable.');
      setActiveRoute({ target, mode, polyline: [] });
    } finally {
      setRouteLoading(false);
    }
  };

  // Launch Full-Screen Navigation HUD
  const handleLaunchNavigation = (target, mode = 'driving', next = null, fromCoords = null) => {
    const tLat = target.location?.lat ?? target.lat;
    const tLng = target.location?.lng ?? target.lng;
    const params = new URLSearchParams({
      lat: tLat,
      lng: tLng,
      name: target.name || 'Destination',
      mode,
    });
    if (target.code) params.set('lotCode', target.code);
    if (next) params.set('next', next);

    if (fromCoords) {
      params.set('fromLat', fromCoords.lat);
      params.set('fromLng', fromCoords.lng);
      if (fromCoords.name) params.set('fromName', fromCoords.name);
    }

    navigate(`/pilgrim/navigate?${params.toString()}`);
  };

  // Global search (Step 1)
  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await api.map.search(q);
      setSearchResults(results || []);
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item) => {
    setSearchQuery('');
    setSearchResults([]);
    if (item.type === 'ghat' || item.nameTe || ghats.some((g) => g.code === item.code)) {
      setSelectedGhatCode(item.code);
      updateJourney({ ghatCode: item.code });
    } else {
      setSelectedLotCode(item.code);
      updateJourney({ lotCode: item.code, step: 2 });
    }
  };

  // Step 3 Return Destination Search (Photon)
  const handleReturnSearch = async (e) => {
    const q = e.target.value;
    setReturnSearchQuery(q);
    if (!q.trim()) {
      setReturnSearchResults([]);
      return;
    }

    setIsSearchingReturn(true);
    try {
      const results = await api.map.search(q, 6);
      setReturnSearchResults(results || []);
    } catch (err) {
      console.warn('Return search error:', err);
    } finally {
      setIsSearchingReturn(false);
    }
  };

  // Step 3: Source lot for return route
  const returnSourceLot = useMemo(() => {
    if (activeCheckin?.lotCode) {
      return lots.find((l) => l.code === activeCheckin.lotCode) || null;
    }
    if (journeyState.lastParkedLotCode) {
      return lots.find((l) => l.code === journeyState.lastParkedLotCode) || null;
    }
    if (journeyState.lotCode) {
      return lots.find((l) => l.code === journeyState.lotCode) || null;
    }
    return lots[0] || null;
  }, [activeCheckin, journeyState.lastParkedLotCode, journeyState.lotCode, lots]);

  // Step 3: Draw driving route lot -> return destination (uses user's live position or parked lot)
  const handleSelectReturnDestination = async (dest) => {
    setSelectedReturnDest(dest);
    setReturnSearchQuery(dest.name || '');
    setReturnSearchResults([]);

    const startPos = effectiveUserCoords || (returnSourceLot ? {
      lat: returnSourceLot.location?.lat ?? returnSourceLot.lat,
      lng: returnSourceLot.location?.lng ?? returnSourceLot.lng,
      name: returnSourceLot.name
    } : null);

    if (startPos) {
      handleFetchRoute(dest, 'driving', startPos);
    }
  };

  // Reset entire journey
  const handleResetJourney = () => {
    try {
      sessionStorage.removeItem(JOURNEY_STORAGE_KEY);
    } catch (e) {}
    setJourneyState({
      step: 1,
      ghatCode: null,
      lotCode: null,
      lastParkedLotCode: null,
      atGhat: false,
      startMode: 'gps',
    });
    setSelectedGhatCode(null);
    setSelectedLotCode(null);
    setActiveRoute(null);
    setActiveCheckin(null);
    setSelectedReturnDest(null);
    setReturnSearchQuery('');
    useLiveGPS();
  };

  // Map Bounds Calculation
  const mapBounds = useMemo(() => {
    if (activeRoute?.polyline?.length > 1) {
      return activeRoute.polyline;
    }
    if (selectedGhat) {
      const gLat = selectedGhat.location?.lat ?? selectedGhat.lat;
      const gLng = selectedGhat.location?.lng ?? selectedGhat.lng;
      const points = [[gLat, gLng]];
      nearbyLotsForGhat.slice(0, 4).forEach((l) => {
        const lLat = l.location?.lat ?? l.lat;
        const lLng = l.location?.lng ?? l.lng;
        if (lLat && lLng) points.push([lLat, lLng]);
      });
      return points;
    }
    return null;
  }, [activeRoute, selectedGhat, nearbyLotsForGhat]);

  // Custom marker for return destination
  const destFlagIcon = L.divIcon({
    className: 'dest-flag-marker',
    html: `
      <div style="
        background: #0F5C5C;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #F6C945;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 14px; font-weight: bold;">🏁</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });

  return (
    <Layout>
      {/* SHUTTLE NOTIFICATION TOAST */}
      {shuttleToast && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-amber-400 text-stone-950 p-4 rounded-2xl shadow-2xl border-2 border-stone-950 flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
          <Bell className="w-5 h-5 text-maroon shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1 text-xs font-bold leading-snug">
            {shuttleToast}
          </div>
          <button
            type="button"
            onClick={() => setShuttleToast(null)}
            className="p-1 hover:bg-black/10 rounded-lg text-stone-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3-STEP JOURNEY STEPPER BAR */}
      <div className="bg-white border-b border-stone-200 sticky top-16 sm:top-18 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Stepper Buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => updateJourney({ step: 1 })}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  journeyState.step === 1
                    ? 'bg-teal text-white shadow-xs ring-2 ring-teal/30'
                    : selectedGhat
                    ? 'bg-teal/10 text-teal hover:bg-teal/20'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    journeyState.step === 1 ? 'bg-white text-teal' : 'bg-teal/20 text-teal'
                  }`}
                >
                  {selectedGhat ? <Check className="w-3.5 h-3.5" /> : '1'}
                </div>
                <span>1. Ghat</span>
                {selectedGhat && (
                  <span className="hidden sm:inline text-[11px] opacity-80 font-normal truncate max-w-[100px]">
                    ({selectedGhat.name})
                  </span>
                )}
              </button>

              <ArrowRight className="w-3.5 h-3.5 text-stone-300" />

              <button
                type="button"
                onClick={() => updateJourney({ step: 2 })}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  journeyState.step === 2
                    ? 'bg-maroon text-white shadow-xs ring-2 ring-maroon/30'
                    : activeCheckin
                    ? 'bg-maroon/10 text-maroon hover:bg-maroon/20'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    journeyState.step === 2 ? 'bg-white text-maroon' : 'bg-maroon/20 text-maroon'
                  }`}
                >
                  {activeCheckin ? <Check className="w-3.5 h-3.5" /> : '2'}
                </div>
                <span>2. Park</span>
                {activeCheckin && (
                  <span className="hidden sm:inline text-[11px] opacity-80 font-normal">
                    (Parked)
                  </span>
                )}
              </button>

              <ArrowRight className="w-3.5 h-3.5 text-stone-300" />

              <button
                type="button"
                onClick={() => updateJourney({ step: 3 })}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  journeyState.returnCompleted
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : journeyState.step === 3
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/30'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    journeyState.returnCompleted
                      ? 'bg-white text-emerald-700'
                      : journeyState.step === 3
                      ? 'bg-white text-amber-600'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {journeyState.returnCompleted ? '✓' : '3'}
                </div>
                <span>3. Return {journeyState.returnCompleted ? '✓' : ''}</span>
              </button>
            </div>

            {/* Right Controls: Demo Start Toggle & Reset */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleDemo}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
                  isDemo
                    ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                    : userPosition
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
                title="Toggle between live device GPS and Rajahmundry RTC Demo Start"
              >
                {isDemo ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Demo start (RTC)</span>
                  </>
                ) : userPosition ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Your location {userPosition.accuracy ? `(±${Math.round(userPosition.accuracy)}m)` : ''}</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-3.5 h-3.5 text-stone-500 animate-spin" />
                    <span>Acquiring GPS...</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetJourney}
                className="text-xs px-2 py-1 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-100 flex items-center gap-1"
                title="Reset journey state"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTAINER:
          Desktop (>=1024px): Left 40% (step content, scrolls), Right 60% (sticky map, always visible).
          Mobile: Map on top (h-[40vh]), content below. */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-[500px] lg:h-[calc(100vh-125px)] overflow-hidden">
        {/* LEFT COLUMN: ~40% width on desktop, scrolls on its own */}
        <div className="w-full lg:w-[40%] xl:w-[40%] h-[60vh] lg:h-[calc(100vh-125px)] lg:min-h-[500px] bg-white border-t lg:border-t-0 lg:border-r border-stone-200 overflow-y-auto p-4 sm:p-5 shadow-lg z-20 space-y-4 order-2 lg:order-1">
          {/* STEP 1: GHAT SELECTION & DETAILS */}
          {journeyState.step === 1 && (
            <div className="space-y-4">
              {/* Search Box & Location-Based Sort Bar */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search ghats, parking lots, AP towns..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:bg-white focus:border-maroon focus:ring-1 focus:ring-marigold transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-stone-200 py-1 z-50 max-h-60 overflow-y-auto">
                      {searchResults.map((res, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSearchResult(res)}
                          className="w-full px-3 py-2 text-left hover:bg-stone-50 flex items-center justify-between text-xs border-b border-stone-100 last:border-0"
                        >
                          <div>
                            <div className="font-semibold text-stone-900">{res.name}</div>
                            <div className="text-[11px] text-stone-500">
                              {res.nameTe || res.sector || res.category}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono uppercase bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                            {res.type || (res.nameTe ? 'ghat' : 'lot')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filter and Location Sorting Bar (Directly with Search Bar) */}
                <div className="flex items-center justify-between gap-2 p-2 bg-stone-100/90 rounded-xl border border-stone-200 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-700 font-bold text-[11px] pl-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-maroon" />
                    <span>Sort by:</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGhatSortBy('nearest')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        ghatSortBy === 'nearest'
                          ? 'bg-maroon text-white shadow-xs'
                          : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                      }`}
                      title="Sort ghats nearest to your GPS position"
                    >
                      <MapPin className="w-3 h-3 text-turmeric" />
                      <span>Nearest to Me</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGhatSortBy('default')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        ghatSortBy === 'default'
                          ? 'bg-maroon text-white shadow-xs'
                          : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                      }`}
                      title="View all 11 ghats in official order"
                    >
                      <span>All 11 Ghats</span>
                    </button>
                  </div>
                </div>
                {ghatSortBy === 'nearest' && !effectiveUserCoords && (
                  <p className="px-2 pt-1 text-[11px] text-stone-600" role="status" aria-live="polite">
                    {locationLoading
                      ? 'Getting your location to calculate ghat distances...'
                      : locationError
                        ? `Distances unavailable: ${locationError}`
                        : 'Allow location access to see each ghat distance from you.'}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <div>
                  <h2 className="text-sm font-bold text-stone-900 font-heading">
                    Step 1: Select Your Holy Ghat
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    Pick a sacred bathing ghat to explore nearby parking grounds.
                  </p>
                </div>
                <span className="text-xs bg-teal/10 text-teal font-semibold px-2 py-0.5 rounded">
                  {ghats.length} Ghats
                </span>
              </div>

              {selectedGhat ? (
                <div className="space-y-4">
                  {/* Selected Ghat Card */}
                  <div className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                    <div className="relative h-40 w-full bg-stone-200">
                      <GhatPhoto ghat={selectedGhat} />
                      <div className="absolute top-2 right-2 bg-maroon text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold shadow-sm">
                        {selectedGhat.code}
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-heading font-bold text-lg text-stone-900 leading-tight">
                            {selectedGhat.name}
                          </h3>
                          {selectedGhat.nameTe && (
                            <p className="text-teal font-heading text-xs font-semibold mt-0.5">
                              {selectedGhat.nameTe}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGhatCode(null);
                            setActiveRoute(null);
                          }}
                          className="text-xs text-stone-400 hover:text-stone-700 underline"
                        >
                          Change
                        </button>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed">
                        {selectedGhat.description || 'Historic sacred ghat on River Godavari for holy pushkar snanam.'}
                      </p>

                      {selectedGhat.facilities && selectedGhat.facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedGhat.facilities.map((fac, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 bg-stone-200 text-stone-700 rounded-md font-medium"
                            >
                              {fac}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Route & Navigate Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleFetchRoute(selectedGhat, 'driving')}
                          className="py-2 px-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5 text-maroon" />
                          <span>Route to Ghat</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleLaunchNavigation(selectedGhat, 'driving', 'at-ghat')
                          }
                          className="py-2 px-3 bg-teal hover:bg-teal-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Car className="w-3.5 h-3.5" />
                          <span>Navigate to Ghat</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateJourney({ step: 2, ghatCode: selectedGhat.code })}
                        className="w-full py-2.5 px-4 bg-maroon hover:bg-maroon-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all mt-1"
                      >
                        <span>Find Parking Near This Ghat</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {ghatSortBy === 'nearest' && effectiveUserCoords && (
                    <div className="rounded-xl border border-stone-200 bg-white p-3">
                      <h3 className="mb-2 text-xs font-bold text-stone-800">Distance to each ghat</h3>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {sortedGhats.map((ghat) => (
                          <div key={ghat.code} className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate text-stone-700">{ghat.name}</span>
                            <span className="shrink-0 font-semibold text-teal">
                              {ghat.distFromUserLabel || 'Distance unavailable'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nearest Parking Lots in 2-COLUMN GRID with live free counts */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                      <span>Nearby Parking Grounds ({nearbyLotsForGhat.length})</span>
                      <span className="text-[11px] text-stone-400 font-normal">2-column grid</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {nearbyLotsForGhat.map((lot) => {
                        const cap = lot.capacity || 100;
                        const occ = lot.occupied ?? 0;
                        const free = Math.max(0, cap - occ);
                        const pct = Math.round((occ / cap) * 100);

                        let badgeColor = 'bg-emerald-500';
                        if (pct >= 90) badgeColor = 'bg-rose-500';
                        else if (pct >= 70) badgeColor = 'bg-amber-500';

                        return (
                          <div
                            key={lot.code}
                            onClick={() => {
                              setSelectedLotCode(lot.code);
                              updateJourney({ step: 2, lotCode: lot.code });
                              handleFetchRoute(lot, 'driving');
                            }}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all hover:shadow-md flex flex-col justify-between ${
                              selectedLotCode === lot.code
                                ? 'border-maroon ring-2 ring-maroon/30 bg-maroon/5'
                                : 'border-stone-200 bg-white hover:border-stone-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-mono text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-bold">
                                  {lot.code}
                                </span>
                                <span className={`w-2.5 h-2.5 rounded-full ${badgeColor}`} />
                              </div>
                              <h4 className="font-semibold text-xs text-stone-900 leading-snug line-clamp-2">
                                {lot.name}
                              </h4>
                            </div>

                            <div className="pt-2 mt-2 border-t border-stone-100 text-[11px] flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-700">{free} free</span>
                                <span className="text-stone-600 font-medium">
                                  {lot.distanceKm || lot.distanceGhatKm} km from {selectedGhat?.name}
                                </span>
                              </div>
                              {lot.beyond && (
                                <span className="self-end text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                                  farther away
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Ghats Selection List with Sort by Nearest & Live Images */
                <div className="space-y-3">
                  {/* Nearest Ghat Banner */}
                  {nearestGhatToUser && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                            <span>Nearest Holy Ghat to You</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                          <div className="text-xs font-bold text-stone-900">
                            {nearestGhatToUser.name} • <span className="text-emerald-700">{nearestGhatToUser.distFromUserLabel}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGhatCode(nearestGhatToUser.code);
                          updateJourney({ ghatCode: nearestGhatToUser.code });
                        }}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
                      >
                        Select Nearest
                      </button>
                    </div>
                  )}

                  {/* Ghat Sorting Toggle */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-stone-500 font-semibold">
                      Showing {sortedGhats.length} Official Ghats
                    </span>
                    {effectiveUserCoords && (
                      <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[11px] font-medium">
                        <button
                          type="button"
                          onClick={() => setGhatSortBy('nearest')}
                          className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                            ghatSortBy === 'nearest'
                              ? 'bg-maroon text-white shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          Nearest to Me
                        </button>
                        <button
                          type="button"
                          onClick={() => setGhatSortBy('default')}
                          className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                            ghatSortBy === 'default'
                              ? 'bg-maroon text-white shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          All Ghats
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ghat Cards List */}
                  <div className="space-y-2.5">
                    {sortedGhats.map((g) => (
                      <div
                        key={g.code}
                        onClick={() => {
                          setSelectedGhatCode(g.code);
                          updateJourney({ ghatCode: g.code });
                        }}
                        className={`p-3 bg-white rounded-xl border hover:border-teal hover:shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          g.code === nearestGhatToUser?.code ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Ghat Photo Thumbnail */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200 shadow-2xs relative">
                            <GhatPhoto ghat={g} />
                            <div className="absolute bottom-0 inset-x-0 bg-stone-900/60 backdrop-blur-2xs text-white text-[9px] font-mono text-center font-bold">
                              {g.code}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-heading font-bold text-xs sm:text-sm text-stone-900 leading-snug truncate">
                                {g.name}
                              </h4>
                              {g.code === nearestGhatToUser?.code && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                  Nearest to you
                                </span>
                              )}
                            </div>
                            {g.nameTe && (
                              <p className="text-[11px] text-teal font-semibold truncate mt-0.5">{g.nameTe}</p>
                            )}
                            <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-1">
                              {ghatSortBy === 'nearest' && g.distFromUserLabel && (
                                <span className="font-semibold text-stone-700 flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-maroon shrink-0" />
                                  {g.distFromUserLabel} from you
                                </span>
                              )}
                              {g.facilities && g.facilities.length > 0 && (
                                <span className="hidden sm:inline text-stone-400">
                                  • {g.facilities.slice(0, 2).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGhatCode(g.code);
                            updateJourney({ ghatCode: g.code });
                          }}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-teal hover:text-white rounded-lg text-xs font-semibold text-stone-700 transition-colors shrink-0 shadow-2xs"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PARK VEHICLE */}
          {journeyState.step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-stone-900 font-heading">
                      Step 2: Parking Areas Grid
                    </h2>
                    {config?.sampleOccupancy && (
                      <span className="bg-stone-200 text-stone-700 border border-stone-300 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        Sample occupancy (demo)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Live discovery for {selectedGhat?.name || 'Godavari Ghats'}.
                  </p>
                </div>
                {selectedGhat && (
                  <button
                    type="button"
                    onClick={() => updateJourney({ step: 1 })}
                    className="text-xs text-teal font-semibold hover:underline"
                  >
                    Change Ghat
                  </button>
                )}
              </div>

              {/* Location Off Warning Banner */}
              {!effectiveUserCoords && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Location is off</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Enable browser GPS or activate Demo start to calculate driving and walking routes.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      selectDemoStart();
                      updateJourney({ startMode: 'demo' });
                    }}
                    className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg text-xs shadow-xs"
                  >
                    Use Demo start (Rajahmundry RTC)
                  </button>
                </div>
              )}

              {/* ACTIVE CHECKIN STATUS CARD */}
              {activeCheckin && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-950">
                          Vehicle Parked Successfully
                        </div>
                        <div className="text-[11px] text-emerald-700">
                          Lot: <strong>{activeCheckin.lotCode}</strong>
                          {activeCheckin.enteredAt && (
                            <span>
                              {' '}
                              • Since{' '}
                              {new Date(activeCheckin.enteredAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold uppercase">
                      Parked
                    </span>
                  </div>

                  {selectedGhat && (
                    <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleLaunchNavigation(selectedGhat, 'walking', 'at-ghat')
                        }
                        className="flex-1 py-2 px-3 bg-teal hover:bg-teal-dark text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Footprints className="w-3.5 h-3.5" />
                        <span>Navigate (Walk) to Ghat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateJourney({ step: 3, atGhat: true })}
                        className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
                      >
                        I have reached the ghat
                      </button>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-900 font-medium">
                      Finished at the ghat?
                    </span>
                    <button
                      type="button"
                      onClick={() => updateJourney({ step: 3 })}
                      className="text-xs font-bold text-maroon hover:underline flex items-center gap-1"
                    >
                      <span>Done at the ghat — plan my return</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Arrival at Lot Banner (If selected lot, not yet checked in) */}
              {!activeCheckin && selectedLot && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Arrived at {selectedLot.name}?</span>
                    </span>
                    <span className="text-[11px] text-stone-500 font-mono">Gate Check-in</span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Scan the printed <strong>IN QR Poster</strong> at the entry gate barrier to record entry.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setScanModalMode('in');
                      setScanModalOpen(true);
                    }}
                    className="w-full py-2 px-3 bg-maroon hover:bg-maroon-dark text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan IN QR</span>
                  </button>
                </div>
              )}

              {/* Filter & Sort Controls for Parking Lots */}
              <div className="space-y-2 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-stone-700 flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-maroon" /> Sort by:
                  </span>
                  <div className="flex items-center gap-1 font-medium flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSortBy('nearest')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        sortBy === 'nearest'
                          ? 'bg-maroon text-white shadow-xs'
                          : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                      }`}
                      title="Sort by distance from selected ghat"
                    >
                      Nearest
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy('free')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        sortBy === 'free'
                          ? 'bg-maroon text-white shadow-xs'
                          : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                      }`}
                      title="Sort by available spaces, high to low"
                    >
                      Most free
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy('least_full')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        sortBy === 'least_full'
                          ? 'bg-maroon text-white shadow-xs'
                          : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                      }`}
                      title="Sort by occupied percentage, low to high"
                    >
                      Least full
                    </button>
                    {effectiveUserCoords && (
                      <button
                        type="button"
                        onClick={() => setSortBy('user')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          sortBy === 'user'
                            ? 'bg-maroon text-white shadow-xs'
                            : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                        }`}
                        title="Sort by distance from your location"
                      >
                        Nearest to Me
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                  <label className="flex items-center gap-1.5 cursor-pointer text-stone-600 font-medium text-[11px]">
                    <input
                      type="checkbox"
                      checked={hideFull}
                      onChange={(e) => setHideFull(e.target.checked)}
                      className="rounded text-maroon focus:ring-marigold"
                    />
                    <span>Hide full lots</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-stone-600 font-medium text-[11px]">
                    <input
                      type="checkbox"
                      checked={hideClosed}
                      onChange={(e) => setHideClosed(e.target.checked)}
                      className="rounded text-maroon focus:ring-marigold"
                    />
                    <span>Hide Closed</span>
                  </label>
                </div>
              </div>

              {/* 2-COLUMN GRID OF PARKING LOT TILES */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold text-stone-700">
                  Parking Grounds Grid ({sortedFilteredLots.length})
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sortedFilteredLots.map((lot) => {
                    const cap = lot.capacity || 100;
                    const occ = lot.occupied ?? 0;
                    const free = Math.max(0, cap - occ);
                    const isFull = occ >= cap || free === 0;
                    const pct = Math.min(100, Math.round((occ / cap) * 100));

                    let colorBarClass = 'bg-emerald-500';
                    if (pct >= 90) colorBarClass = 'bg-rose-500';
                    else if (pct >= 70) colorBarClass = 'bg-amber-500';

                    const isSelected = selectedLotCode === lot.code;

                    return (
                      <div
                        key={lot.code}
                        onClick={() => {
                          setSelectedLotCode(lot.code);
                          handleFetchRoute(lot, 'driving');
                        }}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-maroon ring-2 ring-maroon/30 bg-maroon/5 shadow-md'
                            : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                            <span className="font-mono text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-bold">
                              {lot.code}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {lot.distFromUserKm && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                                  {lot.distFromUserKm} km from you
                                </span>
                              )}
                              <span className="text-[11px] font-semibold text-stone-600">
                                {lot.distanceKm || lot.distanceGhatKm} km from {selectedGhat?.name || 'Ghat'}
                              </span>
                              {lot.beyond && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                                  farther away
                                </span>
                              )}
                            </div>
                          </div>

                          <h4 className="font-bold text-xs text-stone-900 leading-snug line-clamp-2">
                            {lot.name}
                          </h4>
                          <p className="text-[10px] text-stone-500 mt-0.5">
                            {lot.sector || 'Central'} • {lot.category}
                          </p>

                          {/* Free / Capacity with Color Bar */}
                          <div className="mt-2.5">
                            <div className="flex justify-between items-center text-[11px] font-bold mb-1">
                              {isFull ? (
                                <span className="text-rose-600 font-extrabold tracking-wide uppercase">
                                  FULL
                                </span>
                              ) : (
                                <span className={pct >= 70 ? (pct >= 90 ? 'text-rose-600' : 'text-amber-700') : 'text-emerald-700'}>
                                  {free} free of {cap}
                                </span>
                              )}
                              <span className="text-stone-400 font-normal">
                                {isFull ? `${cap} of ${cap}` : `${pct}%`}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                              <div
                                className={`h-full ${colorBarClass}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="pt-3 mt-3 border-t border-stone-100 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLotCode(lot.code);
                              handleFetchRoute(lot, 'driving');
                            }}
                            className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                          >
                            <MapPin className="w-3.5 h-3.5 text-stone-500" />
                            <span>Route</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLotCode(lot.code);
                              handleLaunchNavigation(lot, 'driving', 'scan-in');
                            }}
                            className="flex-1 py-1.5 px-2 bg-maroon hover:bg-maroon-dark text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Navigate</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RETURN JOURNEY */}
          {journeyState.step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <div>
                  <h2 className="text-sm font-bold text-stone-900 font-heading">
                    Step 3: Plan Your Return
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    Walk to vehicle, scan OUT, and navigate safely out of Rajahmundry.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetJourney}
                  className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Start Over</span>
                </button>
              </div>

              {/* Pilgrimage Completed Celebration Card & Thank You Message */}
              {journeyState.returnCompleted && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-3 shadow-sm animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-black text-sm text-emerald-950">
                          Pilgrimage Completed Successfully!
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900">
                          Return Done ✓
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                        🙏 <strong>Thank you for visiting Godavari Pushkaralu 2027!</strong> May Holy River Godavari and Lord Shiva bless your home and family with peace, prosperity, and spiritual fulfillment. Safe journey home!
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-900 font-semibold">
                      Holy dip, parking & return trip completed
                    </span>
                    <button
                      type="button"
                      onClick={handleResetJourney}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      Plan Another Journey
                    </button>
                  </div>
                </div>
              )}

              {/* 1. Walk to my vehicle & 2. Scan OUT */}
              {activeCheckin ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-stone-900">
                        1. Walk to Your Vehicle
                      </h4>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Parked at: <strong>{activeCheckin.lotCode}</strong>
                      </p>
                    </div>
                    <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">
                      Parked
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const targetLot = lots.find((l) => l.code === activeCheckin.lotCode);
                        if (targetLot) handleFetchRoute(targetLot, 'walking');
                      }}
                      className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Footprints className="w-3.5 h-3.5 text-teal" />
                      <span>Route Walk</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const targetLot = lots.find((l) => l.code === activeCheckin.lotCode);
                        if (targetLot) handleLaunchNavigation(targetLot, 'walking', 'scan-out');
                      }}
                      className="py-2 px-3 bg-teal hover:bg-teal-dark text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Navigate Walk</span>
                    </button>
                  </div>

                  {/* 2. Scan OUT */}
                  <div className="pt-2 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={() => {
                        setScanModalMode('out');
                        setScanModalOpen(true);
                      }}
                      className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>2. Scan OUT QR at Gate (Frees Space)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">
                      Vehicle Checked Out
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      Parking spot released. Select your destination corridor below.
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Choose Destination */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-maroon" /> 3. Destination City
                  </span>
                  {returnSourceLot && (
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-stone-100 rounded text-stone-700">
                      From: {returnSourceLot.name}
                    </span>
                  )}
                </div>

                {/* Destination Search Box (Prevents form submission so step never changes) */}
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search city/town (e.g. Vijayawada, Hyderabad)..."
                    value={returnSearchQuery}
                    onChange={handleReturnSearch}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:bg-white focus:border-maroon focus:ring-1 focus:ring-marigold transition-all"
                  />
                  {returnSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setReturnSearchQuery('');
                        setReturnSearchResults([]);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {returnSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-stone-200 py-1 z-50 max-h-56 overflow-y-auto">
                      {returnSearchResults.map((dest, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectReturnDestination(dest)}
                          className="w-full px-3 py-2 text-left hover:bg-stone-50 flex items-center justify-between text-xs border-b border-stone-100 last:border-0"
                        >
                          <div>
                            <div className="font-semibold text-stone-900">{dest.name}</div>
                            <div className="text-[11px] text-stone-500">
                              {dest.nameTe || dest.description || 'Andhra Pradesh'}
                            </div>
                          </div>
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                            Select
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick-Pick AP Destination Chips */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] text-stone-500 font-semibold">
                    Popular AP Return Corridors:
                  </div>
                  <div className="space-y-2">
                    {destinations.map((city) => (
                      <div
                        key={city.id}
                        onClick={() => handleSelectReturnDestination(city)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          selectedReturnDest?.name === city.name
                            ? 'border-maroon ring-2 ring-maroon/30 bg-maroon/5 shadow-xs'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-stone-900 text-xs sm:text-sm">
                              {city.name}{' '}
                              {city.nameTe && (
                                <span className="text-teal font-medium text-xs">({city.nameTe})</span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 mt-0.5">
                              Route via <strong className="text-stone-700">{city.highway}</strong>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-stone-800">
                              ~{city.distanceKm} km
                            </span>
                            <span className="block text-[10px] text-stone-400">Corridor</span>
                          </div>
                        </div>

                        {selectedReturnDest?.name === city.name && (
                          <div className="pt-2.5 mt-2.5 border-t border-stone-200 space-y-2.5">
                            <div className="text-[11px] font-bold text-stone-700 flex items-center justify-between">
                              <span>Select Exit Corridor to {city.name}:</span>
                              <span className="text-[10px] text-teal font-semibold">Real-time Crowd Filter</span>
                            </div>

                            {/* Option 1: Less Crowded Outer Bypass */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReturnRouteType('bypass');
                              }}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                selectedReturnRouteType === 'bypass'
                                  ? 'bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-400 shadow-2xs'
                                  : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Less Crowded • Recommended
                                  </span>
                                  <span className="text-xs font-bold text-stone-900">Outer Bypass Route</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-emerald-800">Fastest Exit</span>
                              </div>
                              <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                                Bypasses Pushkar Ghat and core municipal bottleneck junctions. Direct exit onto four-lane highway corridor.
                              </p>
                            </div>

                            {/* Option 2: Direct Municipal Arterial */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReturnRouteType('direct');
                              }}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                selectedReturnRouteType === 'direct'
                                  ? 'bg-amber-50/90 border-amber-400 ring-1 ring-amber-400 shadow-2xs'
                                  : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-stone-950">
                                    Heavy Festival Congestion
                                  </span>
                                  <span className="text-xs font-bold text-stone-900">Direct Town Arterial</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-amber-800">+25-40 min</span>
                              </div>
                              <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                                Passes through main bazaar, RTC bus complex, and rail station approach roads subject to pilgrim crowds.
                              </p>
                            </div>

                            <div className="pt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const startPos = effectiveUserCoords || (returnSourceLot ? {
                                    lat: returnSourceLot.location?.lat ?? returnSourceLot.lat,
                                    lng: returnSourceLot.location?.lng ?? returnSourceLot.lng,
                                    name: returnSourceLot.name
                                  } : null);
                                  handleLaunchNavigation(
                                    city,
                                    'driving',
                                    'return-home',
                                    startPos
                                  );
                                }}
                                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>Navigate ({selectedReturnRouteType === 'bypass' ? 'Less Crowded Bypass' : 'Town Arterial'})</span>
                              </button>

                              <a
                                href={
                                  returnSourceLot
                                    ? `https://www.google.com/maps/dir/?api=1&origin=${returnSourceLot.location?.lat ?? returnSourceLot.lat},${returnSourceLot.location?.lng ?? returnSourceLot.lng}&destination=${city.lat},${city.lng}`
                                    : googleMapsUrl(city.lat, city.lng, city.name)
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                                <span>Google Maps</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ~60% width on desktop, sticky map always visible */}
        <div className="relative w-full h-[40vh] lg:h-[calc(100vh-125px)] min-h-[420px] lg:w-[60%] flex-1 order-1 lg:order-2 lg:sticky lg:top-[125px]">
          <MapView
            center={[17.0005, 81.7800]}
            zoom={14}
            bounds={mapBounds}
            className="w-full h-full"
          >
            {/* User GPS Dot with Demo start label when demo is active */}
            {effectiveUserCoords && (
              <UserLocationDot position={effectiveUserCoords} isDemo={isDemo || journeyState.startMode === 'demo'} />
            )}

            {/* Step 1 Map: all ghat pins. If a ghat is selected, also show its nearest lots */}
            {journeyState.step === 1 && (
              <>
                {ghats.map((ghat) => (
                  <GhatMarker
                    key={ghat.code}
                    ghat={ghat}
                    isSelected={selectedGhatCode === ghat.code}
                    onClick={(g) => {
                      setSelectedGhatCode(g.code);
                      updateJourney({ ghatCode: g.code });
                    }}
                    onViewLots={(g) => {
                      setSelectedGhatCode(g.code);
                      updateJourney({ ghatCode: g.code, step: 2 });
                    }}
                  />
                ))}

                {selectedGhat &&
                  nearbyLotsForGhat.slice(0, 6).map((lot) => (
                    <LotMarker
                      key={lot.code}
                      lot={lot}
                      isSelected={selectedLotCode === lot.code}
                      onClick={(l) => {
                        setSelectedLotCode(l.code);
                        updateJourney({ lotCode: l.code, step: 2 });
                        handleFetchRoute(l, 'driving');
                      }}
                      onShowRoute={(l) => handleFetchRoute(l, 'driving')}
                      onNavigate={(l) => handleLaunchNavigation(l, 'driving', 'scan-in')}
                    />
                  ))}
              </>
            )}

            {/* Step 2 Map: parking pins with live free counts + selected ghat */}
            {journeyState.step === 2 && (
              <>
                {selectedGhat && (
                  <GhatMarker
                    ghat={selectedGhat}
                    isSelected={true}
                    onClick={() => {}}
                    onViewLots={() => {}}
                  />
                )}

                {sortedFilteredLots.map((lot) => (
                  <LotMarker
                    key={lot.code}
                    lot={lot}
                    isSelected={selectedLotCode === lot.code}
                    onClick={(l) => {
                      setSelectedLotCode(l.code);
                      handleFetchRoute(l, 'driving');
                    }}
                    onShowRoute={(l) => handleFetchRoute(l, 'driving')}
                    onNavigate={(l) => handleLaunchNavigation(l, 'driving', 'scan-in')}
                  />
                ))}
              </>
            )}

            {/* Step 3 Map: my parked lot pin + return destination */}
            {journeyState.step === 3 && (
              <>
                {returnSourceLot && (
                  <LotMarker
                    lot={returnSourceLot}
                    isSelected={true}
                    onClick={() => {}}
                    onShowRoute={() => {}}
                    onNavigate={() => {}}
                  />
                )}

                {selectedReturnDest && (
                  <Marker
                    position={[
                      selectedReturnDest.location?.lat ?? selectedReturnDest.lat,
                      selectedReturnDest.location?.lng ?? selectedReturnDest.lng
                    ]}
                    icon={destFlagIcon}
                  >
                    <Popup>
                      <div className="text-xs font-sans">
                        <strong className="text-teal font-heading">{selectedReturnDest.name}</strong>
                        <div className="text-stone-500 mt-0.5">Return Destination</div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </>
            )}

            {/* Active Route Polylines */}
            {activeRoute && <RouteDisplay route={activeRoute} />}
          </MapView>

          {/* Floating Route Summary Card with Turn-by-Turn Steps & Error Handling */}
          {(activeRoute || routeError) && (
            <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto sm:w-88 bg-white/95 backdrop-blur-md rounded-xl p-3.5 shadow-xl border border-marigold/60 z-20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 truncate">
                  <Navigation className="w-4 h-4 text-maroon shrink-0" />
                  <span className="truncate">
                    Route to {activeRoute?.target?.name || 'Destination'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRoute(null);
                    setRouteError(null);
                  }}
                  className="text-stone-400 hover:text-stone-600 p-0.5 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {routeError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{routeError}</span>
                  </div>
                  {!effectiveUserCoords && (
                    <button
                      type="button"
                      onClick={() => {
                        selectDemoStart();
                        updateJourney({ startMode: 'demo' });
                        if (activeRoute?.target) {
                          handleFetchRoute(activeRoute.target, routeMode, DEMO_START);
                        }
                      }}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg text-[11px] shadow-xs"
                    >
                      Use Demo start (Rajahmundry RTC)
                    </button>
                  )}
                </div>
              )}

              {activeRoute && activeRoute.distanceKm !== undefined && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-2 rounded-lg border border-stone-100">
                    <div>
                      <span className="text-stone-500 block text-[11px]">Distance</span>
                      <strong className="text-stone-900 font-bold">{activeRoute.distanceKm} km</strong>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[11px]">Est. Time</span>
                      <strong className="text-stone-900 font-bold">{activeRoute.durationMin} min</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleFetchRoute(activeRoute.target, 'driving')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                        routeMode === 'driving'
                          ? 'bg-maroon text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      <Car className="w-3.5 h-3.5" /> Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFetchRoute(activeRoute.target, 'walking')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                        routeMode === 'walking'
                          ? 'bg-teal text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      <Footprints className="w-3.5 h-3.5" /> Walk
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchNavigation(activeRoute.target, routeMode)}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <span>Navigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}

              {activeRoute?.target && (
                <div className="pt-1 flex items-center justify-between border-t border-stone-100">
                  <a
                    href={
                      effectiveUserCoords
                        ? `https://www.google.com/maps/dir/?api=1&origin=${effectiveUserCoords.lat},${effectiveUserCoords.lng}&destination=${activeRoute.target.location?.lat ?? activeRoute.target.lat},${activeRoute.target.location?.lng ?? activeRoute.target.lng}`
                        : googleMapsUrl(
                            activeRoute.target.location?.lat ?? activeRoute.target.lat,
                            activeRoute.target.location?.lng ?? activeRoute.target.lng,
                            activeRoute.target.name
                          )
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-stone-600 hover:text-stone-900 flex items-center gap-1 font-medium"
                  >
                    <ExternalLink className="w-3 h-3 text-stone-400" />
                    <span>Open in Google Maps</span>
                  </a>

                  {activeRoute.instructions?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="text-[11px] text-teal font-semibold flex items-center gap-0.5"
                    >
                      <span>{showInstructions ? 'Hide Steps' : 'Turn-by-turn'}</span>
                      {showInstructions ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Turn-by-Turn Instruction Panel (OpenStreetMap Directions style) */}
              {showInstructions && activeRoute?.instructions?.length > 0 && (
                <div className="max-h-48 overflow-y-auto mt-2 pt-2 border-t border-stone-100 space-y-1.5 text-[11px] text-stone-700">
                  {activeRoute.instructions.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 py-1 border-b border-stone-50 last:border-0">
                      <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-stone-900">{step.text}</div>
                        {step.distanceM > 0 && (
                          <div className="text-[10px] text-stone-400">
                            {step.distanceM > 1000
                              ? `${(step.distanceM / 1000).toFixed(1)} km`
                              : `${step.distanceM} m`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SCAN MODAL */}
      <ScanModal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        expectedPoint={scanModalMode}
        lotCode={selectedLotCode || activeCheckin?.lotCode || 'PKG-01'}
        onScanSuccess={(res) => {
          if (scanModalMode === 'in') {
            setActiveCheckin({
              lotCode: res.lotCode,
              enteredAt: new Date().toISOString(),
            });
            updateJourney({
              step: 2,
              lotCode: res.lotCode,
              lastParkedLotCode: res.lotCode,
            });
            showShuttleNotification(config.shuttleIntervalMin);
          } else {
            setActiveCheckin(null);
            updateJourney({ step: 3 });
          }
        }}
      />
    </Layout>
  );
}
