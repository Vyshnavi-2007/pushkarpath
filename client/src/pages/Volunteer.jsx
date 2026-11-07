import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { subscribeSocket } from '../lib/socket';
import {
  Shield,
  Clock,
  MapPin,
  RefreshCw,
  Users,
  Printer,
  History,
  AlertCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export default function Volunteer() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Lots list for admin dropdown
  const [allLots, setAllLots] = useState([]);
  const [selectedLotCode, setSelectedLotCode] = useState(
    user?.assignedLot && user.assignedLot !== 'ALL' ? user.assignedLot : 'PKG-01'
  );

  const [lot, setLot] = useState(null);
  const [posters, setPosters] = useState(null);
  const [checkedInPilgrims, setCheckedInPilgrims] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({ demoMode: false });
  const [inResultMsg, setInResultMsg] = useState(null);
  const [outResultMsg, setOutResultMsg] = useState(null);
  const [simulatingIn, setSimulatingIn] = useState(false);
  const [simulatingOut, setSimulatingOut] = useState(false);

  // Load config on mount
  useEffect(() => {
    api.config
      .get()
      .then((cfg) => setConfig(cfg || { demoMode: false }))
      .catch(() => {});
  }, []);

  const handleSimulateScan = async (dir) => {
    if (dir === 'in') {
      setSimulatingIn(true);
      try {
        const res = await api.scans.demoStaffScan({ lotCode: selectedLotCode, dir: 'in' });
        const occ = res.lot?.occupied ?? (lot ? lot.occupied + 1 : 1);
        const cap = res.lot?.capacity ?? lot?.capacity;
        if (res.lot) {
          setLot((prev) => ({ ...prev, ...res.lot }));
        }
        setInResultMsg({ success: true, text: `✓ IN recorded: ${occ}/${cap} occupied` });
      } catch (err) {
        setInResultMsg({ success: false, text: err.message || 'Refused to record IN scan' });
      } finally {
        setSimulatingIn(false);
        setTimeout(() => setInResultMsg(null), 3500);
      }
    } else {
      setSimulatingOut(true);
      try {
        const res = await api.scans.demoStaffScan({ lotCode: selectedLotCode, dir: 'out' });
        const occ = res.lot?.occupied ?? (lot ? Math.max(0, lot.occupied - 1) : 0);
        const cap = res.lot?.capacity ?? lot?.capacity;
        if (res.lot) {
          setLot((prev) => ({ ...prev, ...res.lot }));
        }
        setOutResultMsg({ success: true, text: `✓ OUT recorded: ${occ}/${cap} occupied` });
      } catch (err) {
        setOutResultMsg({ success: false, text: err.message || 'Refused to record OUT scan' });
      } finally {
        setSimulatingOut(false);
        setTimeout(() => setOutResultMsg(null), 3500);
      }
    }
  };

  // Load all lots if admin
  useEffect(() => {
    if (isAdmin) {
      api.lots.getAll().then((data) => setAllLots(data || [])).catch(() => {});
    }
  }, [isAdmin]);

  const fetchLotData = async (code) => {
    const lotCode = code || selectedLotCode;
    setLoading(true);
    try {
      const [lotData, postersData, pilgrimsData, scansData] = await Promise.all([
        api.lots.getByCode(lotCode),
        api.scans.getPosters(lotCode).catch(() => null),
        api.lots.getPilgrims(lotCode).catch(() => []),
        api.scans.getRecent(lotCode).catch(() => []),
      ]);
      setLot(lotData);
      setPosters(postersData);
      setCheckedInPilgrims(pilgrimsData || []);
      setRecentScans(scansData || []);
    } catch (err) {
      console.warn('Failed to fetch lot data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLotData(selectedLotCode);

    // Listen for live scan events
    const unsubScan = subscribeSocket('scan:new', (newScan) => {
      if (!newScan.lotCode || newScan.lotCode === selectedLotCode) {
        setRecentScans((prev) => [newScan, ...prev.slice(0, 9)]);
        api.lots.getByCode(selectedLotCode).then((l) => setLot(l)).catch(() => {});
        api.lots.getPilgrims(selectedLotCode).then((p) => setCheckedInPilgrims(p || [])).catch(() => {});
      }
    });

    const unsubLot = subscribeSocket('lot:update', (updatedLot) => {
      if (updatedLot && updatedLot.code === selectedLotCode) {
        setLot((prev) => ({ ...prev, ...updatedLot }));
      }
    });

    return () => {
      unsubScan();
      unsubLot();
    };
  }, [selectedLotCode]);

  // Occupancy calculations
  const capacity = lot?.capacity || 200;
  const occupied = lot?.occupied || 0;
  const free = Math.max(0, capacity - occupied);
  const occupancyPercent = Math.min(100, Math.round((occupied / capacity) * 100));

  let colorBarClass = 'bg-emerald-500';
  if (occupancyPercent >= 90) colorBarClass = 'bg-rose-500';
  else if (occupancyPercent >= 70) colorBarClass = 'bg-amber-500';

  return (
    <Layout>
      {/* Top Banner / Duty Header */}
      <div className="bg-stone-900 text-white px-4 sm:px-6 lg:px-8 py-5 border-b border-stone-800 shadow-md print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-xl sm:text-2xl text-white">
                Volunteer Gate Console
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                OFFICIAL DUTY
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-400 mt-1">
              <span>Staff: <strong>{user?.name || user?.staffId || 'Volunteer'}</strong></span>
              <span>•</span>
              <span className="text-turmeric font-semibold">{lot?.name || selectedLotCode}</span>
              <span>•</span>
              <span className="font-mono">({selectedLotCode})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin Lot Selector Dropdown */}
            {isAdmin && allLots.length > 0 && (
              <div className="relative">
                <select
                  value={selectedLotCode}
                  onChange={(e) => setSelectedLotCode(e.target.value)}
                  className="bg-stone-800 text-stone-200 border border-stone-700 rounded-lg text-xs font-semibold px-3 py-1.5 pr-7 focus:ring-1 focus:ring-amber-400 appearance-none cursor-pointer"
                >
                  {allLots.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-turmeric hover:bg-amber-400 text-maroon font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Posters</span>
            </button>

            <button
              type="button"
              onClick={() => fetchLotData(selectedLotCode)}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-stone-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Printable Posters Section */}
        <div id="printable-posters" className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200 print:hidden">
            <div>
              <h2 className="font-heading font-bold text-lg text-stone-900">
                Official Gate QR Posters
              </h2>
              <p className="text-xs text-stone-500">
                Mount these printed posters at your assigned lot entrance and exit. Pilgrims scan with their smartphone camera.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="text-xs text-maroon font-bold hover:underline flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Both</span>
            </button>
          </div>

          {posters ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1 print:gap-8">
              {/* IN Poster (Green Border) */}
              <div className="border-4 border-emerald-600 rounded-3xl p-6 sm:p-8 text-center space-y-4 bg-emerald-50/20 shadow-md flex flex-col items-center print:border-4 print:page-break-after">
                <div className="bg-emerald-600 text-white font-heading font-black text-2xl sm:text-3xl py-2.5 px-6 rounded-2xl uppercase tracking-widest w-full shadow-sm">
                  IN • ప్రవేశం
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-800 tracking-wider uppercase">
                    Godavari Pushkaralu 2027 • Rajamahendravaram
                  </div>
                  <h3 className="font-heading font-extrabold text-2xl text-stone-900">
                    {posters.lot?.name}
                  </h3>
                  <div className="text-xs font-mono font-bold text-stone-600">
                    LOT CODE: {posters.lot?.code} • CAPACITY: {posters.lot?.capacity}
                  </div>
                </div>

                {/* QR Code */}
                <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500 shadow-sm">
                  {posters.inPoster?.qrDataUrl ? (
                    <img
                      src={posters.inPoster.qrDataUrl}
                      alt="IN Entry QR Poster"
                      className="w-64 h-64 mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center text-xs text-stone-400">
                      Generating QR...
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="font-heading font-bold text-emerald-950 text-base sm:text-lg">
                    Parked? Scan this with your phone camera.
                  </p>
                  <p className="text-xs text-stone-500">
                    Occupancy increments by +1 atomically. Frees no extra slots.
                  </p>
                </div>

                <div className="w-full pt-2">
                  <a
                    href={posters.inPoster?.checkinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-mono text-emerald-700 bg-emerald-100/60 py-2 px-3 rounded-lg hover:underline truncate"
                  >
                    Direct URL: {posters.inPoster?.checkinUrl}
                  </a>
                </div>

                {/* IN QR Done button */}
                <div className="w-full pt-3 space-y-2 border-t border-emerald-200">
                  <button
                    type="button"
                    onClick={() => handleSimulateScan('in')}
                    disabled={simulatingIn}
                    className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white rounded-xl text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span>IN QR done</span>
                  </button>
                  <p className="text-[11px] text-stone-500 font-medium text-center">
                    Click when pilgrim scans IN — increments occupied count live
                  </p>
                  {inResultMsg && (
                    <div
                      className={`text-xs font-bold p-2.5 rounded-xl text-center shadow-xs animate-in fade-in ${
                        inResultMsg.success
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {inResultMsg.text}
                    </div>
                  )}
                </div>
              </div>

              {/* OUT Poster (Red Border) */}
              <div className="border-4 border-rose-600 rounded-3xl p-6 sm:p-8 text-center space-y-4 bg-rose-50/20 shadow-md flex flex-col items-center print:border-4 print:page-break-after">
                <div className="bg-rose-600 text-white font-heading font-black text-2xl sm:text-3xl py-2.5 px-6 rounded-2xl uppercase tracking-widest w-full shadow-sm">
                  OUT • నిష్క్రమణ
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-rose-800 tracking-wider uppercase">
                    Godavari Pushkaralu 2027 • Rajamahendravaram
                  </div>
                  <h3 className="font-heading font-extrabold text-2xl text-stone-900">
                    {posters.lot?.name}
                  </h3>
                  <div className="text-xs font-mono font-bold text-stone-600">
                    LOT CODE: {posters.lot?.code} • EXIT BARRIER
                  </div>
                </div>

                {/* QR Code */}
                <div className="p-4 bg-white rounded-2xl border-2 border-rose-500 shadow-sm">
                  {posters.outPoster?.qrDataUrl ? (
                    <img
                      src={posters.outPoster.qrDataUrl}
                      alt="OUT Exit QR Poster"
                      className="w-64 h-64 mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center text-xs text-stone-400">
                      Generating QR...
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="font-heading font-bold text-rose-950 text-base sm:text-lg">
                    Leaving? Scan this before you drive out.
                  </p>
                  <p className="text-xs text-stone-500">
                    Decrements occupied count by −1 and frees parking for arriving pilgrims.
                  </p>
                </div>

                <div className="w-full pt-2">
                  <a
                    href={posters.outPoster?.checkinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-mono text-rose-700 bg-rose-100/60 py-2 px-3 rounded-lg hover:underline truncate"
                  >
                    Direct URL: {posters.outPoster?.checkinUrl}
                  </a>
                </div>

                {/* OUT QR Done button */}
                <div className="w-full pt-3 space-y-2 border-t border-rose-200">
                  <button
                    type="button"
                    onClick={() => handleSimulateScan('out')}
                    disabled={simulatingOut}
                    className="w-full py-3 px-4 bg-rose-700 hover:bg-rose-800 active:scale-[0.99] text-white rounded-xl text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-300 animate-pulse" />
                    <span>OUT QR done</span>
                  </button>
                  <p className="text-[11px] text-stone-500 font-medium text-center">
                    Click when pilgrim scans OUT — decrements occupied count live
                  </p>
                  {outResultMsg && (
                    <div
                      className={`text-xs font-bold p-2.5 rounded-xl text-center shadow-xs animate-in fade-in ${
                        outResultMsg.success
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {outResultMsg.text}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
              <RefreshCw className="w-6 h-6 animate-spin text-maroon mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-700">Loading gate posters...</p>
            </div>
          )}
        </div>

        {/* Live Lot Telemetry & Pilgrims Inside (Screen only) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start print:hidden">
          {/* Live Occupancy Bar Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900">
                  {lot?.name || 'Assigned Parking Lot'}
                </h3>
                <div className="text-xs text-stone-500">{lot?.sector} • {lot?.category}</div>
              </div>
              <span className="font-mono text-xs font-semibold bg-stone-100 px-2 py-0.5 rounded text-stone-700">
                {selectedLotCode}
              </span>
            </div>

            {/* Occupancy bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1.5">
                <span>Occupancy: {occupancyPercent}%</span>
                <span className={free > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                  {free} Free Spaces
                </span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${colorBarClass}`}
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
            </div>

            {/* Numbers Grid */}
            <div className="grid grid-cols-3 gap-3 text-center pt-2">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="text-xs text-stone-500">Total Capacity</div>
                <div className="font-heading font-bold text-lg text-stone-900 mt-0.5">{capacity}</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="text-xs text-stone-500">Vehicles Parked</div>
                <div className="font-heading font-bold text-lg text-stone-900 mt-0.5">{occupied}</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="text-xs text-stone-500">Available Spaces</div>
                <div className="font-heading font-bold text-lg text-emerald-700 mt-0.5">{free}</div>
              </div>
            </div>

            <div className="p-2.5 bg-stone-50 rounded-lg text-[11px] text-stone-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>Volunteers cannot manually override counts. Occupancy is updated automatically as pilgrims scan gate posters.</span>
            </div>
          </div>

          {/* Pilgrims Currently Checked In & Scans Log */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pilgrims Checked In */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-maroon" />
                  <h3 className="font-heading font-bold text-base text-stone-900">
                    Pilgrims Checked In Now ({checkedInPilgrims.length})
                  </h3>
                </div>
                <span className="text-xs text-stone-400">Active Check-ins</span>
              </div>

              {checkedInPilgrims.length === 0 ? (
                <p className="text-xs text-stone-500 py-6 text-center">No pilgrims currently checked in to this bay.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {checkedInPilgrims.map((p, i) => (
                    <div
                      key={p._id || i}
                      className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg text-xs border border-stone-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900">{p.phone}</span>
                        <span className="text-stone-500 font-sans">• {p.name || 'Pilgrim'}</span>
                      </div>
                      <span className="text-[11px] text-stone-400 font-mono">
                        {p.activeCheckin?.enteredAt
                          ? 'Entered ' + new Date(p.activeCheckin.enteredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Parked'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Scans Log (Live via Socket.IO) */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-teal" />
                  <h3 className="font-heading font-bold text-base text-stone-900">
                    Recent Scans at Checkpoint
                  </h3>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Live Feed
                </span>
              </div>

              {recentScans.length === 0 ? (
                <p className="text-xs text-stone-500 py-6 text-center">No scans recorded yet for this session.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {recentScans.slice(0, 8).map((scan, i) => {
                    const isRefused = scan.type === 'REFUSED' || scan.status === 'refused';
                    return (
                      <div
                        key={scan.id || i}
                        className={`flex items-center justify-between p-2.5 rounded-lg text-xs border ${
                          isRefused ? 'bg-rose-50 border-rose-200' : 'bg-stone-50 border-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                              isRefused
                                ? 'bg-rose-200 text-rose-900'
                                : scan.type === 'ENTRY' || scan.point === 'entry'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isRefused ? 'REFUSED' : (scan.type || (scan.point === 'entry' ? 'ENTRY' : 'EXIT'))}
                          </span>
                          <span className="font-mono font-bold text-stone-800">
                            {scan.vehicleNo || 'PILGRIM'}
                          </span>
                          {scan.reason && (
                            <span className="text-[11px] text-stone-500 font-sans truncate max-w-xs">
                              • {scan.reason}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-stone-500 text-[11px]">
                          <span>
                            {scan.timestamp || scan.createdAt
                              ? new Date(scan.timestamp || scan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Just now'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
