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
        }, 1800);
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
          <p className="text-xs text-stone-600 leading-relaxed">
            Point your camera at the official <strong>{expectedPoint === 'in' ? 'IN' : 'OUT'} QR Poster</strong> at{' '}
            <strong>{lotCode || 'the parking ground'}</strong>.
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
                <p className="text-rose-700">Please verify you are scanning the correct poster.</p>
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

              {/* Demo Scan Button (shown when demoMode is true) */}
              {demoMode && (
                <div className="pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={handleDemoCheckin}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors border border-amber-500"
                  >
                    <Sparkles className="w-4 h-4 text-maroon" />
                    <span>
                      {expectedPoint === 'in'
                        ? 'QR scanned — done (demo)'
                        : 'QR scanned — exit done (demo)'}
                    </span>
                  </button>
                  <p className="text-[10px] text-stone-500 text-center mt-1.5">
                    Laptop demo: records gate poster checkin without camera view
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
