import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import MapView from '../components/map/MapView';
import RouteDisplay from '../components/map/RouteDisplay';
import ScanModal from '../components/ScanModal';
import { api } from '../lib/api';
import { googleMapsUrl, haversineDistanceM, distanceToPolylineM, DEMO_START } from '../lib/geo';
import {
  Navigation,
  Volume2,
  VolumeX,
  ExternalLink,
  Play,
  Square,
  ArrowLeft,
  Car,
  Footprints,
  Compass,
  AlertTriangle,
  MapPin,
  CheckCircle,
  Sparkles,
  QrCode,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';

const DEMO_DRIVE_SECONDS = 25;

// Helper to compute cumulative distance along route coordinates
function getPolylineMetrics(polyline) {
  if (!polyline || polyline.length === 0) return { dists: [0], total: 0 };
  const dists = [0];
  let total = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = haversineDistanceM(
      polyline[i][0], polyline[i][1],
      polyline[i + 1][0], polyline[i + 1][1]
    );
    total += d;
    dists.push(total);
  }
  return { dists, total };
}

// Interpolate exact [lat, lng] along polyline for any progress fraction [0..1]
function interpolatePosition(polyline, dists, total, fraction) {
  if (!polyline || polyline.length === 0) return [17.0005, 81.7800];
  if (fraction <= 0) return polyline[0];
  if (fraction >= 1) return polyline[polyline.length - 1];

  const targetDist = fraction * total;
  let idx = 0;
  while (idx < dists.length - 1 && dists[idx + 1] < targetDist) {
    idx++;
  }

  const p1 = polyline[idx];
  const p2 = polyline[Math.min(idx + 1, polyline.length - 1)];
  const segDist = (dists[idx + 1] || total) - dists[idx];
  const segFraction = segDist > 0 ? (targetDist - dists[idx]) / segDist : 0;

  return [
    p1[0] + (p2[0] - p1[0]) * segFraction,
    p1[1] + (p2[1] - p1[1]) * segFraction
  ];
}

export default function Navigate() {
  const { lotCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Target coordinates and metadata
  const [target, setTarget] = useState({
    lat: parseFloat(searchParams.get('lat') || '17.0005'),
    lng: parseFloat(searchParams.get('lng') || '81.7838'),
    name: searchParams.get('name') || 'Destination',
    lotCode: lotCode || searchParams.get('lotCode') || ''
  });

  const nextAction = searchParams.get('next'); // 'scan-in' | 'at-ghat' | 'scan-out' | 'return-home'
  const isReturnTrip = nextAction === 'return-home';
  const initialMode = searchParams.get('mode') === 'walking' ? 'walking' : 'driving';

  // Explicit start coordinates if passed (e.g. from return route lot or walk from lot)
  const explicitStart = useMemo(() => {
    const fLat = parseFloat(searchParams.get('fromLat'));
    const fLng = parseFloat(searchParams.get('fromLng'));
    if (!isNaN(fLat) && !isNaN(fLng)) {
      return {
        lat: fLat,
        lng: fLng,
        name: searchParams.get('fromName') || 'Starting Lot'
      };
    }
    return null;
  }, [searchParams]);

  const [travelMode, setTravelMode] = useState(initialMode);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Live GPS state
  const [liveGps, setLiveGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(!isReturnTrip);
  const [gpsError, setGpsError] = useState(null);
  const [useDemoStart, setUseDemoStart] = useState(false); // NEVER saved to storage

  // Routing state
  const [route, setRoute] = useState(null);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState(null);

  // Guidance state
  const [stepIndex, setStepIndex] = useState(0);
  const [remainingDistM, setRemainingDistM] = useState(0);
  const [remainingTimeMin, setRemainingTimeMin] = useState(0);

  // Demo Drive Simulation state
  const [demoDriveActive, setDemoDriveActive] = useState(false);
  const [simulatedPos, setSimulatedPos] = useState(null);
  const simIntervalRef = useRef(null);

  // Camera follow center
  const [cameraCenter, setCameraCenter] = useState(null);

  // Off-route detection
  const [isOffRoute, setIsOffRoute] = useState(false);
  const offRouteCountRef = useRef(0);
  const lastRerouteTimeRef = useRef(0);

  // Arrival and Scan modal
  const [hasArrived, setHasArrived] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // If lotCode passed via URL path, load lot coordinates
  useEffect(() => {
    if (lotCode) {
      api.lots.getByCode(lotCode).then((l) => {
        if (l) {
          setTarget({
            lat: l.location?.lat ?? l.lat,
            lng: l.location?.lng ?? l.lng,
            name: l.name,
            lotCode: l.code
          });
        }
      }).catch(() => {});
    }
  }, [lotCode]);

  // LIVE GPS WATCHER
  useEffect(() => {
    if (isReturnTrip && explicitStart) {
      setGpsLoading(false);
      return;
    }

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      const msg = 'Location needs https or localhost';
      console.warn('[PushkarPath Navigation]', msg);
      setGpsError(msg);
      setGpsLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser.';
      setGpsError(msg);
      setGpsLoading(false);
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed
        };
        console.log('[PushkarPath Navigation] Live GPS fix acquired:', coords);
        setLiveGps(coords);
        setGpsLoading(false);
        setGpsError(null);
      },
      (err) => {
        setGpsLoading(false);
        let errorMsg = 'Unable to acquire GPS fix.';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please allow GPS access in your browser.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'Location signal unavailable. Ensure device GPS is turned on.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'GPS acquisition timed out.';
        }
        console.warn('[PushkarPath Navigation] GPS error:', errorMsg);
        setGpsError(errorMsg);
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
  }, [isReturnTrip, explicitStart]);

  // Determine effective starting point according to rules:
  // - Return trip: start from parking lot checked in to (explicitStart)
  // - Demo start: if user explicitly toggled demo start on this screen
  // - Live GPS: start from live GPS position (waits for first fix)
  // - Walk from lot to ghat: start from GPS, or fallback to lot if no GPS fix
  const effectiveStart = useMemo(() => {
    if (isReturnTrip && explicitStart) {
      return {
        lat: explicitStart.lat,
        lng: explicitStart.lng,
        name: explicitStart.name || 'Parked Lot',
        type: 'lot',
        label: `From: ${explicitStart.name || 'Parked Lot'}`
      };
    }

    if (useDemoStart) {
      return {
        lat: DEMO_START.lat,
        lng: DEMO_START.lng,
        name: DEMO_START.name,
        type: 'demo',
        label: 'Demo start'
      };
    }

    if (liveGps && typeof liveGps.lat === 'number') {
      const acc = liveGps.accuracy ? ` (±${Math.round(liveGps.accuracy)} m)` : '';
      return {
        lat: liveGps.lat,
        lng: liveGps.lng,
        accuracy: liveGps.accuracy,
        name: 'Your location',
        type: 'gps',
        label: `Your location${acc}`
      };
    }

    // Walking from lot to ghat fallback if no GPS fix
    if (nextAction === 'at-ghat' && travelMode === 'walking' && explicitStart) {
      return {
        lat: explicitStart.lat,
        lng: explicitStart.lng,
        name: explicitStart.name || 'Parking Lot',
        type: 'lot-fallback',
        label: `From: ${explicitStart.name || 'Parking Lot'}`
      };
    }

    return null; // Never invent a position
  }, [isReturnTrip, explicitStart, useDemoStart, liveGps, nextAction, travelMode]);

  // Voice prompts are used only during the explicitly started demo navigation.
  const speakInstruction = useCallback((text) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices() || [];
      const englishVoice = voices.find((voice) => voice.lang === 'en-IN')
        || voices.find((voice) => voice.lang === 'en-US')
        || voices.find((voice) => voice.lang.toLowerCase().startsWith('en-'));
      utterance.lang = englishVoice?.lang || 'en-IN';
      if (englishVoice) utterance.voice = englishVoice;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[PushkarPath Navigation] Speech synthesis error:', e);
    }
  }, [voiceEnabled]);

  // Route calculation
  const fetchRoute = useCallback(async (startPoint) => {
    const origin = startPoint || effectiveStart;
    if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
      return;
    }
    if (typeof target.lat !== 'number' || typeof target.lng !== 'number') {
      return;
    }

    console.log('[PushkarPath Navigation] Start coordinates actually used:', {
      lat: origin.lat,
      lng: origin.lng,
      type: origin.type || (origin === explicitStart ? 'explicitStart' : 'liveGps')
    });

    setRoutingLoading(true);
    setRoutingError(null);

    try {
      const data = await api.map.getRoute({
        from: { lat: origin.lat, lng: origin.lng },
        to: { lat: target.lat, lng: target.lng },
        profile: travelMode,
        alternatives: true
      });

      setRoute(data);
      const metrics = getPolylineMetrics(data.polyline);
      setRemainingDistM(metrics.total || Math.round((data.distanceKm || 0) * 1000));
      setRemainingTimeMin(data.durationMin || 1);
      setStepIndex(0);
      setIsOffRoute(false);
      offRouteCountRef.current = 0;
      lastRerouteTimeRef.current = Date.now();
      setCameraCenter([origin.lat, origin.lng]);

    } catch (err) {
      setRoutingError(err.message || 'Routing server is temporarily unavailable.');
    } finally {
      setRoutingLoading(false);
    }
  }, [effectiveStart, target, travelMode, explicitStart]);

  // Request route whenever effectiveStart is established or changed
  useEffect(() => {
    if (effectiveStart && !demoDriveActive) {
      fetchRoute(effectiveStart);
    }
  }, [effectiveStart, travelMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Off-route detection when Demo Drive is OFF and live GPS is active (> 60m for 3 fixes, max once per 15s)
  useEffect(() => {
    if (demoDriveActive || !route?.polyline?.length || !liveGps || effectiveStart?.type !== 'gps') {
      return;
    }

    const distM = distanceToPolylineM(liveGps, route.polyline);
    if (distM > 60) {
      offRouteCountRef.current += 1;
      if (offRouteCountRef.current >= 3) {
        const now = Date.now();
        if (now - lastRerouteTimeRef.current >= 15000) {
          console.log('[PushkarPath Navigation] Off route by', distM, 'm for 3 fixes. Auto re-routing...');
          lastRerouteTimeRef.current = now;
          offRouteCountRef.current = 0;
          setIsOffRoute(true);
          fetchRoute(liveGps);
        }
      }
    } else {
      offRouteCountRef.current = 0;
      if (isOffRoute) setIsOffRoute(false);
    }
  }, [liveGps, route, demoDriveActive, effectiveStart, fetchRoute, isOffRoute]);

  // Handle Arrival at destination
  const handleArrival = useCallback((announce = false) => {
    setHasArrived(true);
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setDemoDriveActive(false);
    if (announce) speakInstruction(`You have arrived at ${target.name}.`);

    if (nextAction === 'scan-in' || target.lotCode) {
      setIsScanModalOpen(true);
    }
  }, [nextAction, target, speakInstruction]);

  // Problem 2: Demo drive simulation
  // DEMO_DRIVE_SECONDS = 25.
  // Moves every 250ms by route length / (DEMO_DRIVE_SECONDS * 4).
  // Camera follows marker at zoom 16.
  const startDemoDrive = () => {
    if (!route || !route.polyline || route.polyline.length === 0) return;
    setDemoDriveActive(true);
    setHasArrived(false);

    const poly = route.polyline;
    const { dists, total } = getPolylineMetrics(poly);
    const totalTicks = DEMO_DRIVE_SECONDS * 4; // 100 ticks of 250ms
    let currentTick = 0;
    let lastSpokenIndex = -1;

    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    simIntervalRef.current = setInterval(() => {
      currentTick++;
      const fraction = Math.min(1, currentTick / totalTicks);
      const pos = interpolatePosition(poly, dists, total, fraction);

      setSimulatedPos(pos);
      setCameraCenter(pos); // Camera follows marker

      // Remaining metrics
      const remM = Math.max(0, Math.round(total * (1 - fraction)));
      setRemainingDistM(remM);
      setRemainingTimeMin(Math.max(1, Math.round((route.durationMin || 5) * (1 - fraction))));

      // Speak instruction when it changes
      if (route.instructions && route.instructions.length > 0) {
        const stepIdx = Math.min(
          route.instructions.length - 1,
          Math.floor(fraction * route.instructions.length)
        );
        if (stepIdx !== lastSpokenIndex) {
          lastSpokenIndex = stepIdx;
          setStepIndex(stepIdx);
          speakInstruction(route.instructions[stepIdx].text);
        }
      }

      if (fraction >= 1) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
        setDemoDriveActive(false);
        handleArrival(true);
      }
    }, 250);
  };

  const stopDemoDrive = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setDemoDriveActive(false);
  };

  // "Arrive now" button: jumps immediately to destination and triggers arrival
  const handleArriveNow = () => {
    stopDemoDrive();
    if (route?.polyline?.length) {
      const destPoint = route.polyline[route.polyline.length - 1];
      setSimulatedPos(destPoint);
      setCameraCenter(destPoint);
    }
    setRemainingDistM(0);
    setRemainingTimeMin(0);
    handleArrival();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDemoDrive();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleScanSuccess = () => {
    setIsScanModalOpen(false);
    sessionStorage.setItem('pushkarpath_shuttle_toast', '1');
    sessionStorage.setItem('pushkarpath_walk_route', '1');
    navigate('/pilgrim');
  };

  const handleDoneAtGhat = () => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('pushkarpath_journey') || '{}');
      stored.atGhat = true;
      stored.step = 3;
      sessionStorage.setItem('pushkarpath_journey', JSON.stringify(stored));
    } catch (e) {}
    navigate('/pilgrim');
  };

  // Determine current map center
  const activePosition = useMemo(() => {
    if (demoDriveActive && simulatedPos) return simulatedPos;
    if (cameraCenter) return cameraCenter;
    if (effectiveStart) return [effectiveStart.lat, effectiveStart.lng];
    return [target.lat, target.lng];
  }, [demoDriveActive, simulatedPos, cameraCenter, effectiveStart, target]);

  // Current turn instruction
  const currentInstruction = (route && route.instructions && route.instructions[stepIndex]) || {
    text: `Proceed to ${target.name}`,
    distanceM: remainingDistM
  };

  // Live GPS Car Marker (follows real GPS when Demo Drive is OFF)
  const gpsVehicleIcon = L.divIcon({
    className: 'gps-vehicle-marker',
    html: `
      <div style="
        background: #2563eb;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      ">
        ${travelMode === 'walking' ? '🚶' : '🚗'}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  // Demo Drive Moving Marker
  const simVehicleIcon = L.divIcon({
    className: 'sim-veh-marker',
    html: `
      <div style="
        background: ${travelMode === 'walking' ? '#0F5C5C' : '#7A1424'};
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid #F6C945;
        box-shadow: 0 4px 12px rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        animation: pulse 1.5s infinite;
      ">
        ${travelMode === 'walking' ? '🚶' : '🚗'}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  return (
    <div className="h-screen flex flex-col bg-stone-900 text-stone-100 overflow-hidden select-none">
      {/* Top Navigation HUD Header */}
      <div className="bg-stone-950/95 backdrop-blur-md border-b border-stone-800 px-4 py-3 sm:px-6 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/pilgrim')}
                className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl transition-colors border border-stone-700"
                title="Return to Pilgrim Journey"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-turmeric uppercase tracking-wider">
                    {travelMode === 'walking' ? 'Walking Directions' : 'PushkarPath Road Guidance'}
                  </span>

                  {/* STARTING FROM CHIP */}
                  {effectiveStart ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isReturnTrip) {
                          setUseDemoStart((prev) => !prev);
                        }
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                        effectiveStart.type === 'gps'
                          ? 'bg-blue-900/60 text-blue-200 border-blue-500/50 hover:bg-blue-800/80 cursor-pointer'
                          : 'bg-amber-900/60 text-amber-200 border-amber-500/50 hover:bg-amber-800/80 cursor-pointer'
                      }`}
                      title={!isReturnTrip ? 'Tap to switch between Your Location and Demo Start' : 'Return origin is your parked lot'}
                    >
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>Starting from: {effectiveStart.label}</span>
                      {!isReturnTrip && <RefreshCw className="w-2.5 h-2.5 opacity-60 ml-0.5" />}
                    </button>
                  ) : gpsLoading ? (
                    <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full border border-stone-700 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin text-turmeric" />
                      <span>Acquiring GPS location...</span>
                    </span>
                  ) : null}
                </div>

                <h1 className="font-heading font-black text-base sm:text-lg text-white truncate max-w-[220px] sm:max-w-md">
                  {target.name}
                </h1>
              </div>
            </div>

            {/* Voice Prompt Toggle (Mobile) */}
            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`sm:hidden p-2 rounded-xl transition-colors ${
                voiceEnabled ? 'bg-turmeric text-maroon font-bold' : 'bg-black/30 text-stone-400'
              }`}
              title={voiceEnabled ? 'Mute voice prompts' : 'Enable voice prompts (en-IN)'}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Turn Banner */}
            <div className="bg-maroon-dark/90 border border-marigold/40 rounded-xl px-3.5 py-1.5 flex items-center gap-2 flex-1 sm:flex-none max-w-md">
              <Navigation className="w-4 h-4 text-turmeric rotate-45 shrink-0" />
              <div className="text-xs truncate">
                <span className="font-bold text-white">{currentInstruction.text}</span>
              </div>
            </div>

            {/* Voice Prompt Toggle (Desktop) */}
            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`hidden sm:flex p-2 rounded-xl transition-colors ${
                voiceEnabled ? 'bg-turmeric text-maroon font-bold' : 'bg-black/30 text-stone-400'
              }`}
              title={voiceEnabled ? 'Mute voice prompts' : 'Enable voice prompts (en-IN)'}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* GPS Location Warning / Demo Start Offer Banner */}
      {gpsError && !effectiveStart && (
        <div className="bg-amber-500/90 text-stone-950 px-4 py-2.5 z-40 border-b border-amber-600 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-maroon" />
              <span className="font-semibold">{gpsError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setUseDemoStart(true);
                setGpsError(null);
              }}
              className="px-3 py-1 bg-stone-950 hover:bg-black text-turmeric font-bold rounded-lg text-xs shadow-xs transition-colors shrink-0"
            >
              Use Demo start (Rajahmundry RTC)
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Map View */}
      <div className="flex-1 relative w-full h-full">
        <MapView
          center={activePosition}
          zoom={16}
          bounds={!demoDriveActive && route?.polyline?.length ? route.polyline : null}
          className="w-full h-full"
        >
          {/* Live GPS Dot when Demo Drive is OFF */}
          {!demoDriveActive && effectiveStart && (
            <Marker position={[effectiveStart.lat, effectiveStart.lng]} icon={gpsVehicleIcon}>
              <Popup>
                <div className="text-xs font-bold font-sans">
                  {effectiveStart.type === 'gps' ? 'Your live GPS location' : effectiveStart.name}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Simulated Demo Drive Moving Marker */}
          {demoDriveActive && simulatedPos && (
            <Marker position={simulatedPos} icon={simVehicleIcon}>
              <Tooltip permanent direction="top" offset={[0, -20]}>
                <span className="font-sans text-xs font-bold bg-stone-900 text-turmeric px-1.5 py-0.5 rounded shadow">
                  Demo drive — simulated
                </span>
              </Tooltip>
            </Marker>
          )}

          {/* Active Polyline & Destination Marker */}
          {route && (
            <RouteDisplay
              route={route}
              destinationName={target.name}
              destinationPoint={[target.lat, target.lng]}
            />
          )}
        </MapView>

        {/* Arrival Overlays */}
        {hasArrived && (
          <div className="absolute inset-x-4 top-6 z-40 max-w-md mx-auto bg-stone-900/95 border-2 border-turmeric rounded-2xl p-6 shadow-2xl backdrop-blur-md text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-turmeric/20 text-turmeric flex items-center justify-center mx-auto border-2 border-turmeric">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xl text-white">Arrived at Destination</h3>
              <p className="text-xs text-amber-200 mt-1">{target.name}</p>
            </div>

            {/* Arrival action at Lot -> Scan IN */}
            {(nextAction === 'scan-in' || (!nextAction && target.lotCode)) && (
              <button
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <QrCode className="w-4 h-4" />
                <span>Scan IN QR at Gate</span>
              </button>
            )}

            {/* Arrival at Ghat -> "I have reached the ghat" */}
            {nextAction === 'at-ghat' && (
              <button
                type="button"
                onClick={handleDoneAtGhat}
                className="w-full py-3 bg-turmeric hover:bg-amber-400 text-maroon font-heading font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>I have reached the ghat — Plan my return</span>
              </button>
            )}

            {/* Arrival on Return Trip -> Thank You Blessing & Return Tick */}
            {nextAction === 'return-home' ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl space-y-1 text-center">
                  <div className="text-sm font-heading font-black text-turmeric flex items-center justify-center gap-1.5">
                    <span>🙏 Thank You for Visiting Godavari Pushkaralu!</span>
                  </div>
                  <p className="text-xs text-stone-200 leading-relaxed">
                    May Lord Shiva and Holy River Godavari bestow health, peace, and abundance on you and your family. Safe journey home!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const saved = JSON.parse(sessionStorage.getItem('pushkarpath_journey') || '{}');
                      sessionStorage.setItem('pushkarpath_journey', JSON.stringify({ ...saved, returnCompleted: true, step: 3 }));
                    } catch (e) {}
                    navigate('/pilgrim');
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>Mark Return Done & View Pilgrimage Summary</span>
                </button>
              </div>
            ) : (nextAction === 'scan-out' || (!nextAction && !target.lotCode)) && (
              <div className="space-y-2">
                <p className="text-xs text-stone-300">You have safely reached your destination.</p>
                <button
                  type="button"
                  onClick={() => navigate('/pilgrim')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  Return to Home
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/pilgrim')}
              className="block w-full text-xs text-stone-400 hover:text-white pt-1"
            >
              Back to Journey
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation Control Bar */}
      <div className="bg-stone-900/95 backdrop-blur-md border-t border-stone-800 p-4 sm:px-8 z-40 shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <div className="text-2xl font-black font-heading text-white">
                {remainingTimeMin} <span className="text-xs font-normal text-stone-400">mins</span>
              </div>
              <div className="text-xs font-semibold text-turmeric mt-0.5">
                {remainingDistM > 1000 ? `${(remainingDistM / 1000).toFixed(1)} km` : `${remainingDistM} m`} remaining
              </div>
            </div>

            <div className="flex items-center bg-stone-800 p-1 rounded-xl border border-stone-700">
              <button
                type="button"
                onClick={() => {
                  setTravelMode('driving');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  travelMode === 'driving' ? 'bg-turmeric text-maroon shadow-xs' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Drive</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTravelMode('walking');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  travelMode === 'walking' ? 'bg-teal text-white shadow-xs' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>Walk</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            {/* Demo Drive Button (25 seconds for whole route) */}
            {!demoDriveActive ? (
              <button
                type="button"
                onClick={startDemoDrive}
                disabled={!route || hasArrived}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Demo navigation</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopDemoDrive}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Demo</span>
              </button>
            )}

            {/* ONLY ONE shortcut button: "Arrive now" */}
            <button
              type="button"
              onClick={handleArriveNow}
              disabled={hasArrived}
              className="flex-1 sm:flex-none px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
              title="Instantly jump to destination and trigger arrival"
            >
              <Sparkles className="w-3.5 h-3.5 text-maroon" />
              <span>Arrive now</span>
            </button>

            {/* Google Maps link (key-free URL) */}
            <a
              href={
                effectiveStart
                  ? `https://www.google.com/maps/dir/?api=1&origin=${effectiveStart.lat},${effectiveStart.lng}&destination=${target.lat},${target.lng}`
                  : googleMapsUrl(target.lat, target.lng, target.name)
              }
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-stone-700 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </a>
          </div>
        </div>
      </div>

      {/* Scan Modal */}
      <ScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        expectedPoint={nextAction === 'scan-out' ? 'out' : 'in'}
        lotCode={target.lotCode || 'PKG-01'}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
