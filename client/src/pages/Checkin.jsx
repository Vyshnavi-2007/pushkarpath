import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { CheckCircle2, AlertTriangle, QrCode, ArrowRight, RefreshCw, Car, Compass } from 'lucide-react';
import QRScanner from '../components/QRScanner';

export default function Checkin() {
  const [searchParams] = useSearchParams();
  const rawQ = searchParams.get('q');
  const navigate = useNavigate();
  const { isAuthenticated, role, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Process checkin if token/q param provided
  const processCheckin = async (tokenPayload) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let parsed = tokenPayload;
      if (typeof tokenPayload === 'string') {
        try {
          parsed = JSON.parse(tokenPayload);
        } catch (e) {
          parsed = tokenPayload;
        }
      }

      const res = await api.scans.posterCheckin(parsed);
      setResult(res);

      // Update journey in sessionStorage
      try {
        const stored = JSON.parse(sessionStorage.getItem('pushkarpath_journey') || '{}');
        if (res.point === 'in') {
          stored.step = 2;
          stored.lotCode = res.lot?.code || parsed.lotCode;
          stored.atGhat = false;
        } else if (res.point === 'out') {
          stored.step = 3;
          stored.lotCode = null;
        }
        sessionStorage.setItem('pushkarpath_journey', JSON.stringify(stored));
      } catch (e) {}
    } catch (err) {
      setError(err.message || 'Check-in validation failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      // Save current checkin URL so user returns here after login
      sessionStorage.setItem('pushkarpath_redirect', window.location.pathname + window.location.search);
      navigate('/login');
      return;
    }

    if (rawQ) {
      processCheckin(decodeURIComponent(rawQ));
    }
  }, [rawQ, isAuthenticated, authLoading]);

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-12 space-y-6">
        <div className="bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden">
          <div className="bg-maroon text-white p-5 flex items-center gap-3">
            <QrCode className="w-6 h-6 text-turmeric" />
            <div>
              <h1 className="font-heading font-bold text-lg">PushkarPath Gate Check-in</h1>
              <p className="text-xs text-amber-200">Godavari Pushkaralu 2027</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {loading && (
              <div className="text-center py-8 space-y-3">
                <RefreshCw className="w-8 h-8 text-maroon animate-spin mx-auto" />
                <p className="text-sm font-semibold text-stone-700">Verifying gate poster with server...</p>
                <p className="text-xs text-stone-500">Executing atomic capacity validation</p>
              </div>
            )}

            {result && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                    {result.point === 'in' ? 'Check-in Verified (+1)' : 'Check-out Cleared (-1)'}
                  </span>
                  <h2 className="font-heading font-bold text-xl text-stone-900">
                    {result.point === 'in' ? 'Vehicle Parked Successfully!' : 'Vehicle Exit Recorded!'}
                  </h2>
                  <p className="text-xs text-stone-600 mt-1">{result.message}</p>
                </div>

                {result.lot && (
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-left text-xs space-y-1">
                    <div className="font-bold text-stone-800">{result.lot.name}</div>
                    <div className="text-stone-500">Live Free Spaces: <strong>{result.lot.available}</strong> / {result.lot.capacity}</div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => navigate('/pilgrim')}
                    className="w-full py-3 bg-maroon hover:bg-maroon-dark text-white rounded-xl font-heading font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <span>{result.point === 'in' ? 'View Walking Route to Ghat' : 'Plan Return Journey'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-lg text-rose-950">Gate Validation Refused</h2>
                  <p className="text-xs text-rose-800 mt-1 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
                    {error}
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => navigate('/pilgrim')}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold"
                  >
                    Return to Pilgrim Map
                  </button>
                </div>
              </div>
            )}

            {!rawQ && !loading && !result && !error && (
              <div className="space-y-4">
                <p className="text-xs text-stone-600 text-center">
                  Scan the <strong>IN</strong> or <strong>OUT</strong> poster stationed at your parking lot.
                </p>
                <QRScanner onScan={(txt) => processCheckin(txt)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

