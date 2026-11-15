import React, { useState, useEffect } from 'react';
import QRScanner from './QRScanner';
import { api } from '../lib/api';
import { X, CheckCircle2, AlertTriangle, QrCode, RefreshCw, Sparkles } from 'lucide-react';

export default function ScanModal({
  isOpen,
  onClose,
  expectedPoint = 'in', // 'in' or 'out'
  lotCode = '',
  onScanSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessData(null);
      api.config
        .get()
        .then((cfg) => {
          if (cfg && typeof cfg.demoMode === 'boolean') {
            setDemoMode(cfg.demoMode);
          }
        })
        .catch(() => {
          setDemoMode(true);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanText = async (decodedText) => {
    if (loading || successData) return;
    setLoading(true);
    setError(null);

    try {
      let payload = decodedText.trim();

      // If scanned a checkin URL (e.g. http://domain/checkin?q=...)
      if (payload.includes('q=')) {
        try {
          const url = new URL(payload, window.location.origin);
          const qParam = url.searchParams.get('q');
          if (qParam) payload = decodeURIComponent(qParam);
        } catch (e) {
          const qIndex = payload.indexOf('q=');
          if (qIndex !== -1) {
            payload = decodeURIComponent(payload.substring(qIndex + 2).split('&')[0]);
          }
        }
      }

      const res = await api.scans.posterCheckin(payload);

      if (res.success) {
        setSuccessData(res);
        if (onScanSuccess) {
          onScanSuccess(res);
        }
        setTimeout(() => {
          setSuccessData(null);
          onClose();
        }, 1800);
      } else {
        setError(res.error || 'Scan validation failed.');
      }
    } catch (err) {
      setError(err.message || 'Checkin verification error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoCheckin = async () => {
    if (loading || successData) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.scans.demoCheckin({
        lotCode: lotCode || 'PKG-01',
        dir: expectedPoint,
      });

      if (res.success) {
        setSuccessData(res);
        if (onScanSuccess) {
          onScanSuccess(res);
        }
        setTimeout(() => {
          setSuccessData(null);
          onClose();
        }, 1000);
      } else {
        setError(res.error || 'Demo checkin failed.');
      }
    } catch (err) {
      setError(err.message || 'Demo checkin failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-maroon text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-turmeric" />
            <h3 className="font-heading font-bold text-base">
              Scan {expectedPoint === 'in' ? 'ENTRY / IN' : 'EXIT / OUT'} Poster
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Quick Demo 1-Click Action Card (Always visible and accessible) */}
          <div className="bg-amber-50 border-2 border-amber-300 p-3 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-stone-900">
                  {expectedPoint === 'in' ? 'Demo Entry Gate' : 'Demo Exit Gate'}
                </div>
                <div className="text-[11px] text-stone-600">
                  {lotCode || 'PKG-01'} • 1-Click {expectedPoint === 'in' ? 'Check-in' : 'Check-out'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDemoCheckin}
              disabled={loading || Boolean(successData)}
              className="py-2.5 px-4 bg-amber-400 hover:bg-amber-500 active:scale-95 text-stone-950 font-bold rounded-xl text-xs shadow-sm transition-all border border-amber-500 flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-maroon" />
              <span>{expectedPoint === 'in' ? 'Demo IN' : 'Demo OUT'}</span>
            </button>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            Or point your camera at the printed <strong>{expectedPoint === 'in' ? 'IN' : 'OUT'} QR Poster</strong> at{' '}
            <strong>{lotCode || 'the parking ground'}</strong>:
          </p>

          {/* Success banner */}
          {successData && (
            <div className="bg-emerald-50 border border-emerald-400 p-4 rounded-xl flex items-center gap-3 text-emerald-900 animate-in fade-in">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              <div className="text-sm font-semibold">
                {successData.message || (expectedPoint === 'in' ? 'Checked in successfully!' : 'Checked out successfully!')}
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-400 p-4 rounded-xl flex items-start gap-3 text-rose-900 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs font-medium space-y-1">
                <p className="font-bold">{error}</p>
                <p className="text-rose-700">Please verify you are scanning the correct poster or click the Demo button above.</p>
              </div>
            </div>
          )}

          {/* Scanner Viewport */}
          {!successData && (
            <div className="space-y-3">
              <QRScanner onScan={handleScanText} isPaused={loading} />
              {loading && (
                <div className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-maroon">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Recording checkin with server...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
