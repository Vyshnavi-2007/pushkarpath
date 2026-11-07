import React from 'react';

/**
 * Ghat Illustration Fallback
 * Depicts Godavari sacred river steps, temple shikhara, lamps, and waters
 * using brand colors: Teal #0F5C5C, Maroon #7A1424, Turmeric #F6C945, Marigold #F29F05
 */
export default function GhatIllustration({ title = 'Godavari Ghat', className = 'w-full h-48' }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-b from-[#FAF5EC] to-[#EADBC4] flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 400 240"
        className="w-full h-full object-cover"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Illustration of ${title}`}
      >
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FAF5EC" />
            <stop offset="100%" stopColor="#F6C945" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="riverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#167D7D" />
            <stop offset="50%" stopColor="#0F5C5C" />
            <stop offset="100%" stopColor="#0A3D3D" />
          </linearGradient>
          <linearGradient id="templeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#941B2D" />
            <stop offset="100%" stopColor="#7A1424" />
          </linearGradient>
        </defs>

        {/* Sky background */}
        <rect width="400" height="240" fill="url(#skyGrad)" />

        {/* Auspicious Morning Sun */}
        <circle cx="200" cy="70" r="34" fill="#F29F05" opacity="0.35" />
        <circle cx="200" cy="70" r="26" fill="#F6C945" />

        {/* Distant River Bank / Tree silhouettes */}
        <path d="M0,120 Q100,110 200,115 T400,118 L400,140 L0,140 Z" fill="#0A3D3D" opacity="0.15" />

        {/* Godavari River Waters */}
        <rect y="130" width="400" height="110" fill="url(#riverGrad)" />

        {/* River Waves / Ripples */}
        <path d="M0,145 Q50,140 100,145 T200,145 T300,145 T400,145" stroke="#F6C945" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
        <path d="M20,165 Q80,160 140,165 T260,165 T380,165" stroke="#F6C945" strokeWidth="1.2" strokeOpacity="0.3" fill="none" />
        <path d="M0,190 Q60,185 120,190 T240,190 T360,190" stroke="#F7EEDF" strokeWidth="1" strokeOpacity="0.25" fill="none" />

        {/* Temple Shikhara on Left Ghat */}
        <g transform="translate(45, 30)">
          {/* Kalasam top */}
          <circle cx="35" cy="18" r="4" fill="#F6C945" />
          <path d="M35,22 L35,26" stroke="#F6C945" strokeWidth="2" />
          {/* Main spire */}
          <polygon points="35,26 15,85 55,85" fill="url(#templeGrad)" />
          {/* Decorative spire horizontal bands */}
          <line x1="22" y1="65" x2="48" y2="65" stroke="#F6C945" strokeWidth="2" />
          <line x1="28" y1="45" x2="42" y2="45" stroke="#F6C945" strokeWidth="1.5" />
          {/* Base temple pavilion */}
          <rect x="10" y="85" width="50" height="25" fill="#7A1424" />
          {/* Arched doorway */}
          <path d="M27,110 L27,95 Q35,90 43,95 L43,110 Z" fill="#F6C945" />
        </g>

        {/* Ghat Steps (Padi / Metlu) descending to river */}
        <polygon points="0,110 120,110 120,165 0,185" fill="#E6D5BD" />
        <line x1="0" y1="120" x2="120" y2="120" stroke="#7A1424" strokeWidth="1.5" />
        <line x1="0" y1="130" x2="120" y2="130" stroke="#7A1424" strokeWidth="1.5" />
        <line x1="0" y1="142" x2="120" y2="142" stroke="#7A1424" strokeWidth="1.5" />
        <line x1="0" y1="155" x2="120" y2="155" stroke="#7A1424" strokeWidth="1.5" />
        <line x1="0" y1="170" x2="120" y2="170" stroke="#7A1424" strokeWidth="1.5" />

        {/* Right Ghat Pavilion & Pillars */}
        <g transform="translate(300, 75)">
          <polygon points="40,15 15,35 65,35" fill="#7A1424" />
          <rect x="22" y="35" width="6" height="40" fill="#E6D5BD" />
          <rect x="52" y="35" width="6" height="40" fill="#E6D5BD" />
          <rect x="10" y="75" width="60" height="35" fill="#D98D04" opacity="0.3" />
        </g>

        {/* Small Traditional Wooden Pilgrim Boat */}
        <g transform="translate(220, 160)">
          <path d="M0,12 Q20,24 45,12 Q30,18 10,18 Z" fill="#7A1424" />
          <line x1="20" y1="0" x2="20" y2="14" stroke="#F6C945" strokeWidth="1.5" />
          <polygon points="20,2 34,7 20,11" fill="#F29F05" />
        </g>

        {/* Auspicious Floating Diya (Deepam) */}
        <circle cx="160" cy="180" r="3" fill="#F29F05" />
        <path d="M160,177 Q161,173 160,170 Q159,173 160,177" fill="#F6C945" />

        {/* Subtle Water Reflection overlay */}
        <rect y="215" width="400" height="25" fill="#0A3D3D" opacity="0.3" />
      </svg>
      <div className="absolute bottom-2 left-3 bg-black/40 backdrop-blur-xs px-2.5 py-0.5 rounded text-xs text-white/95 font-medium tracking-wide">
        Godavari Pushkaralu
      </div>
    </div>
  );
}
