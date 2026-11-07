import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Toranam from './Toranam';
import {
  Compass,
  QrCode,
  Shield,
  LogOut,
  Menu,
  X,
  MapPin,
  Car,
  Users,
  FileText,
  Activity,
  History,
  Navigation as NavIcon,
  HelpCircle,
  Home,
  CheckCircle,
} from 'lucide-react';

export default function Layout({ children }) {
  const { user, role, kind, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getNavLinks = () => {
    if (!isAuthenticated) {
      return [
        { label: 'Ghats & Parking', path: '/guest', icon: Compass },
        { label: 'Pilgrim Login', path: '/login', icon: Car },
        { label: 'Staff Login', path: '/staff-login', icon: Shield },
      ];
    }

    if (role === 'admin') {
      return [
        { label: 'Overview', path: '/admin', icon: Activity, end: true },
        { label: 'Lots', path: '/admin/lots', icon: MapPin },
        { label: 'Ghats', path: '/admin/ghats', icon: Compass },
        { label: 'Staff', path: '/admin/staff', icon: Users },
        { label: 'Scans', path: '/admin/scans', icon: QrCode },
        { label: 'Simulation', path: '/admin/simulation', icon: FileText },
      ];
    }

    if (role === 'staff') {
      return [
        { label: 'Scanner View', path: '/volunteer', icon: QrCode },
        { label: 'Public Map', path: '/pilgrim', icon: Compass },
      ];
    }

    // Default Pilgrim
    return [
      { label: 'Pilgrim Journey', path: '/pilgrim', icon: Compass },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen flex flex-col bg-sandal-light text-stone-800">
      {/* Top Header */}
      <header className="bg-maroon text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo & PushkarPath Brand */}
            <Link to="/" className="flex items-center gap-3 group focus:outline-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-marigold to-turmeric flex items-center justify-center text-maroon shadow-sm group-hover:scale-105 transition-transform">
                <span className="font-heading font-extrabold text-xl leading-none">పు</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-xl sm:text-2xl tracking-wide text-white">
                    PushkarPath
                  </span>
                  <span className="text-[10px] font-sans font-bold bg-marigold text-maroon px-1.5 py-0.5 rounded tracking-wider">
                    2027
                  </span>
                </div>
                <span className="text-[11px] text-amber-200/90 font-sans tracking-wide">
                  Godavari Pushkaralu — Rajahmundry
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-maroon-dark text-turmeric font-semibold shadow-inner'
                          : 'text-amber-100 hover:bg-maroon-light hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User Profile & Auth Actions */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-white leading-tight">
                      {user?.name || user?.staffId || user?.phone}
                    </div>
                    <div className="text-[10px] text-turmeric font-medium">
                      {role === 'admin'
                        ? 'Nodal Officer / Admin'
                        : kind === 'volunteer'
                        ? `Volunteer (${user?.assignedLot || 'Core'})`
                        : kind === 'police'
                        ? 'Police Transit Unit'
                        : 'Pilgrim'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-maroon-dark hover:bg-rose-900 text-rose-200 hover:text-white transition-colors border border-rose-800/40"
                    title="Logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-marigold hover:bg-marigold-hover text-maroon transition-colors shadow-xs"
                >
                  <Car className="w-4 h-4" />
                  <span>Pilgrim Login</span>
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-amber-100 hover:text-white hover:bg-maroon-light focus:outline-hidden"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Decorative Mango-Leaf Toranam Border under header */}
        <Toranam />

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-maroon-dark border-b border-maroon-light px-4 pt-3 pb-4 space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-maroon text-turmeric font-semibold'
                        : 'text-amber-100 hover:bg-maroon hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 text-turmeric" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {isAuthenticated ? (
              <div className="pt-3 mt-2 border-t border-maroon-light/60 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{user?.name || user?.phone}</div>
                  <div className="text-xs text-turmeric">{role} • {kind || 'pilgrim'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950 text-rose-200 border border-rose-800/50 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            ) : (
              <div className="pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-marigold text-maroon rounded-lg font-semibold text-sm"
                >
                  <Car className="w-4 h-4" /> Pilgrim Login
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 text-xs py-6 mt-auto border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-turmeric text-sm">PushkarPath</span>
            <span>•</span>
            <span>Godavari Pushkaralu 2027 Official Smart Parking & Discovery</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-stone-500">
            <span>Rajahmundry Municipal Corporation</span>
            <span>•</span>
            <span className="text-stone-400">Photo: Godavari Bridge, Rajahmundry — Tatiraju.rishabh, CC BY-SA 3.0, via Wikimedia Commons</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-stone-800 text-turmeric font-mono text-[11px] border border-stone-700">v2026-11-06-3</span>
            <span>•</span>
            <Link to="/guest" className="hover:text-stone-300">Public Parking</Link>
            <span>•</span>
            <Link to="/staff-login" className="hover:text-stone-300">Duty Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
