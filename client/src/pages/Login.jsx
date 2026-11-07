import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Phone, KeyRound, ArrowRight, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginPilgrim } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/pilgrim';

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.sendOtp(cleanPhone);
      setOtpSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await loginPilgrim(phone.trim(), otp.trim());
      const redirectTarget = sessionStorage.getItem('pushkarpath_redirect');
      if (redirectTarget) {
        sessionStorage.removeItem('pushkarpath_redirect');
        navigate(redirectTarget, { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
          {/* Header */}
          <div className="bg-maroon p-6 text-white text-center relative">
            <div className="w-12 h-12 bg-turmeric text-maroon rounded-2xl mx-auto flex items-center justify-center shadow-md mb-3 font-heading font-bold text-2xl">
              పు
            </div>
            <h2 className="text-2xl font-bold font-heading">Pilgrim Portal Login</h2>
            <p className="text-amber-100 text-xs mt-1">
              Access smart parking discovery & vehicle passes for Godavari Pushkaralu
            </p>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Mobile Number (10 Digits)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <span className="text-xs font-semibold text-stone-500 mr-1">+91</span>
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98480 12345"
                      maxLength={14}
                      className="w-full pl-16 pr-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:border-maroon focus:ring-1 focus:ring-marigold transition-colors"
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    An OTP will be generated to verify your vehicle pass registration.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-maroon hover:bg-maroon-light disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/60 text-xs text-amber-900 flex items-center justify-between">
                  <span>Code sent to +91 {phone}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                    className="text-maroon font-semibold underline text-xs"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label htmlFor="otp" className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Enter 6-Digit OTP
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-300 text-base font-mono tracking-widest text-center focus:border-maroon focus:ring-1 focus:ring-marigold transition-colors"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 text-xs font-medium text-center">
                    💡 For demo testing, use OTP: <strong>123456</strong>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-maroon hover:bg-maroon-light disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Enter Portal</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <Link to="/guest" className="hover:text-stone-800">
                &larr; Back to Guest View
              </Link>
              <Link to="/staff-login" className="hover:text-maroon font-medium">
                Pushkar Duty Login &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
