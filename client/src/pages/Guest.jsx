import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import GhatCard from '../components/GhatCard';
import LotCard from '../components/LotCard';
import { Skeleton, CardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { api } from '../lib/api';
import { subscribeSocket } from '../lib/socket';
import {
  Compass,
  Search,
  Filter,
  Car,
  Shield,
  Layers,
  ArrowRight,
  Info,
  CheckCircle,
} from 'lucide-react';

export default function Guest() {
  const [ghats, setGhats] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [config, setConfig] = useState({ demoMode: false, sampleOccupancy: false });
  const [sortBy, setSortBy] = useState('nearest'); // 'nearest' | 'free' | 'least_full'
  const [hideFull, setHideFull] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ghatsData, lotsData, cfg] = await Promise.all([
        api.ghats.getAll(),
        api.lots.getAll(),
        api.config.get().catch(() => ({})),
      ]);
      setGhats(ghatsData || []);
      setLots(lotsData || []);
      if (cfg) setConfig(cfg);
    } catch (err) {
      setError(err.message || 'Could not retrieve parking directory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to live socket updates for parking occupancy changes
    const unsubLots = subscribeSocket('lots:update', (updatedLots) => {
      if (Array.isArray(updatedLots)) {
        setLots(updatedLots);
      }
    });

    const unsubLot = subscribeSocket('lot:update', (singleLot) => {
      if (singleLot && singleLot.code) {
        setLots((prev) =>
          prev.map((l) => (l.code === singleLot.code ? { ...l, ...singleLot } : l))
        );
        api.config.get().then((cfg) => {
          if (cfg) setConfig(cfg);
        }).catch(() => {});
      }
    });

    return () => {
      unsubLots();
      unsubLot();
    };
  }, []);

  // Filter and sort lots
  const filteredAndSortedLots = useMemo(() => {
    let list = lots.filter((lot) => {
      const matchesSearch =
        !searchQuery.trim() ||
        lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lot.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lot.sector?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lot.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSector = selectedSector === 'ALL' || lot.sector === selectedSector;
      return matchesSearch && matchesSector;
    });

    if (hideFull) {
      list = list.filter((l) => (l.occupied || 0) < (l.capacity || 100));
    }

    const isLotFull = (l) => (l.occupied || 0) >= (l.capacity || 100);

    list.sort((a, b) => {
      const fullA = isLotFull(a);
      const fullB = isLotFull(b);

      // Full lots sort last!
      if (fullA && !fullB) return 1;
      if (!fullA && fullB) return -1;

      if (sortBy === 'least_full') {
        const capA = a.capacity || 100;
        const occA = a.occupied ?? 0;
        const pctA = occA / capA;

        const capB = b.capacity || 100;
        const occB = b.occupied ?? 0;
        const pctB = occB / capB;

        if (pctA !== pctB) return pctA - pctB;
        return (capB - occB) - (capA - occA);
      } else if (sortBy === 'free') {
        const capA = a.capacity || 100;
        const occA = a.occupied ?? 0;
        const freeA = Math.max(0, capA - occA);

        const capB = b.capacity || 100;
        const occB = b.occupied ?? 0;
        const freeB = Math.max(0, capB - occB);

        if (freeB !== freeA) return freeB - freeA;
        return (a.nearestGhatMeters || 0) - (b.nearestGhatMeters || 0);
      } else {
        // Nearest (distance from nearest ghat)
        return (a.nearestGhatMeters || 0) - (b.nearestGhatMeters || 0);
      }
    });

    return list;
  }, [lots, searchQuery, selectedSector, hideFull, sortBy]);

  // Extract unique sectors
  const sectors = ['ALL', ...new Set(lots.map((l) => l.sector).filter(Boolean))];

  // Group filtered lots by sector if viewing ALL sectors, or flat
  const lotsBySector = useMemo(() => {
    return filteredAndSortedLots.reduce((acc, lot) => {
      const sec = lot.sector || 'General Sector';
      if (!acc[sec]) acc[sec] = [];
      acc[sec].push(lot);
      return acc;
    }, {});
  }, [filteredAndSortedLots]);

  // Overall totals
  const totalBays = lots.reduce((sum, l) => sum + (l.capacity || 0), 0);
  const totalParked = lots.reduce((sum, l) => sum + (l.occupied || 0), 0);
  const totalFree = Math.max(0, totalBays - totalParked);

  return (
    <Layout>
      {/* Banner & Introduction */}
      <div className="bg-gradient-to-r from-maroon to-maroon-dark text-white py-8 px-4 sm:px-6 lg:px-8 border-b border-maroon-light">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-turmeric/20 text-turmeric text-xs font-semibold mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>Public Directory & Live Occupancy</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-white">
              Ghats & Official Parking Grounds
            </h1>
            <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Real-time directory for 54 parking grounds across Rajahmundry during Godavari Pushkaralu.
              Sign in for GPS turn-by-turn routing and digital vehicle passes.
            </p>
          </div>

          {/* Quick stats summary cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 shrink-0 bg-black/25 p-3 rounded-xl border border-white/10 backdrop-blur-xs text-center">
            <div>
              <div className="text-[11px] text-amber-200">Total Capacity</div>
              <div className="font-heading font-bold text-base sm:text-xl text-white mt-0.5">
                {totalBays.toLocaleString()}
              </div>
            </div>
            <div className="border-x border-white/15 px-3">
              <div className="text-[11px] text-amber-200">Parked Now</div>
              <div className="font-heading font-bold text-base sm:text-xl text-turmeric mt-0.5">
                {totalParked.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-amber-200">Free Spaces</div>
              <div className="font-heading font-bold text-base sm:text-xl text-emerald-400 mt-0.5">
                {totalFree.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Notice: Map unavailable in Guest view */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-marigold shrink-0" />
            <span>
              <strong>Guest View Notice:</strong> Interactive map view and turn-by-turn GPS navigation are available
              for verified pilgrims.
            </span>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1 font-semibold text-maroon hover:underline shrink-0"
          >
            <span>Log in with mobile OTP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Holy Ghats Showcase */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-stone-900">
                Major Bathing Ghats (పుష్కర ఘాట్లు)
              </h2>
              <p className="text-xs sm:text-sm text-stone-600">
                Key riverside sacred points for holy snanam (dips) along Akhanda Godavari
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchData} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ghats.map((ghat) => (
                <GhatCard key={ghat.code} ghat={ghat} />
              ))}
            </div>
          )}
        </section>

        {/* 54 Parking Areas Directory */}
        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-stone-900">
                  All 36 Designated Parking Areas
                </h2>
                <span className="text-xs font-semibold bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full">
                  {filteredAndSortedLots.length} Lots
                </span>
                {/* While sampleOccupancy=true, show a small grey badge */}
                {config.sampleOccupancy && (
                  <span className="bg-stone-200 text-stone-700 border border-stone-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Sample occupancy (demo)
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
                Live availability color coded: <span className="text-emerald-700 font-semibold">&lt;70% Green</span>,{' '}
                <span className="text-amber-700 font-semibold">70-89% Amber</span>,{' '}
                <span className="text-rose-700 font-semibold">&ge;90% Red</span>. Full lots sort last.
              </p>
            </div>

            {/* Search, Sector, & Occupancy Sorting Controls */}
            <div className="flex flex-col gap-2.5 w-full md:w-auto">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by lot or sector..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-stone-300 focus:border-maroon focus:ring-1 focus:ring-marigold"
                  />
                </div>

                {/* Sector Selector */}
                <div className="relative w-full sm:w-auto">
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="w-full sm:w-auto py-1.5 pl-3 pr-8 text-xs bg-white rounded-lg border border-stone-300 focus:border-maroon focus:ring-1 focus:ring-marigold"
                  >
                    {sectors.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec === 'ALL' ? 'All Sectors' : sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sorting buttons and Hide Full checkbox */}
              <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap text-xs bg-stone-100 p-1.5 rounded-lg border border-stone-200">
                <span className="font-semibold text-stone-600 text-[11px] pl-1">Sort:</span>
                <div className="flex items-center gap-1 font-medium">
                  <button
                    type="button"
                    onClick={() => setSortBy('nearest')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                      sortBy === 'nearest'
                        ? 'bg-maroon text-white shadow-xs'
                        : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    Nearest
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('free')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                      sortBy === 'free'
                        ? 'bg-maroon text-white shadow-xs'
                        : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    Most free
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('least_full')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                      sortBy === 'least_full'
                        ? 'bg-maroon text-white shadow-xs'
                        : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    Least full
                  </button>
                </div>

                <label className="flex items-center gap-1 cursor-pointer text-stone-700 text-[11px] pl-2 border-l border-stone-300">
                  <input
                    type="checkbox"
                    checked={hideFull}
                    onChange={(e) => setHideFull(e.target.checked)}
                    className="rounded text-maroon focus:ring-marigold"
                  />
                  <span>Hide full lots</span>
                </label>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredAndSortedLots.length === 0 ? (
            <EmptyState
              title="No parking lots found"
              description="No parking area matched your search criteria. Try selecting another sector or clearing the search text."
              actionLabel="Clear Filter"
              onAction={() => {
                setSearchQuery('');
                setSelectedSector('ALL');
              }}
            />
          ) : (
            <div className="space-y-8">
              {Object.entries(lotsBySector).map(([sectorName, sectorLots]) => (
                <div key={sectorName} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-maroon" />
                    <h3 className="font-heading font-bold text-lg text-stone-900">{sectorName}</h3>
                    <span className="text-xs text-stone-500 font-sans">({sectorLots.length} areas)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {sectorLots.map((lot) => (
                      <LotCard key={lot.code} lot={lot} showActions={false} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
