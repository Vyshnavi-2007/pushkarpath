import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  Compass,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Shield,
  QrCode,
  Waves
} from 'lucide-react';

export default function Landing() {
  return (
    <Layout>
      {/* Full-width Godavari Hero Section */}
      <section className="relative overflow-hidden h-[60vh] min-h-[60vh] flex items-center bg-stone-900">
        {/* Godavari Hero Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/godavari-hero.jpg"
            alt="Godavari River and Bridges at Rajamahendravaram"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://commons.wikimedia.org/wiki/Special:FilePath/Godavari_bridge_panorama.jpg';
            }}
            className="w-full h-full object-cover object-center brightness-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/60 via-stone-950/40 to-stone-900/25" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
          <div className="max-w-3xl space-y-6 text-center sm:text-left">
            

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white font-heading leading-tight tracking-tight drop-shadow-md">
              Smooth Darshan Begins with{' '}
              <span className="text-amber-300 underline decoration-marigold decoration-4">
                Smart Parking
              </span>
              
            </h1>

            <p className="text-stone-200 text-base sm:text-lg leading-relaxed max-w-2xl drop-shadow-xs">
              Real-time parking discovery and occupancy tracking for <strong>Godavari Pushkaralu 2027</strong>.
              Find available spaces near your sacred ghat, navigate directly through verified road routes, and
              help keep counts accurate with swift QR check-ins.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 pt-4">
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-maroon hover:bg-maroon-light text-white font-bold text-base shadow-lg hover:shadow-xl transition-all border border-amber-400/30"
              >
                <span>Start My Journey</span>
                <ArrowRight className="w-5 h-5 ml-1 text-amber-300" />
              </Link>

              <Link
                to="/guest"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/90 hover:bg-white text-stone-900 font-bold text-base shadow-md hover:shadow-lg transition-all backdrop-blur-xs"
              >
                <Compass className="w-5 h-5 text-teal" />
                <span>Continue as Guest</span>
              </Link>
            </div>

            {/* Staff Duty Login link */}
            <div className="pt-2">
              <Link
                to="/staff-login"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-amber-200 hover:text-white transition-colors"
              >
                
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-12 bg-white border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 font-heading">
              3 Simple Steps: Ghat → Park → Return
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-2">
              No reservation hassles. Spaces are first-come, first-served with real-time gate occupancy counts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-sandal-light border border-stone-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-teal text-white flex items-center justify-center shadow-xs">
                <Compass className="w-5 h-5 text-turmeric" />
              </div>
              <h3 className="font-heading font-bold text-lg text-stone-900">1. Choose Holy Ghat</h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                Select your preferred sacred bathing ghat (Pushkar, Kotilingala, Markandeya, Saraswathi, Gowthami) to instantly see the closest open parking grounds.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-sandal-light border border-stone-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-maroon text-white flex items-center justify-center shadow-xs">
                <MapPin className="w-5 h-5 text-turmeric" />
              </div>
              <h3 className="font-heading font-bold text-lg text-stone-900">2. Park & Gate QR Scan</h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                Follow turn-by-turn driving routes to available spaces. Scan the IN poster at the lot gate to record your entry and receive walking directions to the ghat.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-sandal-light border border-stone-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-marigold text-maroon flex items-center justify-center shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-lg text-stone-900">3. Return Safely Home</h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                Walk back to your vehicle, scan the OUT poster to release the space for fellow pilgrims, and navigate homeward along designated national highway corridors.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
