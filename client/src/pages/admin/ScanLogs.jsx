import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import { subscribeSocket } from '../../lib/socket';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Car
} from 'lucide-react';

export default function AdminScanLogs() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('all'); // all, accepted, refused
  const [pointFilter, setPointFilter] = useState('all'); // all, entry, exit

  const fetchScans = async () => {
    try {
      setLoading(true);
      const data = await api.scans.getAll();
      setScans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load scan logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();

    const unsubScan = subscribeSocket('scan:new', (newScan) => {
      setScans((prev) => [newScan, ...prev]);
    });

    return () => {
      unsubScan();
    };
  }, []);

  const filteredScans = scans.filter((scan) => {
    // Result filter
    if (resultFilter === 'accepted' && !scan.accepted) return false;
    if (resultFilter === 'refused' && scan.accepted) return false;

    // Point filter
    if (pointFilter !== 'all' && scan.point !== pointFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchVehicle = (scan.vehicleNo || scan.vehicle?.vehicleNo || '').toLowerCase().includes(q);
      const matchStaff = (scan.staffId || scan.volunteerId || '').toLowerCase().includes(q);
      const matchLot = (scan.lotCode || '').toLowerCase().includes(q);
      const matchReason = (scan.reason || '').toLowerCase().includes(q);
      if (!matchVehicle && !matchStaff && !matchLot && !matchReason) return false;
    }

    return true;
  });

  const totalScans = scans.length;
  const acceptedCount = scans.filter((s) => s.accepted).length;
  const refusedCount = scans.filter((s) => !s.accepted).length;
  const entryCount = scans.filter((s) => s.point === 'entry').length;
  const exitCount = scans.filter((s) => s.point === 'exit').length;

  return (
    <Layout title="QR Scan Audit Logs" activeTab="admin">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link to="/admin" className="hover:text-maroon">Admin Dashboard</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">QR Scans</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <QrCode className="w-7 h-7 text-maroon" />
              Live QR Scan Transactions
            </h1>
            <p className="text-sm text-gray-600">
              Real-time audit log of all entry and exit QR scans processed by on-ground volunteers.
            </p>
          </div>
          <button
            onClick={fetchScans}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">Total Scans</span>
            <div className="text-2xl font-bold text-gray-900 mt-1">{totalScans}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{acceptedCount}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
            <span className="text-xs text-rose-700 font-medium flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Refused
            </span>
            <div className="text-2xl font-bold text-rose-700 mt-1">{refusedCount}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
            <span className="text-xs text-blue-700 font-medium flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" /> Entries
            </span>
            <div className="text-2xl font-bold text-blue-700 mt-1">{entryCount}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
            <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Exits
            </span>
            <div className="text-2xl font-bold text-amber-700 mt-1">{exitCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vehicle number, staff ID, lot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </div>
            {/* Result Filter */}
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-maroon"
            >
              <option value="all">All Results</option>
              <option value="accepted">Accepted Only</option>
              <option value="refused">Refused Only</option>
            </select>

            {/* Point Filter */}
            <select
              value={pointFilter}
              onChange={(e) => setPointFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-maroon"
            >
              <option value="all">All Points</option>
              <option value="entry">Entry Point</option>
              <option value="exit">Exit Point</option>
            </select>
          </div>
        </div>

        {/* Scan Log Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Vehicle</th>
                  <th className="px-6 py-3">Point</th>
                  <th className="px-6 py-3">Parking Area</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Volunteer / Staff</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Details / Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      Loading scan transactions...
                    </td>
                  </tr>
                ) : filteredScans.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      No scan transactions match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredScans.map((scan, idx) => {
                    const isAccepted = scan.accepted !== undefined ? scan.accepted : scan.type !== 'REJECTED';
                    const isEntry = scan.point === 'entry' || scan.type === 'ENTRY';
                    const rawTime = scan.timestamp || scan.createdAt;
                    const timeStr = rawTime
                      ? new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : 'Just now';

                    let sourceLabel = 'Poster QR';
                    let sourceBadgeClass = 'bg-stone-100 text-stone-700';
                    if (scan.source === 'demo-staff-button') {
                      sourceLabel = 'Demo (staff)';
                      sourceBadgeClass = 'bg-purple-100 text-purple-800 font-bold';
                    } else if (scan.source === 'demo-button') {
                      sourceLabel = 'Demo (pilgrim)';
                      sourceBadgeClass = 'bg-amber-100 text-amber-800 font-semibold';
                    } else if (scan.source === 'volunteer-scan') {
                      sourceLabel = 'Volunteer Scan';
                      sourceBadgeClass = 'bg-blue-100 text-blue-800 font-medium';
                    } else if (scan.source === 'sim') {
                      sourceLabel = 'Simulation';
                      sourceBadgeClass = 'bg-teal/15 text-teal font-medium';
                    }

                    return (
                      <tr key={scan.id || scan._id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                          {timeStr}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                            <Car className="w-4 h-4 text-gray-400" />
                            {scan.vehicleNo || scan.vehicle?.vehicleNo || 'Unknown'}
                          </div>
                          {scan.vehicle?.type && (
                            <span className="text-xs text-gray-500 uppercase">{scan.vehicle.type}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              isEntry ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {isEntry ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {isEntry ? 'ENTRY' : 'EXIT'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-medium text-gray-800">
                          {scan.lotCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] ${sourceBadgeClass}`}>
                            {sourceLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                          {scan.staffId || scan.volunteerId || 'System'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isAccepted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Accepted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                              <XCircle className="w-3.5 h-3.5" />
                              Refused
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">
                          {isAccepted ? (
                            scan.duration ? (
                              <span className="flex items-center gap-1 text-gray-700">
                                <Clock className="w-3 h-3 text-gray-400" />
                                Parked: {scan.duration}
                              </span>
                            ) : (
                              <span className="text-emerald-700">Admitted successfully</span>
                            )
                          ) : (
                            <span className="text-rose-600 font-medium">
                              {scan.reason || 'Verification failed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

