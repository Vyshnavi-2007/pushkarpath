import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import { subscribeSocket } from '../../lib/socket';
import {
  Car,
  MapPin,
  Users,
  Compass,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldAlert,
  Clock,
  Layers,
  ArrowUpRight,
  LogOut,
  QrCode,
  History,
} from 'lucide-react';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({ demoMode: false, sampleOccupancy: false });
  const [demoActionMsg, setDemoActionMsg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchConfig = async () => {
    try {
      const cfg = await api.config.get();
      setConfig(cfg || { demoMode: false, sampleOccupancy: false });
    } catch (err) {}
  };

  const fetchOverview = async () => {
    try {
      const data = await api.admin.getOverview();
      setOverview(data);
    } catch (err) {
      console.warn('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleOccupancy = async () => {
    setActionLoading(true);
    try {
      await api.admin.loadSampleOccupancy();
      setConfig((prev) => ({ ...prev, sampleOccupancy: true }));
      setDemoActionMsg({ success: true, text: 'Sample occupancy loaded across all 36 lots.' });
      fetchOverview();
    } catch (err) {
      setDemoActionMsg({ success: false, text: err.message || 'Failed to load sample occupancy' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setDemoActionMsg(null), 3000);
    }
  };

  const handleResetDemoData = async () => {
    setActionLoading(true);
    try {
      await api.admin.resetDemoData();
      setConfig((prev) => ({ ...prev, sampleOccupancy: false }));
      setDemoActionMsg({ success: true, text: 'Demo occupancy reset to 0 and demo pilgrims cleared.' });
      fetchOverview();
    } catch (err) {
      setDemoActionMsg({ success: false, text: err.message || 'Failed to reset demo data' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setDemoActionMsg(null), 3000);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchConfig();

    // Subscribe to live statistics and lot updates
    const unsubStats = subscribeSocket('stats:update', (newStats) => {
      setOverview((prev) => ({ ...prev, ...newStats }));
    });

    const unsubLot = subscribeSocket('lot:update', () => {
      fetchOverview();
    });

    return () => {
      unsubStats();
      unsubLot();
    };
  }, []);

  return (
    <Layout>
      {/* Admin Title Bar */}
      <div className="bg-stone-900 text-white px-4 sm:px-6 lg:px-8 py-5 border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-bold text-xl sm:text-2xl text-white">
                Command & Nodal Administration Dashboard
              </h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Live Sensor Telemetry
              </span>
              {/* While sampleOccupancy=true, show a small grey badge */}
              {config.sampleOccupancy && (
                <span className="bg-stone-700 text-stone-200 text-xs font-medium px-2.5 py-0.5 rounded-full border border-stone-600">
                  Sample occupancy (demo)
                </span>
              )}
            </div>
            <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
              Unified real-time management for Godavari Pushkaralu 2027 transit operations
            </p>
          </div>

          {/* Quick Shortcuts & Demo Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {config.demoMode && (
              <>
                <button
                  type="button"
                  onClick={handleLoadSampleOccupancy}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Set varied sample occupancy pattern across all 36 lots"
                >
                  Load sample occupancy (demo)
                </button>
                <button
                  type="button"
                  onClick={handleResetDemoData}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-semibold border border-stone-600 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Reset all lots to 0 occupied and clear demo pilgrims"
                >
                  Reset demo data
                </button>
              </>
            )}
            <Link
              to="/admin/lots"
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 border border-stone-700"
            >
              <MapPin className="w-3.5 h-3.5 text-turmeric" />
              <span>Manage Lots</span>
            </Link>
            <Link
              to="/admin/simulation"
              className="px-3 py-1.5 rounded-lg bg-teal hover:bg-teal-dark text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Simulation Lab</span>
            </Link>
          </div>
        </div>

        {/* Demo Action Toast Banner */}
        {demoActionMsg && (
          <div className="max-w-7xl mx-auto mt-3">
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold text-center ${
                demoActionMsg.success
                  ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-700'
                  : 'bg-rose-950/80 text-rose-200 border border-rose-700'
              }`}
            >
              {demoActionMsg.text}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Flat KPI Overview Cards (No Gradients, Left Border Styled) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Total Capacity */}
          <div className="bg-white rounded-xl border border-stone-200 border-l-4 border-l-stone-700 p-5 shadow-xs">
            <div className="text-xs font-medium text-stone-500">Total Capacity</div>
            <div className="font-heading font-bold text-2xl sm:text-3xl text-stone-900 mt-1">
              {overview?.totalCapacity?.toLocaleString() || '28,500'}
            </div>
            <div className="text-xs text-stone-500 mt-2">Designated bays across all 54 lots</div>
          </div>

          {/* Card 2: Vehicles Parked */}
          <div className="bg-white rounded-xl border border-stone-200 border-l-4 border-l-maroon p-5 shadow-xs">
            <div className="text-xs font-medium text-stone-500">Vehicles Parked</div>
            <div className="font-heading font-bold text-2xl sm:text-3xl text-maroon mt-1">
              {overview?.vehiclesParked?.toLocaleString() || '14,180'}
            </div>
            <div className="text-xs text-stone-500 mt-2">Active vehicles currently occupying bays</div>
          </div>

          {/* Card 3: Free Spaces */}
          <div className="bg-white rounded-xl border border-stone-200 border-l-4 border-l-emerald-600 p-5 shadow-xs">
            <div className="text-xs font-medium text-stone-500">Free Spaces</div>
            <div className="font-heading font-bold text-2xl sm:text-3xl text-emerald-700 mt-1">
              {overview?.freeSpaces?.toLocaleString() || '14,320'}
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-2">Available for incoming pilgrims</div>
          </div>

          {/* Card 4: Lots Open */}
          <div className="bg-white rounded-xl border border-stone-200 border-l-4 border-l-teal p-5 shadow-xs">
            <div className="text-xs font-medium text-stone-500">Lots Open</div>
            <div className="font-heading font-bold text-2xl sm:text-3xl text-teal mt-1">
              {overview?.lotsOpen ?? 52}
            </div>
            <div className="text-xs text-stone-500 mt-2">Accepting incoming pilgrim vehicles</div>
          </div>

          {/* Card 5: Lots Closed */}
          <div className="bg-white rounded-xl border border-stone-200 border-l-4 border-l-rose-600 p-5 shadow-xs">
            <div className="text-xs font-medium text-stone-500">Lots Closed</div>
            <div className="font-heading font-bold text-2xl sm:text-3xl text-rose-600 mt-1">
              {overview?.lotsClosed ?? 2}
            </div>
            <div className="text-xs text-stone-500 mt-2">Restricted or closed for VIP cordon</div>
          </div>

          {/* Card 6: Active Staff */}
          <div className="bg-white rounded-xl border border-stone-200 border-l-4 border-l-marigold p-5 shadow-xs">
            <div className="text-xs font-medium text-stone-500">Active Staff</div>
            <div className="font-heading font-bold text-2xl sm:text-3xl text-stone-900 mt-1">
              {overview?.activeStaff ?? 5}
            </div>
            <div className="text-xs text-stone-500 mt-2">Volunteers and officers currently on duty</div>
          </div>
        </div>

        {/* Today's Scan Counts Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h2 className="font-heading font-bold text-base sm:text-lg text-stone-900">
                Today's Checkpoint Activity
              </h2>
              <p className="text-xs text-stone-500">Total verified scan actions recorded today</p>
            </div>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Live Aggregate
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-center">
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <div className="text-xs text-emerald-800 font-medium">Valid Entries</div>
              <div className="font-heading font-bold text-2xl text-emerald-700 mt-1">
                {overview?.todayStats?.entries?.toLocaleString() || '4,120'}
              </div>
            </div>

            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
              <div className="text-xs text-blue-800 font-medium">Valid Exits</div>
              <div className="font-heading font-bold text-2xl text-blue-700 mt-1">
                {overview?.todayStats?.exits?.toLocaleString() || '2,890'}
              </div>
            </div>

            <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-100">
              <div className="text-xs text-rose-800 font-medium">Refusals (Full / Closed)</div>
              <div className="font-heading font-bold text-2xl text-rose-700 mt-1">
                {overview?.todayStats?.refusals?.toLocaleString() || '145'}
              </div>
            </div>
          </div>
        </div>

        {/* Crowd Pressure & Fullest Lots Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Crowd Pressure per Ghat */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h2 className="font-heading font-bold text-base sm:text-lg text-stone-900">
                  Crowd Pressure per Ghat
                </h2>
                <p className="text-xs text-stone-500">Dynamic crowd load estimation across ghat precincts</p>
              </div>
              <Link to="/admin/ghats" className="text-xs font-semibold text-teal hover:underline flex items-center gap-1">
                <span>All Ghats</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4 pt-1">
              {overview?.crowdPressureGhats?.map((ghat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-stone-900 font-heading">{ghat.name}</span>{' '}
                      <span className="text-teal font-medium font-heading">({ghat.nameTe})</span>
                    </div>
                    <span className="font-semibold" style={{ color: ghat.color }}>
                      {ghat.pressure}% ({ghat.level})
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${ghat.pressure}%`,
                        backgroundColor: ghat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Top 5 Fullest Lots */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h2 className="font-heading font-bold text-base sm:text-lg text-stone-900">
                  Top 5 Fullest Parking Grounds
                </h2>
                <p className="text-xs text-stone-500">Priority grounds requiring traffic police diversion</p>
              </div>
              <Link to="/admin/lots" className="text-xs font-semibold text-maroon hover:underline flex items-center gap-1">
                <span>View All 54</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4 pt-1">
              {overview?.fullestLots?.map((lot) => {
                const occ = lot.occupied || 0;
                const cap = lot.capacity || 100;
                const pct = Math.min(100, Math.round((occ / cap) * 100));

                let barColor = '#10b981';
                if (pct >= 90) barColor = '#ef4444';
                else if (pct >= 70) barColor = '#f59e0b';

                return (
                  <div key={lot.code} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-800">
                          {lot.code}
                        </span>
                        <span className="font-bold text-stone-900 font-heading">{lot.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-stone-800">{occ} / {cap}</span>{' '}
                        <span className="text-stone-500">({pct}%)</span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                      <span>{lot.sector}</span>
                      <Link
                        to={`/admin/lots/${lot.code}/correct`}
                        className="text-maroon font-semibold hover:underline"
                      >
                        Correct Count &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Administration Modules Hub */}
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 space-y-4">
          <h2 className="font-heading font-bold text-lg text-stone-900">
            Administrative Modules & Controls
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link
              to="/admin/lots"
              className="p-4 bg-white rounded-xl border border-stone-200 hover:border-maroon shadow-xs transition-colors text-center space-y-1.5"
            >
              <MapPin className="w-5 h-5 text-maroon mx-auto" />
              <div className="text-xs font-semibold text-stone-900">Lot Controls</div>
            </Link>

            <Link
              to="/admin/ghats"
              className="p-4 bg-white rounded-xl border border-stone-200 hover:border-teal shadow-xs transition-colors text-center space-y-1.5"
            >
              <Compass className="w-5 h-5 text-teal mx-auto" />
              <div className="text-xs font-semibold text-stone-900">Ghat Master</div>
            </Link>

            <Link
              to="/admin/staff"
              className="p-4 bg-white rounded-xl border border-stone-200 hover:border-marigold shadow-xs transition-colors text-center space-y-1.5"
            >
              <Users className="w-5 h-5 text-marigold mx-auto" />
              <div className="text-xs font-semibold text-stone-900">Duty Staff</div>
            </Link>

            <Link
              to="/admin/vehicles"
              className="p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-800 shadow-xs transition-colors text-center space-y-1.5"
            >
              <Car className="w-5 h-5 text-stone-700 mx-auto" />
              <div className="text-xs font-semibold text-stone-900">Vehicle Registry</div>
            </Link>

            <Link
              to="/admin/scans"
              className="p-4 bg-white rounded-xl border border-stone-200 hover:border-teal shadow-xs transition-colors text-center space-y-1.5"
            >
              <QrCode className="w-5 h-5 text-teal mx-auto" />
              <div className="text-xs font-semibold text-stone-900">Scan Logs</div>
            </Link>

            <Link
              to="/admin/audit"
              className="p-4 bg-white rounded-xl border border-stone-200 hover:border-maroon shadow-xs transition-colors text-center space-y-1.5"
            >
              <History className="w-5 h-5 text-maroon mx-auto" />
              <div className="text-xs font-semibold text-stone-900">Audit Trail</div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
