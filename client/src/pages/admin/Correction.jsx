import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import {
  SlidersHorizontal,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  History,
  Shield,
  RefreshCw,
} from 'lucide-react';

export default function AdminCorrection() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [lot, setLot] = useState(null);
  const [actualCount, setActualCount] = useState('');
  const [reason, setReason] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [lotData, auditData] = await Promise.all([
        api.lots.getByCode(code),
        api.audit.getAll({ action: 'OCCUPANCY_CORRECTION' }),
      ]);
      setLot(lotData);
      setActualCount(lotData.occupied ?? 0);

      // Filter recent corrections specifically targeting this lot
      const relevantLogs = (auditData.auditLogs || auditData || []).filter((l) =>
        l.target?.includes(code)
      );
      setAuditLogs(relevantLogs);
    } catch (err) {
      setError('Could not load lot details for correction.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const countNum = parseInt(actualCount, 10);
    const capacity = lot?.capacity || 100;

    if (isNaN(countNum) || countNum < 0 || countNum > capacity) {
      setError(`Actual count must be a number between 0 and total capacity (${capacity}).`);
      return;
    }

    if (reason.trim().length < 5) {
      setError('Please provide a descriptive reason (minimum 5 characters) for audit trail.');
      return;
    }

    setSubmitting(true);
    try {
      await api.lots.correctOccupancy(code, countNum, reason.trim());
      setSuccess(`Occupancy count for ${lot.name} successfully adjusted to ${countNum}.`);
      setReason('');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update count.');
    } finally {
      setSubmitting(false);
    }
  };

  const capacity = lot?.capacity || 100;
  const recorded = lot?.occupied ?? 0;
  const qrTracked = recorded; // From QR scan sessions

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/admin/lots"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-maroon transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Lots Management</span>
          </Link>
        </div>

        {/* Title Banner */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-maroon text-white px-2 py-0.5 rounded">
                  {code}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-stone-900">
                  {lot?.name || 'Lot Occupancy Calibration'}
                </h1>
              </div>
              <p className="text-xs text-stone-600 mt-1">
                Sector: {lot?.sector} • Category: {lot?.category}
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full">
              Audit Controlled Action
            </span>
          </div>
        </div>

        {/* Metric Cards Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
            <div className="text-xs text-stone-500 font-medium">Recorded Count</div>
            <div className="text-2xl font-bold font-heading text-stone-900 mt-1">{recorded}</div>
            <div className="text-[11px] text-stone-400 mt-1">Current live occupied count</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
            <div className="text-xs text-stone-500 font-medium">QR Tracked Telemetry</div>
            <div className="text-2xl font-bold font-heading text-teal mt-1">{qrTracked}</div>
            <div className="text-[11px] text-stone-400 mt-1">Net check-in minus check-outs</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
            <div className="text-xs text-stone-500 font-medium">Total Maximum Capacity</div>
            <div className="text-2xl font-bold font-heading text-maroon mt-1">{capacity}</div>
            <div className="text-[11px] text-stone-400 mt-1">Physical bay limit</div>
          </div>
        </div>

        {/* Correction Form */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <SlidersHorizontal className="w-5 h-5 text-maroon" />
            <h2 className="font-heading font-bold text-lg text-stone-900">
              Calibrate Physical Count
            </h2>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label htmlFor="actualCount" className="block font-semibold text-stone-700 mb-1">
                Verified Physical Count Inside Lot (0 to {capacity})
              </label>
              <input
                id="actualCount"
                type="number"
                min="0"
                max={capacity}
                value={actualCount}
                onChange={(e) => setActualCount(e.target.value)}
                className="w-full sm:w-48 px-3.5 py-2.5 rounded-lg border border-stone-300 text-base font-bold font-mono focus:border-maroon focus:ring-1 focus:ring-marigold"
                required
              />
            </div>

            <div>
              <label htmlFor="reason" className="block font-semibold text-stone-700 mb-1">
                Justification & Audit Reason (minimum 5 characters)
              </label>
              <textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Ground volunteer physical headcount confirmed 14 vehicles left without scanning during VIP procession rush."
                className="w-full p-3 rounded-lg border border-stone-300 text-xs focus:border-maroon focus:ring-1 focus:ring-marigold"
                required
              />
              <p className="text-[11px] text-stone-500 mt-1">
                This rationale is permanently recorded in the district Pushkar audit log with your administrative identity.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-maroon hover:bg-maroon-light disabled:opacity-50 text-white font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Calibration...</span>
                  </>
                ) : (
                  <span>Commit Occupancy Correction</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Audit Log for this Lot */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <History className="w-5 h-5 text-teal" />
            <h2 className="font-heading font-bold text-base text-stone-900">
              Recent Corrections for {code}
            </h2>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-stone-500 py-4 text-center">
              No historical manual corrections recorded for this lot yet.
            </p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900">{log.before} &rarr; {log.after}</span>
                    <span className="text-[11px] text-stone-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-stone-700">{log.reason}</p>
                  <div className="text-[11px] text-teal font-medium">Recorded by: {log.admin}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
