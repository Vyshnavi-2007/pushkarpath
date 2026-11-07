import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';
import { Shield, Lock, User, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

export default function StaffLogin() {
  const [staffId, setStaffId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!staffId.trim() || !passcode.trim()) {
      setError('Please provide both Staff ID and Passcode.');
      return;
    }

    setLoading(true);
    try {
      const user = await loginStaff(staffId.trim(), passcode.trim());
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/volunteer', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (id, pwd) => {
    setStaffId(id);
    setPasscode(pwd);
  };

  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
          {/* Header */}
          <div className="bg-teal text-white p-6 text-center relative">
            <div className="w-12 h-12 bg-turmeric text-teal-dark rounded-2xl mx-auto flex items-center justify-center shadow-md mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold font-heading">Staff & Official Duty Login</h2>
            <p className="text-teal-100 text-xs mt-1">
              Authorized volunteers, traffic police officers, and nodal administrators
            </p>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="staffId" className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Official Staff / Officer ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="staffId"
                    type="text"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                    placeholder="e.g. VOL-101 or ADM-001"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-300 text-sm font-mono focus:border-teal focus:ring-1 focus:ring-marigold transition-colors"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label htmlFor="passcode" className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Secure Passcode
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:border-teal focus:ring-1 focus:ring-marigold transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Demo Quick Fills */}
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-2">
                <div className="font-semibold text-stone-700">Quick Demo Credentials:</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDemoFill('VOL-01', 'pushkar2027')}
                    className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded text-[11px] font-medium text-stone-800"
                  >
                    Volunteer Entry (VOL-01)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('VOL-02', 'pushkar2027')}
                    className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded text-[11px] font-medium text-stone-800"
                  >
                    Volunteer Exit (VOL-02)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('ADMIN-01', 'pushkar2027')}
                    className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded text-[11px] font-medium text-stone-800"
                  >
                    Admin (ADMIN-01)
                  </button>
                </div>
                <div className="text-[11px] text-stone-500">Passcode: <strong>pushkar2027</strong></div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-teal hover:bg-teal-dark disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Duty Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <Link to="/guest" className="hover:text-stone-800">
                &larr; Public Parking View
              </Link>
              <Link to="/login" className="hover:text-teal font-medium">
                Pilgrim Login &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
